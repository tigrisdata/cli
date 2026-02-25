import { render } from 'ink';
import { App } from './app.js';

export async function launch() {
  // Enter alternate screen buffer for fullscreen experience
  process.stdout.write('\x1b[?1049h');
  // Hide cursor (Ink manages its own)
  process.stdout.write('\x1b[?25l');

  const { waitUntilExit } = render(<App />, {
    exitOnCtrlC: true,
    patchConsole: true,
  });

  try {
    await waitUntilExit();
  } finally {
    // Show cursor again
    process.stdout.write('\x1b[?25h');
    // Leave alternate screen buffer — restores previous terminal content
    process.stdout.write('\x1b[?1049l');
  }
}
