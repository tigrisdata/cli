import { useState, useCallback, useMemo } from 'react';
import { useInput } from 'ink';

export interface ListNavState<T> {
  selectedIndex: number;
  selectedItem: T | undefined;
  filterText: string;
  isFiltering: boolean;
  filteredItems: T[];
  scrollOffset: number;
  visibleHeight: number;
  setSelectedIndex: (i: number) => void;
}

interface UseListNavOptions<T> {
  items: T[];
  filterKey?: keyof T & string;
  visibleHeight?: number;
  enabled?: boolean;
  onSelect?: (item: T) => void;
}

export function useListNav<T>({
  items,
  filterKey,
  visibleHeight = 20,
  enabled = true,
  onSelect,
}: UseListNavOptions<T>): ListNavState<T> {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);

  const filteredItems = useMemo(() => {
    if (!filterText || !filterKey) return items;
    const lower = filterText.toLowerCase();
    return items.filter((item) => {
      const val = item[filterKey];
      return typeof val === 'string' && val.toLowerCase().includes(lower);
    });
  }, [items, filterText, filterKey]);

  const clampIndex = useCallback(
    (idx: number) => Math.max(0, Math.min(idx, filteredItems.length - 1)),
    [filteredItems.length]
  );

  // Ensure scrollOffset keeps selectedIndex visible
  const adjustScroll = useCallback(
    (newIndex: number) => {
      let newOffset = scrollOffset;
      if (newIndex < newOffset) {
        newOffset = newIndex;
      } else if (newIndex >= newOffset + visibleHeight) {
        newOffset = newIndex - visibleHeight + 1;
      }
      setScrollOffset(Math.max(0, newOffset));
    },
    [scrollOffset, visibleHeight]
  );

  useInput(
    (input, key) => {
      if (!enabled) return;

      // Filter mode
      if (isFiltering) {
        if (key.escape || key.return) {
          setIsFiltering(false);
          if (key.return && filteredItems.length > 0) {
            setSelectedIndex(0);
            setScrollOffset(0);
          }
          return;
        }
        if (key.backspace || key.delete) {
          setFilterText((t) => t.slice(0, -1));
          setSelectedIndex(0);
          setScrollOffset(0);
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          setFilterText((t) => t + input);
          setSelectedIndex(0);
          setScrollOffset(0);
        }
        return;
      }

      // Start filtering
      if (input === '/' && filterKey) {
        setIsFiltering(true);
        setFilterText('');
        return;
      }

      // Navigation
      if (input === 'j' || key.downArrow) {
        const next = clampIndex(selectedIndex + 1);
        setSelectedIndex(next);
        adjustScroll(next);
        return;
      }
      if (input === 'k' || key.upArrow) {
        const next = clampIndex(selectedIndex - 1);
        setSelectedIndex(next);
        adjustScroll(next);
        return;
      }

      // Home / End
      if (input === 'g') {
        setSelectedIndex(0);
        setScrollOffset(0);
        return;
      }
      if (input === 'G') {
        const last = Math.max(0, filteredItems.length - 1);
        setSelectedIndex(last);
        adjustScroll(last);
        return;
      }

      // Select
      if (key.return && onSelect && filteredItems[selectedIndex]) {
        onSelect(filteredItems[selectedIndex]);
        return;
      }
    },
    { isActive: enabled }
  );

  // Reset index when items change
  const clamped = clampIndex(selectedIndex);
  if (clamped !== selectedIndex) {
    setSelectedIndex(clamped);
  }

  return {
    selectedIndex,
    selectedItem: filteredItems[selectedIndex],
    filterText,
    isFiltering,
    filteredItems,
    scrollOffset,
    visibleHeight,
    setSelectedIndex,
  };
}
