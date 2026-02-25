import { Box, Text } from 'ink';
import type { KeyBinding } from '../../types.js';

interface FooterProps {
  bindings: KeyBinding[];
}

export function Footer({ bindings }: FooterProps) {
  return (
    <Box flexDirection="row" paddingX={1} gap={1}>
      {bindings.map(({ key, label }) => (
        <Text key={key}>
          <Text bold color="cyan">{key}</Text>
          <Text dimColor>:{label}</Text>
        </Text>
      ))}
    </Box>
  );
}
