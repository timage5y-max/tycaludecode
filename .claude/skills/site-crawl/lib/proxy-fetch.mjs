/**
 * proxy-fetch — a dependency-free HTTP(S) fetcher that works behind a
 * CONNECT-only egress proxy, with retries, bounded concurrency and a disk cache.
 *
 * Why this exists: sandboxed agent environments route outbound traffic through a
 * local CONNECT proxy that re-terminates TLS. Headless browsers open dozens of
 * parallel sockets and the proxy starts refusing them (ERR_TOO_MANY_RETRIES), so
 * pages render half-styled. Node's built-in fetch also ignores HTTPS_PROXY unless
 * NODE_USE_ENV_PROXY=1 is set before startup. This module speaks the CONNECT
 * tunnel itself, so it needs no env flags and no npm packages.
 *
 * Standalone use:
 *   import { createFetcher } from './proxy-fetch.mjs';
 *   const fetcher = createFetcher({ concurrency: 5, cacheDir: '.cache' });
 *   const res = await fetcher.fetch('https://example.com/style.css');
 *   res.status; res.headers; res.body; // Buffer
 *
 * CLI:
 *   node proxy-fetch.mjs <url> [--head] [--out file]
 */

import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import net from 'node:net';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// ---------------------------------------------------------------- proxy config

/** Does `host` match a NO_PROXY entry? Supports bare hosts, .suffix and CIDR-ish literals. */
function matchesNoProxy(host, noProxy) {
  if (!noProxy) return false;
  const h = host.toLowerCase();
  for (let entry of noProxy.split(',')) {
    entry = entry.trim().toLowerCase();
    if (!entry) continue;
    if (entry === '*') return true;
    if (entry.startsWith('*.')) entry = entry.slice(1);
    if (entry.startsWith('.')) {
      if (h === entry.slice(1) || h.endsWith(entry)) return true;
    } else if (h === entry || h.endsWith('.' + entry)) {
      return true;
    }
  }
  return false;
}

/** Resolve the proxy URL to use for `target`, or null to go direct. */
export function resolveProxy(target, env = process.env) {
  const url = typeof target === 'string' ? new URL(target) : target;
  const noProxy = env.NO_PROXY || env.no_proxy;
  if (matchesNoProxy(url.hostname, noProxy)) return null;
  const proxy = url.protocol === 'http:'
    ? env.HTTP_PROXY || env.http_proxy || env.HTTPS_PROXY || env.https_proxy
    : env.HTTPS_PROXY || env.https_proxy;
  return proxy || null;
}

/** Load the CA bundle: system roots plus NODE_EXTRA_CA_CERTS / an explicit path. */
function loadCa(caPath) {
  const extra = caPath || process.env.NODE_EXTRA_CA_CERTS;
  if (!extra) return undefined;
  try {
    return [...tls.rootCertificates, fs.readFileSync(extra, 'utf8')];
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------- CONNECT tunnel

function connectViaProxy(proxyUrl, host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const pu = new URL(proxyUrl);
    const headers = { Host: `${host}:${port}` };
    if (pu.username) {
      const auth = `${decodeURIComponent(pu.username)}:${decodeURIComponent(pu.password || '')}`;
      headers['Proxy-Authorization'] = 'Basic ' + Buffer.from(auth).toString('base64');
    }
    const req = http.request({
      host: pu.hostname,
      port: pu.port || (pu.protocol === 'https:' ? 443 : 80),
      method: 'CONNECT',
      path: `${host}:${port}`,
      headers,
      timeout: timeoutMs,
      agent: false,
    });
    const fail = (err) => { req.destroy(); reject(err); };
    req.once('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        // 403/407 mean an egress-policy denial; surface that clearly, do not retry.
        const err = new Error(`proxy CONNECT ${res.statusCode} for ${host}:${port}`);
        err.proxyStatus = res.statusCode;
        err.fatal = res.statusCode === 403 || res.statusCode === 407;
        return reject(err);
      }
      socket.setTimeout(0);
      resolve(socket);
    });
    req.once('timeout', () => fail(new Error(`proxy CONNECT timeout for ${host}:${port}`)));
    req.once('error', fail);
    req.end();
  });
}

