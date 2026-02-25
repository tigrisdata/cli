import { useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAsync } from '../hooks/use-async.js';
import { fetchOverallStats } from '../data/stat.js';
import { Loading } from '../components/common/loading.js';
import { ErrorBanner } from '../components/common/error-banner.js';
import type { ViewProps } from '../types.js';

export function Dashboard({ state }: ViewProps) {
  const fetcher = useCallback(() => fetchOverallStats(), []);
  const { data, isLoading, error, refresh } = useAsync(fetcher);

  useInput(
    (input) => {
      if (input === 'r') {
        refresh();
      }
    },
    { isActive: state.modalStack.length === 0 }
  );

  if (isLoading) {
    return <Loading message="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorBanner message={error} />;
  }

  if (!data) return null;

  const maxLabelLen = Math.max(...data.map((e) => e.metric.length));

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>Account Overview</Text>
      <Box flexDirection="column" marginTop={1}>
        {data.map((entry) => (
          <Box key={entry.metric} gap={1}>
            <Text dimColor>{entry.metric.padEnd(maxLabelLen)}</Text>
            <Text bold>{entry.value}</Text>
          </Box>
        ))}
      </Box>
      {state.orgName && (
        <Box marginTop={1}>
          <Text dimColor>Organization: </Text>
          <Text>{state.orgName}</Text>
        </Box>
      )}
      {state.loginMethod && (
        <Box>
          <Text dimColor>Login method: </Text>
          <Text>{state.loginMethod}</Text>
        </Box>
      )}
    </Box>
  );
}
