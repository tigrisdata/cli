import { Box, Text } from 'ink';

interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = 'No items found.' }: EmptyStateProps) {
  return (
    <Box paddingY={1} justifyContent="center">
      <Text dimColor>{message}</Text>
    </Box>
  );
}
