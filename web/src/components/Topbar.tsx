import { LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onHamburgerClick?: () => void;
}

export function Topbar({ title, subtitle, actions, onHamburgerClick }: TopbarProps) {
  const { clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <header
      className="flex items-center justify-between px-4 md:px-6 shrink-0 gap-3"
      style={{
        height: 64,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onHamburgerClick}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors shrink-0"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-[18px] md:text-[22px] font-bold text-slate-100 tracking-[-0.5px] leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-400 leading-tight mt-0.5 hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {actions}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
