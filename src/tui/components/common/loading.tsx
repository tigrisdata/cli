import { Box, Text } from 'ink';
import { Spinner } from '@inkjs/ui';

interface LoadingProps {
  message?: string;
}

export function Loading({ message = 'Loading...' }: LoadingProps) {
  return (
    <Box gap={1}>
      <Spinner />
      <Text dimColor>{message}</Text>
    </Box>
  );
}
