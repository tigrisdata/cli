import { Box } from 'ink';
import { TopBar } from './top-bar.js';
import { Footer } from './footer.js';
import type { ViewId } from '../../state.js';
import type { KeyBinding } from '../../types.js';

interface AppLayoutProps {
  currentView: ViewId;
  orgName: string | null;
  bindings: KeyBinding[];
  children: React.ReactNode;
}

export function AppLayout({ currentView, orgName, bindings, children }: AppLayoutProps) {
  return (
    <Box flexDirection="column" height="100%">
      <TopBar currentView={currentView} orgName={orgName} />
      <Box
        flexDirection="column"
        flexGrow={1}
        borderStyle="single"
        marginX={1}
        paddingX={1}
      >
        {children}
      </Box>
      <Footer bindings={bindings} />
    </Box>
  );
}
