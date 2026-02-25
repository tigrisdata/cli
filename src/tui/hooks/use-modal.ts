import { useCallback } from 'react';
import type { AppAction, FormFieldDef } from '../state.js';

interface UseModalReturn {
  confirm: (opts: {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
  form: (opts: {
    title: string;
    fields: FormFieldDef[];
    onSubmit: (values: Record<string, string>) => void;
    onCancel?: () => void;
  }) => void;
  detail: (opts: {
    title: string;
    entries: { label: string; value: string }[];
  }) => void;
  close: () => void;
}

export function useModal(dispatch: React.Dispatch<AppAction>): UseModalReturn {
  const confirm = useCallback(
    (opts: {
      title: string;
      message: string;
      onConfirm: () => void;
      onCancel?: () => void;
    }) => {
      dispatch({
        type: 'PUSH_MODAL',
        modal: {
          kind: 'confirm',
          title: opts.title,
          message: opts.message,
          onConfirm: opts.onConfirm,
          onCancel: opts.onCancel,
        },
      });
    },
    [dispatch]
  );

  const form = useCallback(
    (opts: {
      title: string;
      fields: FormFieldDef[];
      onSubmit: (values: Record<string, string>) => void;
      onCancel?: () => void;
    }) => {
      dispatch({
        type: 'PUSH_MODAL',
        modal: {
          kind: 'form',
          title: opts.title,
          fields: opts.fields,
          onSubmit: opts.onSubmit,
          onCancel: opts.onCancel,
        },
      });
    },
    [dispatch]
  );

  const detail = useCallback(
    (opts: { title: string; entries: { label: string; value: string }[] }) => {
      dispatch({
        type: 'PUSH_MODAL',
        modal: {
          kind: 'detail',
          title: opts.title,
          entries: opts.entries,
        },
      });
    },
    [dispatch]
  );

  const close = useCallback(() => {
    dispatch({ type: 'POP_MODAL' });
  }, [dispatch]);

  return { confirm, form, detail, close };
}
