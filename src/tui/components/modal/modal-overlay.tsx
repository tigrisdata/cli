import { Box, Text } from 'ink';
import { ConfirmDialog } from './confirm-dialog.js';
import { FormDialog } from './form-dialog.js';
import { DetailView } from './detail-view.js';
import type { ModalState, AppAction } from '../../state.js';

interface ModalOverlayProps {
  modal: ModalState;
  dispatch: React.Dispatch<AppAction>;
}

export function ModalOverlay({ modal, dispatch }: ModalOverlayProps) {
  const close = () => dispatch({ type: 'POP_MODAL' });

  let content: React.ReactNode;

  switch (modal.kind) {
    case 'confirm':
      content = (
        <ConfirmDialog
          title={modal.title}
          message={modal.message ?? ''}
          onConfirm={() => {
            modal.onConfirm?.();
            close();
          }}
          onCancel={() => {
            modal.onCancel?.();
            close();
          }}
        />
      );
      break;
    case 'form':
      content = (
        <FormDialog
          title={modal.title}
          fields={modal.fields ?? []}
          onSubmit={(values) => {
            modal.onSubmit?.(values);
            close();
          }}
          onCancel={() => {
            modal.onCancel?.();
            close();
          }}
        />
      );
      break;
    case 'detail':
      content = (
        <DetailView
          title={modal.title}
          entries={modal.entries ?? []}
          onClose={close}
        />
      );
      break;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      marginX={4}
      marginY={1}
    >
      <Text bold color="cyan">{modal.title}</Text>
      <Box marginTop={1}>{content}</Box>
    </Box>
  );
}
