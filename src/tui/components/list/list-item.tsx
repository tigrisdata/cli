import { Box, Text } from 'ink';
import type { Column } from '../../types.js';

interface ListItemProps<T> {
  item: T;
  columns: Column<T>[];
  isSelected: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ListItem<T extends Record<string, any>>({
  item,
  columns,
  isSelected,
}: ListItemProps<T>) {
  return (
    <Box>
      <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
        {isSelected ? '>' : ' '}{' '}
      </Text>
      {columns.map((col, i) => {
        const raw = item[col.key] as unknown;
        const value = col.render
          ? col.render(raw, item)
          : raw instanceof Date
            ? raw.toLocaleDateString()
            : String(raw ?? '');
        const width = col.width ?? 20;
        const padded = value.length > width
          ? value.slice(0, width - 1) + '\u2026'
          : value.padEnd(width);
        return (
          <Text key={col.key} color={isSelected ? 'cyan' : undefined}>
            {i > 0 ? '  ' : ''}{padded}
          </Text>
        );
      })}
    </Box>
  );
}
