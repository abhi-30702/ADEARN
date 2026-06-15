import { LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const { clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <header
      className="flex items-center justify-between px-6 shrink-0"
      style={{
        height: 64,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold text-slate-100 tracking-[-0.5px] leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-400 leading-tight mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        {actions}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
