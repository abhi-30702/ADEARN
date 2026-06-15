import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppLayout({ title, subtitle, actions, children }: AppLayoutProps) {
  return (
    <div
      className="flex overflow-hidden"
      style={{ height: '100dvh', backgroundColor: '#060b14' }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} subtitle={subtitle} actions={actions} />
        <main className="flex-1 overflow-y-auto p-6 page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
