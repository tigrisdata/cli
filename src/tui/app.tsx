import { useReducer, useEffect, useMemo } from 'react';
import { useApp, useInput } from 'ink';
import { appReducer, initialState } from './state.js';
import { AppLayout } from './components/layout/app-layout.js';
import { ModalOverlay } from './components/modal/modal-overlay.js';
import { Dashboard } from './views/dashboard.js';
import { Buckets } from './views/buckets.js';
import { Objects } from './views/objects.js';
import { AccessKeys } from './views/access-keys.js';
import { Policies } from './views/policies.js';
import { Users } from './views/users.js';
import { Organizations } from './views/organizations.js';
import { Snapshots } from './views/snapshots.js';
import { fetchAuthStatus } from './data/auth-status.js';
import { VIEW_ORDER, type KeyBinding } from './types.js';
import type { ViewId } from './state.js';

const VIEW_KEY_MAP: Record<string, ViewId> = {};
for (const v of VIEW_ORDER) {
  VIEW_KEY_MAP[v.key] = v.id;
}

export function App() {
  const { exit } = useApp();
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Exit handler
  useEffect(() => {
    if (state.shouldExit) {
      exit();
    }
  }, [state.shouldExit, exit]);

  // Load auth status on mount
  useEffect(() => {
    fetchAuthStatus()
      .then((info) => {
        dispatch({
          type: 'SET_AUTH',
          authenticated: info.authenticated,
          loginMethod: info.loginMethod,
          orgName: info.orgName,
          orgId: info.orgId,
        });
      })
      .catch(() => {
        dispatch({
          type: 'SET_AUTH',
          authenticated: false,
          loginMethod: null,
        });
      });
  }, []);

  // Global key handler — lowest priority (disabled when modal is open)
  const hasModal = state.modalStack.length > 0;

  useInput(
    (input, key) => {
      // q to quit (not in objects sub-view or filtering)
      if (input === 'q' && state.currentView !== 'objects') {
        dispatch({ type: 'EXIT' });
        return;
      }

      // Ctrl+C always exits
      if (key.ctrl && input === 'c') {
        dispatch({ type: 'EXIT' });
        return;
      }

      // Number keys switch views
      const viewId = VIEW_KEY_MAP[input];
      if (viewId) {
        dispatch({ type: 'SET_VIEW', view: viewId });
        return;
      }

      // Esc goes back
      if (key.escape) {
        dispatch({ type: 'POP_VIEW' });
        return;
      }
    },
    { isActive: !hasModal }
  );

  // Build footer bindings based on current view
  const bindings = useMemo((): KeyBinding[] => {
    const base: KeyBinding[] = [
      { key: '1-7', label: 'Views' },
    ];

    switch (state.currentView) {
      case 'dashboard':
        base.push({ key: 'r', label: 'Refresh' });
        break;
      case 'buckets':
        base.push(
          { key: 'n', label: 'New' },
          { key: 'd', label: 'Delete' },
          { key: 'e', label: 'Edit' },
          { key: 'Enter', label: 'Browse' },
          { key: 'i', label: 'Info' },
          { key: 's', label: 'Snapshots' },
          { key: 'Esc', label: 'Back' },
          { key: '/', label: 'Filter' },
          { key: 'r', label: 'Refresh' },
        );
        break;
      case 'objects':
        base.push(
          { key: 'd', label: 'Delete' },
          { key: 'Enter', label: 'Open' },
          { key: 'Esc', label: 'Back' },
          { key: '/', label: 'Filter' },
          { key: 'r', label: 'Refresh' },
        );
        break;
      case 'access-keys':
        base.push(
          { key: 'n', label: 'New' },
          { key: 'd', label: 'Delete' },
          { key: 'Enter', label: 'Detail' },
          { key: 'a', label: 'Assign' },
          { key: '/', label: 'Filter' },
          { key: 'r', label: 'Refresh' },
        );
        break;
      case 'policies':
        base.push(
          { key: 'n', label: 'New' },
          { key: 'd', label: 'Delete' },
          { key: 'e', label: 'Edit' },
          { key: 'Enter', label: 'Detail' },
          { key: '/', label: 'Filter' },
          { key: 'r', label: 'Refresh' },
        );
        break;
      case 'users':
        base.push(
          { key: 'n', label: 'Invite' },
          { key: 'd', label: 'Remove' },
          { key: 'e', label: 'Role' },
          { key: 'Tab', label: 'Toggle' },
          { key: '/', label: 'Filter' },
          { key: 'r', label: 'Refresh' },
        );
        break;
      case 'organizations':
        base.push(
          { key: 'n', label: 'New' },
          { key: 'Enter', label: 'Buckets' },
          { key: '/', label: 'Filter' },
          { key: 'r', label: 'Refresh' },
        );
        break;
      case 'snapshots':
        base.push(
          { key: 'n', label: 'Snapshot' },
          { key: 'f', label: 'Fork' },
          { key: 'Esc', label: 'Back' },
          { key: '/', label: 'Filter' },
          { key: 'r', label: 'Refresh' },
        );
        break;
    }

    base.push({ key: 'q', label: 'Quit' });
    return base;
  }, [state.currentView]);

  // Render active view
  const viewProps = { state, dispatch };

  let activeView: React.ReactNode;
  switch (state.currentView) {
    case 'dashboard':
      activeView = <Dashboard {...viewProps} />;
      break;
    case 'buckets':
      activeView = <Buckets {...viewProps} />;
      break;
    case 'objects':
      activeView = <Objects {...viewProps} />;
      break;
    case 'access-keys':
      activeView = <AccessKeys {...viewProps} />;
      break;
    case 'policies':
      activeView = <Policies {...viewProps} />;
      break;
    case 'users':
      activeView = <Users {...viewProps} />;
      break;
    case 'organizations':
      activeView = <Organizations {...viewProps} />;
      break;
    case 'snapshots':
      activeView = <Snapshots {...viewProps} />;
      break;
  }

  return (
    <AppLayout
      currentView={state.currentView}
      orgName={state.orgName}
      bindings={bindings}
    >
      {activeView}
      {state.modalStack.map((modal) => (
        <ModalOverlay key={modal.id} modal={modal} dispatch={dispatch} />
      ))}
    </AppLayout>
  );
}
