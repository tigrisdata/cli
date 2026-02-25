export default async function tui() {
  const { launch } = await import('../tui/index.js');
  await launch();
}
