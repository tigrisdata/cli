/**
 * Guard for interactive-only operations.
 * Fails fast with a helpful hint when stdin is not a TTY
 * (e.g., when called from a script or AI agent).
 */
export function requireInteractive(hint: string): void {
  if (process.stdin.isTTY) return;
  console.error(
    'Error: this command requires interactive input (not available in piped/scripted mode)'
  );
  console.error(`Hint: ${hint}`);
  process.exit(1);
}