/** Agent that dials every socket through a fresh CONNECT tunnel. */
function tunnelAgent({ proxyUrl, secure, ca, timeoutMs }) {
  const Base = secure ? https.Agent : http.Agent;
  const agent = new Base({ keepAlive: false, maxSockets: 1 });
  agent.createConnection = (options, cb) => {
    const port = options.port || (secure ? 443 : 80);
    connectViaProxy(proxyUrl, options.host, port, timeoutMs)
      .then((raw) => {
        if (!secure) return cb(null, raw);
        const sock = tls.connect({ socket: raw, servername: options.host, ca });
        sock.once('error', (e) => { try { raw.destroy(); } catch {} cb(e); });
        sock.once('secureConnect', () => cb(null, sock));
      })
      .catch((err) => cb(err));
    return undefined; // socket is delivered via the callback
  };
  return agent;
}

// ---------------------------------------------------------------- single request

function decompress(buf, encoding) {
  if (!buf.length) return buf;
  try {
    switch ((encoding || '').toLowerCase()) {
      case 'gzip': case 'x-gzip': return zlib.gunzipSync(buf);
      case 'deflate': return zlib.inflateSync(buf);
      case 'br': return zlib.brotliDecompressSync(buf);
      case 'zstd': return zlib.zstdDecompressSync ? zlib.zstdDecompressSync(buf) : buf;
      default: return buf;
    }
  } catch {
    return buf; // a body that lied about its encoding is better than a hard failure
  }
}

function rawRequest(url, { method, headers, body, ca, timeoutMs, env }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const secure = u.protocol === 'https:';
    const proxyUrl = resolveProxy(u, env);
    const agent = proxyUrl
      ? tunnelAgent({ proxyUrl, secure, ca, timeoutMs })
      : new (secure ? https.Agent : http.Agent)({ keepAlive: false });

    const reqHeaders = {
      host: u.host,
      'accept-encoding': 'gzip, deflate, br',
      ...headers,
    };
    delete reqHeaders['content-length'];
    if (body) reqHeaders['content-length'] = Buffer.byteLength(body);

    const lib = secure ? https : http;
    const req = lib.request({
      host: u.hostname,
      port: u.port || (secure ? 443 : 80),
      path: u.pathname + u.search,
      method: method || 'GET',
      headers: reqHeaders,
      agent,
      ca: secure ? ca : undefined,
      timeout: timeoutMs,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: decompress(raw, res.headers['content-encoding']),
          url,
        });
      });
      res.on('error', reject);
    });
    req.once('timeout', () => req.destroy(new Error(`request timeout after ${timeoutMs}ms: ${url}`)));
    req.once('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function requestFollowingRedirects(url, opts, maxRedirects) {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const res = await rawRequest(current, opts);
    const loc = res.headers.location;
    if (res.status >= 300 && res.status < 400 && loc && hop < maxRedirects) {
      current = new URL(loc, current).toString();
      // A 303, or a 301/302 on POST, continues as GET per RFC 9110.
      if (res.status === 303 || (opts.method === 'POST' && res.status !== 307 && res.status !== 308)) {
        opts = { ...opts, method: 'GET', body: undefined };
      }
      continue;
    }
    res.url = current;
    return res;
  }
  throw new Error(`too many redirects: ${url}`);
}

// ---------------------------------------------------------------- concurrency

function semaphore(limit) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= limit || !queue.length) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => { active--; next(); });
  };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- disk cache

function cachePaths(cacheDir, method, url) {
  const key = crypto.createHash('sha1').update(`${method} ${url}`).digest('hex');
  return { meta: path.join(cacheDir, key + '.json'), body: path.join(cacheDir, key + '.bin') };
}

// ---------------------------------------------------------------- public API

