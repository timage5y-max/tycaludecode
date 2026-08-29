import {existsSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// Left unset, Remotion scales to the machine it is on. The measured gain on a
// 4-core container is about 1.5x on the per-frame cost; the rest of a render is
// fixed overhead (bundling, browser launch, encoding) that concurrency cannot
// touch. Set REMOTION_CONCURRENCY to pin it on a machine where that hurts.
const concurrency = Number(process.env.REMOTION_CONCURRENCY);
if (Number.isFinite(concurrency) && concurrency > 0) {
  Config.setConcurrency(concurrency);
}

// Sandboxed/CI containers ship a preinstalled Chromium that Remotion should use
// instead of downloading its own. Locally we leave the executable unset so
// Remotion resolves a browser by itself.
const findPlaywrightChromium = () => {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';

  if (!existsSync(root)) {
    return null;
  }

  const candidates = readdirSync(root)
    .filter((entry) => entry.startsWith('chromium'))
    .sort()
    .reverse()
    .flatMap((entry) => [
      join(root, entry, 'chrome-linux', 'headless_shell'),
      join(root, entry, 'chrome-linux', 'chrome'),
    ]);

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
};

const browserExecutable =
  process.env.REMOTION_BROWSER_EXECUTABLE ??
  process.env.CHROME_PATH ??
  findPlaywrightChromium();

if (browserExecutable) {
  Config.setBrowserExecutable(browserExecutable);
}
