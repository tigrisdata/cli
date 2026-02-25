import { Box, Text } from 'ink';
import { ListItem } from './list-item.js';
import { Loading } from '../common/loading.js';
import { ErrorBanner } from '../common/error-banner.js';
import { EmptyState } from '../common/empty-state.js';
import type { Column } from '../../types.js';

interface ListViewProps<T> {
  items: T[];
  columns: Column<T>[];
  selectedIndex: number;
  scrollOffset: number;
  visibleHeight: number;
  isLoading: boolean;
  error: string | null;
  filterText?: string;
  isFiltering?: boolean;
  emptyMessage?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ListView<T extends Record<string, any>>({
  items,
  columns,
  selectedIndex,
  scrollOffset,
  visibleHeight,
  isLoading,
  error,
  filterText,
  isFiltering,
  emptyMessage,
}: ListViewProps<T>) {
  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorBanner message={error} />;
  }

  if (items.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const visibleItems = items.slice(scrollOffset, scrollOffset + visibleHeight);

  return (
    <Box flexDirection="column">
      {/* Column headers */}
      <Box>
        <Text>  </Text>
        {columns.map((col, i) => {
          const width = col.width ?? 20;
          return (
            <Text key={col.key} bold dimColor>
              {i > 0 ? '  ' : ''}{col.header.padEnd(width)}
            </Text>
          );
        })}
      </Box>

      {/* Items */}
      {visibleItems.map((item, i) => {
        const actualIndex = scrollOffset + i;
        return (
          <ListItem
            key={actualIndex}
            item={item}
            columns={columns}
            isSelected={actualIndex === selectedIndex}
          />
        );
      })}

      {/* Scroll indicator */}
      {items.length > visibleHeight && (
        <Box paddingTop={0}>
          <Text dimColor>
            {' '}{scrollOffset + 1}-{Math.min(scrollOffset + visibleHeight, items.length)} of {items.length}
          </Text>
        </Box>
      )}

      {/* Filter bar */}
      {isFiltering && (
        <Box>
          <Text color="yellow">/{filterText}</Text>
          <Text dimColor color="yellow">_</Text>
        </Box>
      )}
    </Box>
  );
}
