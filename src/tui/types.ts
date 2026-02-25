import type { AppState, AppAction, ViewId } from './state.js';

export interface ViewProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Column<T = any> {
  key: keyof T & string;
  header: string;
  width?: number;
  render?: (value: unknown, item: T) => string;
}

export interface KeyBinding {
  key: string;
  label: string;
  when?: (state: AppState) => boolean;
}

export const VIEW_ORDER: { id: ViewId; label: string; key: string }[] = [
  { id: 'organizations', label: 'Orgs', key: '1' },
  { id: 'dashboard', label: 'Dashboard', key: '2' },
  { id: 'buckets', label: 'Buckets', key: '3' },
  { id: 'snapshots', label: 'Snapshots', key: '4' },
  { id: 'access-keys', label: 'Keys', key: '5' },
  { id: 'policies', label: 'Policies', key: '6' },
  { id: 'users', label: 'Users', key: '7' },
];