/**
 * @param {object} [opts]
 * @param {number} [opts.concurrency=5]   max simultaneous tunnels
 * @param {number} [opts.retries=4]       retry attempts per URL
 * @param {number} [opts.timeoutMs=45000] per-attempt timeout
 * @param {string} [opts.cacheDir]        enable the disk cache at this directory
 * @param {string} [opts.caPath]          CA bundle (defaults to NODE_EXTRA_CA_CERTS)
 * @param {number} [opts.maxRedirects=8]
 * @param {(msg:string)=>void} [opts.log]
 */
export function createFetcher(opts = {}) {
  const {
    concurrency = 5,
    retries = 4,
    timeoutMs = 45000,
    cacheDir = null,
    caPath = null,
    maxRedirects = 8,
    env = process.env,
    log = () => {},
  } = opts;

  const ca = loadCa(caPath);
  const limit = semaphore(concurrency);
  if (cacheDir) fs.mkdirSync(cacheDir, { recursive: true });

  const stats = { requests: 0, hits: 0, misses: 0, retries: 0, failures: 0, bytes: 0 };

  async function attempt(url, o) {
    let lastErr;
    for (let i = 0; i <= retries; i++) {
      try {
        return await requestFollowingRedirects(url, {
          method: o.method || 'GET',
          headers: o.headers || {},
          body: o.body,
          ca, timeoutMs, env,
        }, maxRedirects);
      } catch (err) {
        lastErr = err;
        if (err.fatal) break;            // policy denial — retrying cannot help
        if (i === retries) break;
        stats.retries++;
        const backoff = 500 * 2 ** i + Math.floor(Math.random() * 250);
        log(`retry ${i + 1}/${retries} after ${backoff}ms — ${err.message}`);
        await sleep(backoff);
      }
    }
    throw lastErr;
  }

  /**
   * Fetch a URL. Resolves to { status, headers, body: Buffer, url, fromCache }.
   * Rejects only when every retry failed (or the proxy denied the host).
   */
  async function fetchUrl(url, o = {}) {
    const method = o.method || 'GET';
    const useCache = cacheDir && method === 'GET' && o.cache !== false;
    if (useCache) {
      const p = cachePaths(cacheDir, method, url);
      if (fs.existsSync(p.meta) && fs.existsSync(p.body)) {
        stats.requests++; stats.hits++;
        const meta = JSON.parse(fs.readFileSync(p.meta, 'utf8'));
        return { ...meta, body: fs.readFileSync(p.body), fromCache: true };
      }
    }

    return limit(async () => {
      stats.requests++; stats.misses++;
      try {
        const res = await attempt(url, o);
        stats.bytes += res.body.length;
        if (useCache && res.status < 400) {
          const p = cachePaths(cacheDir, method, url);
          fs.writeFileSync(p.body, res.body);
          fs.writeFileSync(p.meta, JSON.stringify({ status: res.status, headers: res.headers, url: res.url }));
        }
        return { ...res, fromCache: false };
      } catch (err) {
        stats.failures++;
        throw err;
      }
    });
  }

  return { fetch: fetchUrl, stats, ca, resolveProxy: (u) => resolveProxy(u, env) };
}

export default createFetcher;

// ---------------------------------------------------------------- CLI

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const url = args.find((a) => !a.startsWith('--'));
  if (!url) {
    console.error('usage: node proxy-fetch.mjs <url> [--head] [--out FILE]');
    process.exit(2);
  }
  const outIdx = args.indexOf('--out');
  const fetcher = createFetcher({ log: (m) => console.error('[proxy-fetch]', m) });
  try {
    const res = await fetcher.fetch(url);
    console.error(`status ${res.status}  ${res.body.length} bytes  via ${fetcher.resolveProxy(url) || 'direct'}`);
    if (args.includes('--head')) {
      console.error(JSON.stringify(res.headers, null, 2));
    } else if (outIdx !== -1 && args[outIdx + 1]) {
      fs.writeFileSync(args[outIdx + 1], res.body);
      console.error(`wrote ${args[outIdx + 1]}`);
    } else {
      process.stdout.write(res.body);
    }
  } catch (err) {
    console.error('FAILED:', err.message);
    process.exit(1);
  }
}
