export type ViewId =
  | 'dashboard'
  | 'buckets'
  | 'objects'
  | 'access-keys'
  | 'policies'
  | 'users'
  | 'organizations'
  | 'snapshots';

export type ModalKind = 'confirm' | 'form' | 'detail';

export interface ModalState {
  id: number;
  kind: ModalKind;
  title: string;
  // confirm
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  // form
  fields?: FormFieldDef[];
  onSubmit?: (values: Record<string, string>) => void;
  // detail
  entries?: { label: string; value: string }[];
}

export interface FormFieldDef {
  name: string;
  label: string;
  type: 'text' | 'select';
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string;
  required?: boolean;
}

export interface AppState {
  currentView: ViewId;
  previousView: ViewId | null;
  selectedBucket: string | null;
  selectedPrefix: string;
  orgName: string | null;
  orgId: string | null;
  isAuthenticated: boolean;
  loginMethod: string | null;
  modalStack: ModalState[];
  shouldExit: boolean;
  globalError: string | null;
}

export type AppAction =
  | { type: 'SET_VIEW'; view: ViewId }
  | { type: 'PUSH_VIEW'; view: ViewId; bucket?: string; prefix?: string }
  | { type: 'POP_VIEW' }
  | {
      type: 'SET_AUTH';
      authenticated: boolean;
      loginMethod: string | null;
      orgName?: string;
      orgId?: string;
    }
  | { type: 'SET_ORG'; orgName: string; orgId: string }
  | { type: 'PUSH_MODAL'; modal: Omit<ModalState, 'id'> }
  | { type: 'POP_MODAL' }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'EXIT' };

let nextModalId = 1;

export const initialState: AppState = {
  currentView: 'organizations',
  previousView: null,
  selectedBucket: null,
  selectedPrefix: '',
  orgName: null,
  orgId: null,
  isAuthenticated: false,
  loginMethod: null,
  modalStack: [],
  shouldExit: false,
  globalError: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return {
        ...state,
        previousView: state.currentView,
        currentView: action.view,
        globalError: null,
      };

    case 'PUSH_VIEW':
      return {
        ...state,
        previousView: state.currentView,
        currentView: action.view,
        selectedBucket: action.bucket ?? state.selectedBucket,
        selectedPrefix: action.prefix ?? '',
        globalError: null,
      };

    case 'POP_VIEW': {
      if (state.currentView === 'objects') {
        // Navigate up in prefix first
        if (state.selectedPrefix) {
          const trimmed = state.selectedPrefix.replace(/\/$/, '');
          const lastSlash = trimmed.lastIndexOf('/');
          const newPrefix =
            lastSlash === -1 ? '' : trimmed.slice(0, lastSlash + 1);
          return { ...state, selectedPrefix: newPrefix };
        }
        // Back to buckets
        return {
          ...state,
          currentView: 'buckets',
          previousView: 'objects',
          selectedBucket: null,
          selectedPrefix: '',
        };
      }
      // Snapshots → back to Buckets (hierarchy)
      if (state.currentView === 'snapshots') {
        return {
          ...state,
          currentView: 'buckets',
          previousView: 'snapshots',
          selectedBucket: null,
          selectedPrefix: '',
        };
      }
      // Buckets → back to Organizations (hierarchy)
      if (
        state.currentView === 'buckets' &&
        state.previousView === 'organizations'
      ) {
        return {
          ...state,
          currentView: 'organizations',
          previousView: 'buckets',
        };
      }
      // Generic back
      const target = state.previousView ?? 'dashboard';
      return {
        ...state,
        currentView: target,
        previousView: state.currentView,
      };
    }

    case 'SET_AUTH':
      return {
        ...state,
        isAuthenticated: action.authenticated,
        loginMethod: action.loginMethod,
        orgName: action.orgName ?? state.orgName,
        orgId: action.orgId ?? state.orgId,
      };

    case 'SET_ORG':
      return {
        ...state,
        orgName: action.orgName,
        orgId: action.orgId,
      };

    case 'PUSH_MODAL':
      return {
        ...state,
        modalStack: [
          ...state.modalStack,
          { ...action.modal, id: nextModalId++ },
        ],
      };

    case 'POP_MODAL':
      return {
        ...state,
        modalStack: state.modalStack.slice(0, -1),
      };

    case 'SET_ERROR':
      return { ...state, globalError: action.error };

    case 'EXIT':
      return { ...state, shouldExit: true };

    default:
      return state;
  }
}
