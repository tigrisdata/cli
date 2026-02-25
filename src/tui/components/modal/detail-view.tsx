import { Box, Text, useInput } from 'ink';

interface DetailViewProps {
  title: string;
  entries: { label: string; value: string }[];
  onClose: () => void;
}

export function DetailView({ entries, onClose }: DetailViewProps) {
  useInput((_input, key) => {
    if (key.escape || key.return) {
      onClose();
    }
  });

  const maxLabelLen = Math.max(...entries.map((e) => e.label.length), 0);

  return (
    <Box flexDirection="column" gap={0}>
      {entries.map((entry) => (
        <Box key={entry.label} gap={1}>
          <Text dimColor>{entry.label.padEnd(maxLabelLen)}</Text>
          <Text>{entry.value}</Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text dimColor>Press Esc or Enter to close</Text>
      </Box>
    </Box>
  );
}
