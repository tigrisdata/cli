import { Box, Text, useInput } from 'ink';

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  useInput((input, key) => {
    if (input === 'y' || input === 'Y') {
      onConfirm();
      return;
    }
    if (input === 'n' || input === 'N' || key.escape) {
      onCancel();
      return;
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text>{message}</Text>
      <Text dimColor>Press <Text bold color="yellow">y</Text> to confirm, <Text bold color="yellow">n</Text> to cancel</Text>
    </Box>
  );
}
