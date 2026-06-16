import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppLayout({ title, subtitle, actions, children }: AppLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div
      className="flex overflow-hidden"
      style={{ height: '100dvh', backgroundColor: '#060b14' }}
    >
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar
          title={title}
          subtitle={subtitle}
          actions={actions}
          onHamburgerClick={() => setMobileNavOpen(o => !o)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
