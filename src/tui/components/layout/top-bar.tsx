import { Box, Text } from 'ink';
import type { ViewId } from '../../state.js';
import { VIEW_ORDER } from '../../types.js';

interface TopBarProps {
  currentView: ViewId;
  orgName: string | null;
}

export function TopBar({ currentView, orgName }: TopBarProps) {
  return (
    <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
      <Box gap={1}>
        {VIEW_ORDER.map(({ id, label, key }) => {
          const active = currentView === id || (currentView === 'objects' && id === 'buckets');
          return (
            <Text key={id} bold={active} inverse={active}>
              {' '}{key}:{label}{' '}
            </Text>
          );
        })}
      </Box>
      {orgName && (
        <Text dimColor>{orgName}</Text>
      )}
    </Box>
  );
}
