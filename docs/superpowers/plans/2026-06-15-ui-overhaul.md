# UI Overhaul — Dark Glassmorphism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current plain UI with a dark glassmorphism shell — collapsible sidebar, role-aware nav, and redesigned pages for all three roles.

**Architecture:** Single `AppLayout` component wraps all authenticated pages; `Sidebar` (collapsible, role-aware) + `Topbar` (title + logout) live inside it. Login and Onboarding remain bare. A `components/ui/` library provides all shared primitives.

**Tech Stack:** React 18, Tailwind CSS v3, lucide-react, clsx, tailwind-merge, TanStack Router v1, Zustand, recharts

---

## Task 1: Install Dependencies

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Install the three new packages**

```bash
cd web && npm install lucide-react clsx tailwind-merge
```

Expected output: 3 packages added, no peer-dep warnings.

- [ ] **Step 2: Verify imports resolve**

Create a temp file `web/src/_verify.ts`:
```ts
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ZapIcon } from 'lucide-react';
export { clsx, twMerge, ZapIcon };
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd web && npx tsc --noEmit
```

Expected: zero errors (or only pre-existing errors unrelated to new packages).

- [ ] **Step 4: Delete temp file**

Delete `web/src/_verify.ts`.

- [ ] **Step 5: Commit**

```bash
git add web/package.json web/package-lock.json
git commit -m "feat(web): install lucide-react, clsx, tailwind-merge"
```

---

## Task 2: Design Tokens — Tailwind Config + Inter Font + Global CSS

**Files:**
- Modify: `web/tailwind.config.js`
- Modify: `web/index.html`
- Modify: `web/src/index.css`

- [ ] **Step 1: Update tailwind.config.js**

Replace the entire file with:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'page-bg': '#060b14',
        'sidebar-bg': 'rgba(15,23,42,0.95)',
        teal: {
          300: '#5eead4',
          400: '#2dd4bf',
          600: '#0d9488',
        },
        peach: {
          DEFAULT: '#FFD2C2',
          light: '#FFF0EB',
        },
        aqua: {
          DEFAULT: '#789A99',
          dark: '#5F8180',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
      backdropBlur: {
        glass: '12px',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        shimmer: 'shimmer 1.5s infinite linear',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Add Inter font to index.html**

Replace `web/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AdEarn</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Reset global CSS**

Replace `web/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
    margin: 0;
    padding: 0;
  }

  body {
    background-color: #060b14;
    color: #f1f5f9;
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
    font-size: 13.5px;
    -webkit-font-smoothing: antialiased;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.12);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.20); }
}

@layer utilities {
  .glass {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .glass-hover {
    transition: border-color 0.2s, transform 0.2s;
  }
  .glass-hover:hover {
    border-color: rgba(94,234,212,0.25);
    transform: translateY(-1px);
  }

  .page-content {
    animation: fadeIn 0.15s ease-out;
  }
}
```

- [ ] **Step 4: Start dev server and verify dark background loads**

```bash
cd web && npm run dev
```

Open http://localhost:5173. Background should be near-black (`#060b14`).

- [ ] **Step 5: Commit**

```bash
git add web/tailwind.config.js web/index.html web/src/index.css
git commit -m "feat(web): dark glassmorphism design tokens, Inter font, global CSS"
```

---

## Task 3: UI Component Library — Primitives

**Files:**
- Create: `web/src/components/ui/GlassCard.tsx`
- Create: `web/src/components/ui/Button.tsx`
- Create: `web/src/components/ui/Input.tsx`
- Create: `web/src/components/ui/Skeleton.tsx`

- [ ] **Step 1: Create GlassCard**

Create `web/src/components/ui/GlassCard.tsx`:
```tsx
import { clsx } from 'clsx';

interface GlassCardProps {
  className?: string;
  hover?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function GlassCard({ className, hover = false, children, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'glass',
        hover && 'glass-hover cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create Button**

Create `web/src/components/ui/Button.tsx`:
```tsx
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        variant === 'primary' && [
          'bg-gradient-to-r from-teal-300 to-teal-400 text-slate-900',
          'hover:from-teal-400 hover:to-teal-300 shadow-lg shadow-teal-300/20',
        ],
        variant === 'ghost' && [
          'bg-white/[0.06] border border-white/[0.12] text-slate-300',
          'hover:bg-white/[0.10] hover:text-slate-100',
        ],
        variant === 'danger' && [
          'bg-red-400/10 border border-red-400/20 text-red-400',
          'hover:bg-red-400/20',
        ],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Create Input, Select, Textarea**

Create `web/src/components/ui/Input.tsx`:
```tsx
import { clsx } from 'clsx';
import { forwardRef } from 'react';

const baseClass = clsx(
  'w-full bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-2.5',
  'text-slate-100 placeholder:text-slate-500 text-sm',
  'focus:outline-none focus:ring-2 focus:ring-teal-300/40 focus:border-teal-300/40',
  'transition-colors duration-150',
  'disabled:opacity-50 disabled:cursor-not-allowed'
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400">
          {label}
        </label>
      )}
      <input ref={ref} className={clsx(baseClass, error && 'border-red-400/40', className)} {...props} />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, children, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={clsx(baseClass, 'cursor-pointer', error && 'border-red-400/40', className)}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={clsx(baseClass, 'resize-none', error && 'border-red-400/40', className)}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';
```

- [ ] **Step 4: Create Skeleton**

Create `web/src/components/ui/Skeleton.tsx`:
```tsx
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className, lines = 1 }: SkeletonProps) {
  if (lines > 1) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              'h-4 rounded-md bg-white/[0.08]',
              'bg-gradient-to-r from-white/[0.08] via-white/[0.15] to-white/[0.08]',
              'bg-[length:200%_100%] animate-shimmer',
              i === lines - 1 && 'w-3/4',
              className
            )}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className={clsx(
        'rounded-md bg-white/[0.08]',
        'bg-gradient-to-r from-white/[0.08] via-white/[0.15] to-white/[0.08]',
        'bg-[length:200%_100%] animate-shimmer',
        className
      )}
    />
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ui/
git commit -m "feat(web/ui): primitive components — GlassCard, Button, Input, Skeleton"
```

---

## Task 4: UI Component Library — Composites + Barrel Export

**Files:**
- Create: `web/src/components/ui/KpiCard.tsx`
- Create: `web/src/components/ui/StatusBadge.tsx`
- Create: `web/src/components/ui/DataTable.tsx`
- Create: `web/src/components/ui/PageHeader.tsx`
- Create: `web/src/components/ui/EmptyState.tsx`
- Create: `web/src/components/ui/index.ts`

- [ ] **Step 1: Create KpiCard**

Create `web/src/components/ui/KpiCard.tsx`:
```tsx
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' };
  icon?: React.ReactNode;
}

export function KpiCard({ label, value, sub, trend, icon }: KpiCardProps) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-100 mt-1 leading-none">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        {icon && <div className="text-teal-300 shrink-0 ml-4">{icon}</div>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-3">
          {trend.direction === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
          {trend.direction === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
          {trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5 text-slate-400" />}
          <span className={clsx(
            'text-xs font-semibold',
            trend.direction === 'up' && 'text-emerald-400',
            trend.direction === 'down' && 'text-red-400',
            trend.direction === 'neutral' && 'text-slate-400',
          )}>
            {trend.value}
          </span>
        </div>
      )}
    </GlassCard>
  );
}
```

- [ ] **Step 2: Create StatusBadge**

Create `web/src/components/ui/StatusBadge.tsx`:
```tsx
import { clsx } from 'clsx';

type BadgeStatus = 'active' | 'paused' | 'review' | 'completed' | 'rejected' | 'suspended';

const STATUS_CONFIG: Record<BadgeStatus, { label: string; cls: string }> = {
  active:    { label: 'Active',    cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/25' },
  paused:    { label: 'Paused',    cls: 'bg-amber-400/10  text-amber-400  border-amber-400/25'  },
  review:    { label: 'Review',    cls: 'bg-blue-400/10   text-blue-400   border-blue-400/25'   },
  completed: { label: 'Completed', cls: 'bg-teal-300/10   text-teal-300   border-teal-300/25'   },
  rejected:  { label: 'Rejected',  cls: 'bg-red-400/10    text-red-400    border-red-400/25'    },
  suspended: { label: 'Suspended', cls: 'bg-slate-400/10  text-slate-400  border-slate-400/25'  },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status as BadgeStatus] ?? STATUS_CONFIG.review;
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full border',
      'text-[11px] font-semibold uppercase tracking-[0.7px]',
      cfg.cls
    )}>
      {cfg.label}
    </span>
  );
}
```

- [ ] **Step 3: Create DataTable**

Create `web/src/components/ui/DataTable.tsx`:
```tsx
import { clsx } from 'clsx';

export interface TableColumn<T> {
  key: string;
  label: string;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: TableColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  onRowClick,
  emptyMessage = 'No data to display',
  loading = false,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.08]">
            {columns.map(col => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400 whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-white/[0.04]">
                {columns.map(col => (
                  <td key={col.key} className="py-3 px-4">
                    <div className="h-4 rounded bg-white/[0.06] animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-16 text-center text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'border-b border-white/[0.04] transition-colors duration-100',
                  onRowClick && 'cursor-pointer hover:bg-white/[0.03]'
                )}
              >
                {columns.map(col => (
                  <td key={col.key} className="py-3 px-4 text-slate-300">
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Create PageHeader**

Create `web/src/components/ui/PageHeader.tsx`:
```tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-[-0.5px]">{title}</h2>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0 ml-4">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 5: Create EmptyState**

Create `web/src/components/ui/EmptyState.tsx`:
```tsx
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && <div className="mb-4 opacity-50">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-300">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          <Button variant="ghost" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create barrel export**

Create `web/src/components/ui/index.ts`:
```ts
export { GlassCard } from './GlassCard';
export { Button } from './Button';
export { Input, Select, Textarea } from './Input';
export { Skeleton } from './Skeleton';
export { KpiCard } from './KpiCard';
export { StatusBadge } from './StatusBadge';
export { DataTable } from './DataTable';
export type { TableColumn } from './DataTable';
export { PageHeader } from './PageHeader';
export { EmptyState } from './EmptyState';
```

- [ ] **Step 7: TypeScript check**

```bash
cd web && npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 8: Commit**

```bash
git add web/src/components/ui/
git commit -m "feat(web/ui): composite components — KpiCard, StatusBadge, DataTable, PageHeader, EmptyState"
```

---

## Task 5: AppLayout + Sidebar + Topbar

**Files:**
- Create: `web/src/components/Sidebar.tsx`
- Create: `web/src/components/Topbar.tsx`
- Create: `web/src/components/AppLayout.tsx`

- [ ] **Step 1: Create Sidebar**

Create `web/src/components/Sidebar.tsx`:
```tsx
import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { clsx } from 'clsx';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard, Wallet, ArrowLeftRight, Settings,
  PlusCircle, BarChart2, Shield, Users, Megaphone,
  FileText, DollarSign, ChevronLeft, ChevronRight, Zap,
} from 'lucide-react';

type NavItem = { label: string; icon: React.ElementType; to: string };

const NAV: Record<string, NavItem[]> = {
  consumer: [
    { label: 'Dashboard',    icon: LayoutDashboard, to: '/feed' },
    { label: 'Wallet',       icon: Wallet,          to: '/wallet' },
    { label: 'Transactions', icon: ArrowLeftRight,  to: '/wallet' },
    { label: 'Settings',     icon: Settings,        to: '/onboarding' },
  ],
  advertiser: [
    { label: 'Dashboard',     icon: LayoutDashboard, to: '/advertiser' },
    { label: 'New Campaign',  icon: PlusCircle,      to: '/advertiser/campaigns/new' },
    { label: 'Analytics',     icon: BarChart2,       to: '/advertiser/analytics' },
  ],
  admin: [
    { label: 'Overview',     icon: LayoutDashboard, to: '/admin' },
    { label: 'Fraud Queue',  icon: Shield,          to: '/admin' },
    { label: 'Users',        icon: Users,           to: '/admin' },
    { label: 'Advertisers',  icon: Megaphone,       to: '/admin' },
    { label: 'Audit Log',    icon: FileText,        to: '/admin/audit-log' },
    { label: 'Financials',   icon: DollarSign,      to: '/admin' },
  ],
};

export function Sidebar() {
  const { user } = useAuthStore();
  const { location } = useRouterState();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar_collapsed') === 'true'
  );

  const items = user ? (NAV[user.role] ?? []) : [];

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <aside
      style={{
        width: collapsed ? 68 : 240,
        transition: 'width 0.25s ease',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}
      className="relative flex flex-col h-full overflow-hidden"
    >
      {/* Logo row */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 min-h-[60px]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-300 to-teal-600 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-slate-900" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <span className="font-bold text-slate-100 text-base tracking-tight whitespace-nowrap">
            AdEarn
          </span>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        aria-label="Toggle sidebar"
        className={clsx(
          'absolute top-[18px] right-2.5 w-5 h-5 rounded-full',
          'bg-white/[0.08] border border-white/[0.12]',
          'flex items-center justify-center',
          'text-slate-500 hover:text-teal-300 hover:bg-white/[0.12]',
          'transition-colors duration-150'
        )}
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {items.map(item => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 whitespace-nowrap',
                isActive
                  ? 'bg-teal-300/[0.15] text-teal-300 border border-teal-300/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border border-transparent'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div
          className="px-2 pb-4 pt-2 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-600 to-teal-300 flex items-center justify-center text-slate-900 text-xs font-bold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-400 capitalize">{user.role}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Create Topbar**

Create `web/src/components/Topbar.tsx`:
```tsx
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
```

- [ ] **Step 3: Create AppLayout**

Create `web/src/components/AppLayout.tsx`:
```tsx
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
```

- [ ] **Step 4: TypeScript check**

```bash
cd web && npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/Sidebar.tsx web/src/components/Topbar.tsx web/src/components/AppLayout.tsx
git commit -m "feat(web): AppLayout + collapsible Sidebar + Topbar with logout"
```

---

## Task 6: Redesign Login Page

**Files:**
- Modify: `web/src/pages/consumer/LoginPage.tsx`

- [ ] **Step 1: Read the current file**

Read `web/src/pages/consumer/LoginPage.tsx` to understand the existing OTP + auth logic.

- [ ] **Step 2: Rewrite LoginPage**

Replace the entire file with the glassmorphism version. The existing logic (mobile → OTP flow, quickLogin with demo accounts, setAuth) must be preserved exactly — only the markup and styling changes:

```tsx
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Zap } from 'lucide-react';

const ROLE_HOME: Record<string, string> = {
  consumer: '/feed',
  advertiser: '/advertiser',
  admin: '/admin',
};

const DEMO_ACCOUNTS = [
  { label: 'Consumer', phone: '9876543210', color: 'bg-teal-300/10 text-teal-300 border-teal-300/25 hover:bg-teal-300/20' },
  { label: 'Advertiser', phone: '9123456789', color: 'bg-peach/10 text-peach border-peach/25 hover:bg-peach/20' },
  { label: 'Admin', phone: '9000000000', color: 'bg-blue-400/10 text-blue-400 border-blue-400/25 hover:bg-blue-400/20' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestOtp = async (phoneNum = phone) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/request-otp', { phone: phoneNum });
      setPhone(phoneNum);
      setStep('otp');
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/verify-otp', { phone, otp });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      navigate({ to: ROLE_HOME[user.role] ?? '/feed' });
    } catch {
      setError('Invalid OTP. Try 123456 for demo accounts.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (demoPhone: string) => {
    await requestOtp(demoPhone);
    setOtp('123456');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: '#060b14' }}
    >
      {/* Background glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 80% 10%, rgba(94,234,212,0.08) 0%, transparent 70%),' +
            'radial-gradient(ellipse 50% 40% at 20% 90%, rgba(255,210,194,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-300 to-teal-600 flex items-center justify-center mb-3 shadow-lg shadow-teal-300/20">
            <Zap className="w-6 h-6 text-slate-900" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">AdEarn</h1>
          <p className="text-sm text-slate-400 mt-1">Get paid for every purchase</p>
        </div>

        {/* Glass card */}
        <div
          className="p-6 rounded-[14px]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {step === 'phone' ? (
            <>
              <h2 className="text-base font-semibold text-slate-100 mb-4">Sign in</h2>
              <div className="flex flex-col gap-4">
                <Input
                  label="Mobile Number"
                  type="tel"
                  placeholder="Enter 10-digit mobile"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && phone.length === 10 && requestOtp()}
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
                <Button
                  onClick={() => requestOtp()}
                  loading={loading}
                  disabled={phone.length !== 10}
                  className="w-full"
                >
                  Send OTP
                </Button>
              </div>

              {/* Demo accounts */}
              <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-500 mb-3">
                  Demo Accounts
                </p>
                <div className="flex gap-2">
                  {DEMO_ACCOUNTS.map(acc => (
                    <button
                      key={acc.label}
                      onClick={() => quickLogin(acc.phone)}
                      disabled={loading}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-colors ${acc.color}`}
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors mb-4 flex items-center gap-1"
              >
                ← Back
              </button>
              <h2 className="text-base font-semibold text-slate-100 mb-1">Enter OTP</h2>
              <p className="text-xs text-slate-400 mb-4">Sent to +91 {phone}</p>
              <div className="flex flex-col gap-4">
                <Input
                  label="OTP"
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && otp.length === 6 && verifyOtp()}
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
                <Button
                  onClick={verifyOtp}
                  loading={loading}
                  disabled={otp.length !== 6}
                  className="w-full"
                >
                  Verify & Sign in
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 4: Start dev server and verify visually**

```bash
cd web && npm run dev
```

Open http://localhost:5173/login. Verify:
- Dark background with faint teal/peach glow
- Centred glass card
- Three demo account pills at bottom
- OTP step renders after entering phone

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/consumer/LoginPage.tsx
git commit -m "feat(web): glassmorphism Login page redesign"
```

---

## Task 7: Redesign Onboarding Page

**Files:**
- Modify: `web/src/pages/consumer/OnboardingPage.tsx`

- [ ] **Step 1: Read current file**

Read `web/src/pages/consumer/OnboardingPage.tsx` to extract existing step logic, API calls, and state management.

- [ ] **Step 2: Rewrite OnboardingPage**

Replace the entire file. Preserve all existing API calls and business logic. Only the markup/styling changes. Key elements:
- Three steps: categories (chips), pool sliders, success
- No sidebar — bare page with dark bg
- Glass card centered
- Teal progress bar
- Step 1: predefined category chips (multi-select grid)
- Step 2: pool sliders with live sum indicator
- Step 3: animated checkmark + "Go to Feed" CTA

```tsx
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { clsx } from 'clsx';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { CheckCircle2, Zap } from 'lucide-react';

const CATEGORIES = [
  'Health & Beauty', 'Electronics', 'Fashion', 'Grocery',
  'Home & Kitchen', 'Sports', 'Books', 'Toys',
];

const POOL_DEFAULTS = { liquid: 40, savings: 30, parent: 20, charity: 10 };

type Pools = { liquid: number; savings: number; parent: number; charity: number };

const POOL_CONFIG = [
  { key: 'liquid' as const,  label: 'Liquid',   color: 'text-teal-300',   bar: 'bg-teal-300'   },
  { key: 'savings' as const, label: 'Savings',  color: 'text-blue-400',   bar: 'bg-blue-400'   },
  { key: 'parent' as const,  label: 'Parent',   color: 'text-purple-400', bar: 'bg-purple-400' },
  { key: 'charity' as const, label: 'Charity',  color: 'text-peach',      bar: 'bg-peach'      },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [pools, setPools] = useState<Pools>(POOL_DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleCat = (cat: string) => {
    setSelectedCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const poolSum = Object.values(pools).reduce((a, b) => a + b, 0);

  const adjustPool = (key: keyof Pools, val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    const others = Object.keys(pools).filter(k => k !== key) as (keyof Pools)[];
    const oldSum = others.reduce((s, k) => s + pools[k], 0);
    const remaining = 100 - clamped;
    const newPools = { ...pools, [key]: clamped };
    if (oldSum > 0) {
      others.forEach(k => {
        newPools[k] = Math.round((pools[k] / oldSum) * remaining);
      });
    }
    const actual = Object.values(newPools).reduce((a, b) => a + b, 0);
    if (actual !== 100) newPools[others[others.length - 1]] += 100 - actual;
    setPools(newPools);
  };

  const saveProfile = async () => {
    setLoading(true);
    setError('');
    try {
      await api.put('/profile', { categories: selectedCats, brand_affinity: [], price_range: 'mid' });
      setStep(2);
    } catch {
      setError('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const savePools = async () => {
    setLoading(true);
    setError('');
    try {
      await api.put('/pool-config', {
        liquid_pct: pools.liquid,
        savings_pct: pools.savings,
        parent_pct: pools.parent,
        charity_pct: pools.charity,
      });
      setStep(3);
    } catch {
      setError('Failed to save pool config.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#060b14' }}
    >
      <div className="w-full max-w-[520px]">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-300 to-teal-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-slate-900" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-slate-100 text-base">AdEarn</span>
        </div>

        {/* Progress bar */}
        {step < 3 && (
          <div className="mb-6">
            <div className="flex justify-between text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-500 mb-2">
              <span>Step {step} of 2</span>
              <span>{step === 1 ? 'Shopping Profile' : 'Earning Pools'}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-300 to-teal-400 transition-all duration-500"
                style={{ width: step === 1 ? '50%' : '100%' }}
              />
            </div>
          </div>
        )}

        {/* Glass card */}
        <div
          className="p-6 rounded-[14px]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Step 1: Categories */}
          {step === 1 && (
            <>
              <h2 className="text-base font-semibold text-slate-100 mb-1">Your Shopping Interests</h2>
              <p className="text-sm text-slate-400 mb-5">Select categories you shop in (choose at least one)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCat(cat)}
                    className={clsx(
                      'px-3 py-2.5 rounded-lg border text-xs font-medium transition-all duration-150',
                      selectedCats.includes(cat)
                        ? 'bg-teal-300/[0.15] border-teal-300/30 text-teal-300'
                        : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
              <Button
                onClick={saveProfile}
                loading={loading}
                disabled={selectedCats.length === 0}
                className="w-full"
              >
                Continue
              </Button>
            </>
          )}

          {/* Step 2: Pool sliders */}
          {step === 2 && (
            <>
              <h2 className="text-base font-semibold text-slate-100 mb-1">Cashback Split</h2>
              <p className="text-sm text-slate-400 mb-5">Set how your earnings are distributed across pools</p>
              <div className="flex flex-col gap-5 mb-5">
                {POOL_CONFIG.map(p => (
                  <div key={p.key}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-sm font-medium ${p.color}`}>{p.label}</span>
                      <span className="text-sm font-bold text-slate-200">{pools[p.key]}%</span>
                    </div>
                    <div className="relative h-2 rounded-full bg-white/[0.08] mb-1">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full transition-all ${p.bar}`}
                        style={{ width: `${pools[p.key]}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={pools[p.key]}
                      onChange={e => adjustPool(p.key, Number(e.target.value))}
                      className="w-full opacity-0 h-2 -mt-3 cursor-pointer relative z-10"
                    />
                  </div>
                ))}
              </div>
              <div className={clsx(
                'text-center text-sm font-semibold mb-4',
                poolSum === 100 ? 'text-emerald-400' : 'text-red-400'
              )}>
                Total: {poolSum}% {poolSum === 100 ? '✓' : `(must equal 100%)`}
              </div>
              {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
              <Button
                onClick={savePools}
                loading={loading}
                disabled={poolSum !== 100}
                className="w-full"
              >
                Save & Continue
              </Button>
            </>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-400/10 border border-emerald-400/25 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">You're all set!</h2>
              <p className="text-sm text-slate-400 text-center mb-6">
                Your profile is ready. Start exploring ads matched to your interests.
              </p>
              <Button onClick={() => navigate({ to: '/feed' })} className="w-full">
                Go to Feed →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check + commit**

```bash
cd web && npx tsc --noEmit
git add web/src/pages/consumer/OnboardingPage.tsx
git commit -m "feat(web): glassmorphism Onboarding page — category chips + pool sliders"
```

---

## Task 8: Redesign Consumer Pages — Feed + Wallet

**Files:**
- Modify: `web/src/pages/consumer/FeedPage.tsx`
- Modify: `web/src/pages/consumer/WalletPage.tsx`

- [ ] **Step 1: Read current WalletPage**

Read `web/src/pages/consumer/WalletPage.tsx` to extract polling logic (TanStack Query), API calls, and data structures.

- [ ] **Step 2: Rewrite FeedPage**

Replace `web/src/pages/consumer/FeedPage.tsx`:
```tsx
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '../../components/AppLayout';
import { GlassCard, EmptyState, StatusBadge } from '../../components/ui';
import { api } from '../../lib/api';
import { ShoppingBag } from 'lucide-react';
import { Button } from '../../components/ui';

interface AdCard {
  campaign_id: string;
  campaign_name: string;
  brand_name: string;
  cashback_rate: number;
  media_url?: string;
}

export function FeedPage() {
  const { data: ads = [], isLoading } = useQuery<AdCard[]>({
    queryKey: ['feed'],
    queryFn: async () => {
      const res = await api.get('/feed');
      return res.data.data ?? [];
    },
    staleTime: 60_000,
  });

  return (
    <AppLayout title="Your Feed" subtitle="Ads matched to your purchase intent">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <GlassCard key={i} className="h-40 animate-pulse" />
          ))}
        </div>
      ) : ads.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-10 h-10" />}
          title="No matched ads yet"
          description="Complete your shopping profile to see personalised ads here."
          action={{ label: 'Update Profile', onClick: () => window.location.href = '/onboarding' }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map(ad => (
            <GlassCard key={ad.campaign_id} hover className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-white/[0.08] flex items-center justify-center text-lg font-bold text-slate-300">
                  {ad.brand_name.charAt(0)}
                </div>
                <StatusBadge status="active" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-500">
                  {ad.brand_name}
                </p>
                <p className="text-sm font-semibold text-slate-200 mt-0.5 leading-snug">
                  {ad.campaign_name}
                </p>
              </div>
              <div className="flex items-center justify-between mt-auto pt-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-teal-300/10 border border-teal-300/20 text-teal-300 text-xs font-bold">
                  {ad.cashback_rate}% cashback
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => api.post(`/feed/${ad.campaign_id}/view`)}
                >
                  Shop Now
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
```

- [ ] **Step 3: Rewrite WalletPage**

Read the current WalletPage first, then replace preserving all TanStack Query polling, API calls, and data structures. Replace `web/src/pages/consumer/WalletPage.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '../../components/AppLayout';
import { GlassCard, DataTable, StatusBadge } from '../../components/ui';
import type { TableColumn } from '../../components/ui';
import { api } from '../../lib/api';
import { Wallet, TrendingUp } from 'lucide-react';

interface WalletData {
  total_earned: number;
  pools: {
    liquid: number;
    savings: number;
    parent: number;
    charity: number;
  };
}

interface Transaction {
  id: string;
  campaign_name: string;
  amount: number;
  created_at: string;
  status: string;
}

const POOL_CONFIG = [
  { key: 'liquid'  as const, label: 'Liquid',   icon: '💧', color: 'text-teal-300',   border: 'border-teal-300/20'   },
  { key: 'savings' as const, label: 'Savings',  icon: '🏦', color: 'text-blue-400',   border: 'border-blue-400/20'   },
  { key: 'parent'  as const, label: 'Parent',   icon: '👨‍👩‍👧', color: 'text-purple-400', border: 'border-purple-400/20' },
  { key: 'charity' as const, label: 'Charity',  icon: '🤝', color: 'text-peach',      border: 'border-peach/20'      },
];

const TX_COLUMNS: TableColumn<Transaction>[] = [
  { key: 'campaign_name', label: 'Campaign' },
  {
    key: 'amount', label: 'Amount',
    render: (v) => <span className="text-teal-300 font-semibold">+₹{Number(v).toFixed(2)}</span>,
  },
  {
    key: 'created_at', label: 'Date',
    render: (v) => new Date(String(v)).toLocaleDateString('en-IN'),
  },
  {
    key: 'status', label: 'Status',
    render: (v) => <StatusBadge status={String(v)} />,
  },
];

export function WalletPage() {
  const { data: wallet } = useQuery<WalletData>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const res = await api.get('/wallet');
      return res.data.data;
    },
    refetchInterval: 5000,
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get('/transactions');
      return res.data.data ?? [];
    },
    refetchInterval: 5000,
  });

  return (
    <AppLayout title="Wallet" subtitle="Your earnings and pool balances">
      {/* Hero */}
      <GlassCard className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-300/10 border border-teal-300/20 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400">
              Total Earned
            </p>
            <p className="text-3xl font-bold text-slate-100 leading-none mt-1">
              ₹{(wallet?.total_earned ?? 0).toFixed(2)}
            </p>
          </div>
          <div className="ml-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              Live
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Pool grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {POOL_CONFIG.map(p => (
          <GlassCard key={p.key} className={`p-4 border ${p.border}`}>
            <div className="text-2xl mb-2">{p.icon}</div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400">
              {p.label}
            </p>
            <p className={`text-xl font-bold mt-1 ${p.color}`}>
              ₹{((wallet?.pools?.[p.key]) ?? 0).toFixed(2)}
            </p>
          </GlassCard>
        ))}
      </div>

      {/* Transaction table */}
      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-semibold text-slate-200">Transaction History</h3>
        </div>
        <DataTable
          columns={TX_COLUMNS}
          rows={transactions}
          emptyMessage="No transactions yet"
        />
      </GlassCard>
    </AppLayout>
  );
}
```

- [ ] **Step 4: TypeScript check + commit**

```bash
cd web && npx tsc --noEmit
git add web/src/pages/consumer/FeedPage.tsx web/src/pages/consumer/WalletPage.tsx
git commit -m "feat(web): glassmorphism Feed + Wallet pages"
```

---

## Task 9: Redesign Advertiser Pages

**Files:**
- Modify: `web/src/pages/advertiser/AdvertiserDashboardPage.tsx`
- Modify: `web/src/pages/advertiser/CampaignCreatePage.tsx`
- Modify: `web/src/pages/advertiser/CampaignStatsPage.tsx`
- Modify: `web/src/pages/advertiser/AnalyticsDashboardPage.tsx`

- [ ] **Step 1: Read all four current advertiser pages**

Read each file to extract: API calls, query keys, form schemas, chart data structures, and navigation logic.

- [ ] **Step 2: Rewrite AdvertiserDashboardPage**

Replace `web/src/pages/advertiser/AdvertiserDashboardPage.tsx`. Preserve existing API calls (GET /advertiser/campaigns). Add KPI row, campaigns DataTable:

```tsx
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { AppLayout } from '../../components/AppLayout';
import { KpiCard, GlassCard, DataTable, StatusBadge, Button } from '../../components/ui';
import type { TableColumn } from '../../components/ui';
import { api } from '../../lib/api';
import { Plus, BarChart2, DollarSign, Target, TrendingUp } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  status: string;
  budget: number;
  spent_to_date: number;
  conversion_count: number;
}

const COLUMNS: TableColumn<Campaign>[] = [
  { key: 'name', label: 'Campaign' },
  {
    key: 'status', label: 'Status',
    render: (v) => <StatusBadge status={String(v)} />,
  },
  {
    key: 'spent_to_date', label: 'Spent',
    render: (v, row) => (
      <div className="min-w-[120px]">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-300">₹{Number(v).toFixed(0)}</span>
          <span className="text-slate-500">₹{Number(row.budget).toFixed(0)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-300 to-teal-400"
            style={{ width: `${Math.min(100, (Number(v) / Number(row.budget)) * 100)}%` }}
          />
        </div>
      </div>
    ),
  },
  {
    key: 'conversion_count', label: 'Conversions',
    render: (v) => <span className="font-semibold text-slate-200">{String(v)}</span>,
  },
];

export function AdvertiserDashboardPage() {
  const navigate = useNavigate();

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['advertiser', 'campaigns'],
    queryFn: async () => {
      const res = await api.get('/advertiser/campaigns');
      return res.data.data ?? [];
    },
  });

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalSpend = campaigns.reduce((s, c) => s + Number(c.spent_to_date), 0);
  const totalConversions = campaigns.reduce((s, c) => s + Number(c.conversion_count), 0);
  const convRate = campaigns.length > 0
    ? ((totalConversions / campaigns.length) * 100).toFixed(1)
    : '0.0';

  return (
    <AppLayout
      title="Advertiser Dashboard"
      actions={
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => navigate({ to: '/advertiser/campaigns/new' })}
        >
          New Campaign
        </Button>
      }
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Spend" value={`₹${totalSpend.toFixed(2)}`} icon={<DollarSign className="w-5 h-5" />} />
        <KpiCard label="Active Campaigns" value={activeCampaigns} icon={<BarChart2 className="w-5 h-5" />} />
        <KpiCard label="Conversions" value={totalConversions} icon={<Target className="w-5 h-5" />} />
        <KpiCard label="Avg Conv. Rate" value={`${convRate}%`} icon={<TrendingUp className="w-5 h-5" />} />
      </div>

      {/* Campaigns table */}
      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-semibold text-slate-200">Campaigns</h3>
        </div>
        <DataTable
          columns={COLUMNS}
          rows={campaigns}
          loading={isLoading}
          onRowClick={row => navigate({ to: '/advertiser/campaigns/$campaignId/stats', params: { campaignId: row.id } })}
          emptyMessage="No campaigns yet — create your first one"
        />
      </GlassCard>
    </AppLayout>
  );
}
```

- [ ] **Step 3: Rewrite CampaignCreatePage**

Replace `web/src/pages/advertiser/CampaignCreatePage.tsx`. Preserve existing react-hook-form + zod schema + POST /advertiser/campaigns. Update markup to use dark form controls:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from '@tanstack/react-router';
import { AppLayout } from '../../components/AppLayout';
import { GlassCard, Button, Input, Select, Textarea } from '../../components/ui';
import { api } from '../../lib/api';

const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  brand_name: z.string().min(2, 'Brand name required'),
  description: z.string().optional(),
  cashback_rate: z.coerce.number().min(0.5).max(20),
  budget: z.coerce.number().min(1000),
  start_date: z.string().min(1, 'Start date required'),
  end_date: z.string().min(1, 'End date required'),
  target_categories: z.string().min(1, 'At least one category required'),
});

type FormData = z.infer<typeof schema>;

export function CampaignCreatePage() {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { cashback_rate: 2, budget: 10000 },
  });

  const watched = watch();

  const onSubmit = async (data: FormData) => {
    await api.post('/advertiser/campaigns', {
      ...data,
      target_profile: { categories: data.target_categories.split(',').map(s => s.trim()) },
    });
    navigate({ to: '/advertiser' });
  };

  return (
    <AppLayout title="New Campaign" subtitle="Set up your campaign details">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* Form */}
        <GlassCard className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400 mb-1">Basic Info</p>
            <Input label="Campaign Name" placeholder="e.g. Summer Sale" error={errors.name?.message} {...register('name')} />
            <Input label="Brand Name" placeholder="e.g. Mamaearth" error={errors.brand_name?.message} {...register('brand_name')} />
            <Textarea label="Description" placeholder="What are you promoting?" rows={3} {...register('description')} />

            <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400 mt-2 mb-1">Targeting</p>
            <Input
              label="Target Categories (comma-separated)"
              placeholder="Health & Beauty, Electronics"
              error={errors.target_categories?.message}
              {...register('target_categories')}
            />

            <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400 mt-2 mb-1">Budget</p>
            <Input label="Cashback Rate (%)" type="number" step="0.5" error={errors.cashback_rate?.message} {...register('cashback_rate')} />
            <Input label="Total Budget (₹)" type="number" step="100" error={errors.budget?.message} {...register('budget')} />

            <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400 mt-2 mb-1">Schedule</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Start Date" type="date" error={errors.start_date?.message} {...register('start_date')} />
              <Input label="End Date" type="date" error={errors.end_date?.message} {...register('end_date')} />
            </div>

            <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
              Launch Campaign
            </Button>
          </form>
        </GlassCard>

        {/* Live preview */}
        <div className="flex flex-col gap-4">
          <GlassCard className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400 mb-3">Preview</p>
            <GlassCard hover className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-white/[0.08] flex items-center justify-center text-slate-300 font-bold">
                  {(watched.brand_name || 'B').charAt(0)}
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-teal-300/10 border border-teal-300/20 text-teal-300 text-xs font-bold">
                  {watched.cashback_rate || 0}% cashback
                </span>
              </div>
              <p className="text-[11px] text-slate-500 uppercase font-semibold tracking-wider">
                {watched.brand_name || 'Brand'}
              </p>
              <p className="text-sm font-semibold text-slate-200 mt-1">
                {watched.name || 'Campaign Name'}
              </p>
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-slate-500">
                  Budget: ₹{Number(watched.budget || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </GlassCard>
          </GlassCard>
        </div>
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 4: Rewrite CampaignStatsPage**

Replace `web/src/pages/advertiser/CampaignStatsPage.tsx`. Preserve route param reading and API call:

```tsx
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '../../components/AppLayout';
import { KpiCard, GlassCard, DataTable, Button } from '../../components/ui';
import type { TableColumn } from '../../components/ui';
import { api } from '../../lib/api';
import { ArrowLeft, Eye, Target, DollarSign, BarChart2 } from 'lucide-react';

interface StatsData {
  campaign: { name: string; status: string };
  impressions: number;
  conversions: number;
  spend: number;
  conversion_rate: number;
}

interface Conversion {
  id: string;
  consumer_name: string;
  cashback_amount: number;
  created_at: string;
}

const CONV_COLUMNS: TableColumn<Conversion>[] = [
  { key: 'consumer_name', label: 'Consumer' },
  { key: 'cashback_amount', label: 'Cashback', render: (v) => `₹${Number(v).toFixed(2)}` },
  { key: 'created_at', label: 'Date', render: (v) => new Date(String(v)).toLocaleDateString('en-IN') },
];

export function CampaignStatsPage() {
  const { campaignId } = useParams({ from: '/advertiser/campaigns/$campaignId/stats' });
  const navigate = useNavigate();

  const { data } = useQuery<StatsData>({
    queryKey: ['campaign-stats', campaignId],
    queryFn: async () => {
      const res = await api.get(`/advertiser/campaigns/${campaignId}/stats`);
      return res.data.data;
    },
  });

  return (
    <AppLayout
      title={data?.campaign.name ?? 'Campaign Stats'}
      actions={
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate({ to: '/advertiser' })}>
          Back
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Impressions" value={data?.impressions ?? 0} icon={<Eye className="w-5 h-5" />} />
        <KpiCard label="Conversions" value={data?.conversions ?? 0} icon={<Target className="w-5 h-5" />} />
        <KpiCard label="Spend" value={`₹${(data?.spend ?? 0).toFixed(2)}`} icon={<DollarSign className="w-5 h-5" />} />
        <KpiCard label="Conv. Rate" value={`${(data?.conversion_rate ?? 0).toFixed(1)}%`} icon={<BarChart2 className="w-5 h-5" />} />
      </div>
      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-semibold text-slate-200">Recent Conversions</h3>
        </div>
        <DataTable columns={CONV_COLUMNS} rows={[]} emptyMessage="No conversions yet" />
      </GlassCard>
    </AppLayout>
  );
}
```

- [ ] **Step 5: Rewrite AnalyticsDashboardPage**

Read current file first, then replace — preserve recharts AreaChart, BarChart, and ring SVG. Apply dark theme (see Task 11 for shared config). Update markup to use AppLayout + GlassCard:

```tsx
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { AppLayout } from '../../components/AppLayout';
import { GlassCard, Button } from '../../components/ui';
import { api } from '../../lib/api';
import { Download } from 'lucide-react';

const CHART_COLORS = { teal: '#5eead4', peach: '#FFD2C2', grid: 'rgba(255,255,255,0.06)', text: '#94a3b8' };

const TooltipStyle = {
  contentStyle: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, color: '#f1f5f9' },
  labelStyle: { color: '#94a3b8' },
};

interface SpendDataPoint { date: string; spend: number }
interface ConvDataPoint  { date: string; rate: number  }
interface AnalyticsData  { spend_trend: SpendDataPoint[]; conversion_trend: ConvDataPoint[]; conversion_rate: number }

export function AnalyticsDashboardPage() {
  const { data } = useQuery<AnalyticsData>({
    queryKey: ['advertiser', 'analytics'],
    queryFn: async () => {
      const res = await api.get('/advertiser/analytics');
      return res.data.data;
    },
  });

  const exportPdf = async () => {
    const res = await api.get('/advertiser/analytics/export', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = 'analytics.pdf'; a.click();
    URL.revokeObjectURL(url);
  };

  const convRate = data?.conversion_rate ?? 0;
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (convRate / 100) * circumference;

  return (
    <AppLayout
      title="Analytics"
      subtitle="Campaign performance overview"
      actions={
        <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />} onClick={exportPdf}>
          Export PDF
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spend trend */}
        <GlassCard className="lg:col-span-2 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Spend Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.spend_trend ?? []}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.teal} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: CHART_COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
              <Tooltip {...TooltipStyle} formatter={(v: number) => [`₹${v}`, 'Spend']} />
              <Area type="monotone" dataKey="spend" stroke={CHART_COLORS.teal} strokeWidth={2} fill="url(#tealGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Conversion ring */}
        <GlassCard className="p-5 flex flex-col items-center justify-center">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 self-start">Conversion Rate</h3>
          <svg width={96} height={96} viewBox="0 0 96 96">
            <circle cx={48} cy={48} r={36} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
            <circle
              cx={48} cy={48} r={36}
              fill="none" stroke={CHART_COLORS.teal} strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 48 48)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <p className="text-3xl font-bold text-teal-300 mt-3">{convRate.toFixed(1)}%</p>
          <p className="text-xs text-slate-400">Overall Conv. Rate</p>
        </GlassCard>

        {/* Conversion rate bar chart */}
        <GlassCard className="lg:col-span-3 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Daily Conversion Rate</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data?.conversion_trend ?? []}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: CHART_COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip {...TooltipStyle} formatter={(v: number) => [`${v}%`, 'Rate']} />
              <Bar dataKey="rate" fill={CHART_COLORS.peach} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 6: TypeScript check + commit**

```bash
cd web && npx tsc --noEmit
git add web/src/pages/advertiser/
git commit -m "feat(web): glassmorphism Advertiser pages — Dashboard, CampaignCreate, Stats, Analytics"
```

---

## Task 10: Redesign Admin Pages

**Files:**
- Modify: `web/src/pages/admin/AdminDashboardPage.tsx`
- Modify: `web/src/pages/admin/AuditLogPage.tsx`

- [ ] **Step 1: Read both current files**

Read `web/src/pages/admin/AdminDashboardPage.tsx` and `web/src/pages/admin/AuditLogPage.tsx` to extract: tab state, API calls, data shapes, approve/reject actions.

- [ ] **Step 2: Rewrite AdminDashboardPage**

Replace the file. Preserve all existing API calls (GET /admin/financials, GET /admin/fraud-queue, PUT approvals), tab state logic, and approval/rejection logic. Update to use AppLayout + glassmorphism:

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../../components/AppLayout';
import { KpiCard, GlassCard, DataTable, StatusBadge, Button } from '../../components/ui';
import type { TableColumn } from '../../components/ui';
import { api } from '../../lib/api';
import { DollarSign, Shield, Users, Megaphone } from 'lucide-react';

type Tab = 'financials' | 'fraud' | 'users' | 'advertisers';

interface FraudItem { id: string; user_name: string; campaign_name: string; score: number; amount: number; created_at: string }
interface UserItem   { id: string; name: string; phone: string; kyc_status: string; created_at: string }
interface AdvertiserItem { id: string; name: string; business_name: string; status: string; created_at: string }
interface Financials { total_cashback_paid: number; total_ad_spend: number; charity_pool: number; parent_pool: number }

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'financials',  label: 'Financials',   icon: DollarSign },
  { key: 'fraud',       label: 'Fraud Queue',  icon: Shield    },
  { key: 'users',       label: 'Users',        icon: Users     },
  { key: 'advertisers', label: 'Advertisers',  icon: Megaphone },
];

export function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('financials');
  const qc = useQueryClient();

  const { data: fin } = useQuery<Financials>({ queryKey: ['admin', 'financials'], queryFn: async () => (await api.get('/admin/financials')).data.data });
  const { data: fraud = [], isLoading: fraudLoading } = useQuery<FraudItem[]>({ queryKey: ['admin', 'fraud'], queryFn: async () => (await api.get('/admin/fraud-queue')).data.data ?? [] });
  const { data: users = [], isLoading: usersLoading } = useQuery<UserItem[]>({ queryKey: ['admin', 'users'], queryFn: async () => (await api.get('/admin/users')).data.data ?? [] });
  const { data: advertisers = [], isLoading: adsLoading } = useQuery<AdvertiserItem[]>({ queryKey: ['admin', 'advertisers'], queryFn: async () => (await api.get('/admin/advertisers')).data.data ?? [] });

  const approveFraud = useMutation({ mutationFn: (id: string) => api.put(`/admin/fraud-queue/${id}/approve`), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'fraud'] }) });
  const rejectFraud  = useMutation({ mutationFn: (id: string) => api.put(`/admin/fraud-queue/${id}/reject`),  onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'fraud'] }) });
  const approveAdv   = useMutation({ mutationFn: (id: string) => api.put(`/admin/advertisers/${id}/approve`), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'advertisers'] }) });
  const suspendUser  = useMutation({ mutationFn: (id: string) => api.put(`/admin/users/${id}/suspend`), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }) });

  const fraudCols: TableColumn<FraudItem>[] = [
    { key: 'user_name', label: 'User' },
    { key: 'campaign_name', label: 'Campaign' },
    { key: 'score', label: 'Score', render: v => <span className="text-red-400 font-semibold">{Number(v).toFixed(2)}</span> },
    { key: 'amount', label: 'Amount', render: v => `₹${Number(v).toFixed(2)}` },
    { key: 'id', label: 'Actions', render: (id) => (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => approveFraud.mutate(String(id))}>Approve</Button>
        <Button size="sm" variant="danger" onClick={() => rejectFraud.mutate(String(id))}>Reject</Button>
      </div>
    )},
  ];

  const userCols: TableColumn<UserItem>[] = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'kyc_status', label: 'KYC', render: v => <StatusBadge status={String(v)} /> },
    { key: 'id', label: 'Actions', render: (id) => (
      <Button size="sm" variant="danger" onClick={() => suspendUser.mutate(String(id))}>Suspend</Button>
    )},
  ];

  const advCols: TableColumn<AdvertiserItem>[] = [
    { key: 'name', label: 'Name' },
    { key: 'business_name', label: 'Business' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={String(v)} /> },
    { key: 'id', label: 'Actions', render: (id, row) => row.status === 'pending' ? (
      <Button size="sm" onClick={() => approveAdv.mutate(String(id))}>Approve</Button>
    ) : null },
  ];

  return (
    <AppLayout title="Admin Dashboard">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-teal-300/[0.15] text-teal-300 border border-teal-300/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Financials */}
      {tab === 'financials' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Cashback Paid" value={`₹${(fin?.total_cashback_paid ?? 0).toFixed(2)}`} icon={<DollarSign className="w-5 h-5" />} />
            <KpiCard label="Total Ad Spend" value={`₹${(fin?.total_ad_spend ?? 0).toFixed(2)}`} icon={<DollarSign className="w-5 h-5" />} />
            <KpiCard label="Charity Pool" value={`₹${(fin?.charity_pool ?? 0).toFixed(2)}`} icon={<DollarSign className="w-5 h-5" />} />
            <KpiCard label="Parent Pool" value={`₹${(fin?.parent_pool ?? 0).toFixed(2)}`} icon={<DollarSign className="w-5 h-5" />} />
          </div>
        </div>
      )}

      {/* Fraud Queue */}
      {tab === 'fraud' && (
        <GlassCard className="overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-sm font-semibold text-slate-200">Fraud Queue</h3>
          </div>
          <DataTable columns={fraudCols} rows={fraud} loading={fraudLoading} emptyMessage="No items in fraud queue" />
        </GlassCard>
      )}

      {/* Users */}
      {tab === 'users' && (
        <GlassCard className="overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-sm font-semibold text-slate-200">Users</h3>
          </div>
          <DataTable columns={userCols} rows={users} loading={usersLoading} emptyMessage="No users found" />
        </GlassCard>
      )}

      {/* Advertisers */}
      {tab === 'advertisers' && (
        <GlassCard className="overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-sm font-semibold text-slate-200">Advertisers</h3>
          </div>
          <DataTable columns={advCols} rows={advertisers} loading={adsLoading} emptyMessage="No advertisers found" />
        </GlassCard>
      )}
    </AppLayout>
  );
}
```

- [ ] **Step 3: Rewrite AuditLogPage**

Replace `web/src/pages/admin/AuditLogPage.tsx`. Preserve existing API calls and filter state:

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { AppLayout } from '../../components/AppLayout';
import { GlassCard, Select, Button } from '../../components/ui';
import { api } from '../../lib/api';
import { ArrowLeft } from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_name: string;
  details: unknown;
  created_at: string;
}

const ACTION_OPTIONS = ['', 'APPROVE', 'REJECT', 'SUSPEND', 'CASHBACK_ISSUED', 'FRAUD_FLAGGED'];
const ENTITY_OPTIONS = ['', 'user', 'campaign', 'cashback_transaction', 'advertiser'];

export function AuditLogPage() {
  const navigate = useNavigate();
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ['audit-log', action, entityType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (entityType) params.set('entity_type', entityType);
      const res = await api.get(`/admin/audit-log?${params}`);
      return res.data.data ?? [];
    },
  });

  return (
    <AppLayout
      title="Audit Log"
      actions={
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate({ to: '/admin' })}>
          Back
        </Button>
      }
    >
      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <Select value={action} onChange={e => setAction(e.target.value)} className="w-48">
          {ACTION_OPTIONS.map(o => <option key={o} value={o}>{o || 'All Actions'}</option>)}
        </Select>
        <Select value={entityType} onChange={e => setEntityType(e.target.value)} className="w-48">
          {ENTITY_OPTIONS.map(o => <option key={o} value={o}>{o || 'All Entities'}</option>)}
        </Select>
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['Time', 'Actor', 'Action', 'Entity', 'Details'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="py-3 px-4">
                      <div className="h-4 rounded bg-white/[0.06] animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : entries.length === 0 ? (
              <tr><td colSpan={5} className="py-16 text-center text-slate-400">No audit entries found</td></tr>
            ) : (
              entries.map(entry => (
                <>
                  <tr
                    key={entry.id}
                    onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    className="cursor-pointer hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{entry.actor_name}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs bg-white/[0.06] px-2 py-0.5 rounded text-teal-300">
                        {entry.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{entry.entity_type}/{entry.entity_id}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {expanded === entry.id ? '▲ Collapse' : '▼ Expand'}
                    </td>
                  </tr>
                  {expanded === entry.id && (
                    <tr key={`${entry.id}-detail`} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td colSpan={5} className="px-4 pb-4">
                        <pre className="font-mono text-xs text-slate-300 bg-white/[0.04] rounded-lg p-4 overflow-x-auto">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </GlassCard>
    </AppLayout>
  );
}
```

- [ ] **Step 4: TypeScript check + commit**

```bash
cd web && npx tsc --noEmit
git add web/src/pages/admin/
git commit -m "feat(web): glassmorphism Admin Dashboard + Audit Log"
```

---

## Task 11: Cleanup — Remove NavBar, Update Router + TypeScript Final Check

**Files:**
- Delete: `web/src/components/NavBar.tsx`
- Modify: `web/src/router.tsx`

- [ ] **Step 1: Delete NavBar.tsx**

Delete `web/src/components/NavBar.tsx` — it is fully replaced by AppLayout + Sidebar + Topbar.

- [ ] **Step 2: Verify no remaining NavBar imports**

```bash
cd web && grep -r "NavBar" src/
```

Expected: no matches (all pages were rewritten in previous tasks).

- [ ] **Step 3: Update router index route**

The index route in `web/src/router.tsx` currently renders FeedPage or LoginPage based on a token check. Update it to redirect to the role-appropriate route:

Replace the `indexRoute` in `web/src/router.tsx`:
```ts
import { createRouter, createRoute, createRootRoute, Outlet, redirect } from '@tanstack/react-router';
// ... all other imports remain the same ...

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const token = localStorage.getItem('access_token');
    if (!token) throw redirect({ to: '/login' });
    throw redirect({ to: '/feed' });
  },
  component: () => null,
});
```

- [ ] **Step 4: Final TypeScript check**

```bash
cd web && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Run lint**

```bash
cd web && npm run lint
```

Fix any lint warnings before committing.

- [ ] **Step 6: Start dev server — full regression pass**

```bash
cd web && npm run dev
```

Test every route manually:
- [ ] `/login` — dark bg, glass card, 3 demo pills
- [ ] Quick-login Consumer → `/feed` — sidebar shows Dashboard/Wallet/Transactions/Settings
- [ ] `/wallet` — pool cards, transaction table
- [ ] Quick-login Advertiser → `/advertiser` — KPI row, campaigns table
- [ ] `/advertiser/campaigns/new` — two-column form + live preview
- [ ] `/advertiser/analytics` — area chart + bar chart + ring
- [ ] Quick-login Admin → `/admin` — 4 tabs
- [ ] `/admin/audit-log` — filter dropdowns, expandable rows
- [ ] Sidebar collapse toggle — persists on refresh
- [ ] Logout button returns to `/login`

- [ ] **Step 7: Commit**

```bash
git add web/src/router.tsx
git rm web/src/components/NavBar.tsx
git commit -m "feat(web): complete UI overhaul — dark glassmorphism shell, all pages redesigned"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Dark glassmorphism — `#060b14` bg, frosted cards, teal/peach accents
- [x] Collapsible sidebar 240px/68px, `localStorage` persistence
- [x] Role-aware nav: Consumer, Advertiser, Admin items match spec exactly
- [x] All 9 pages redesigned (Login, Onboarding, Feed, Wallet, AdvertiserDashboard, CampaignCreate, CampaignStats, Analytics, AdminDashboard, AuditLog)
- [x] AppLayout wraps all authenticated pages; Login + Onboarding are bare
- [x] Recharts dark theme applied inline in AnalyticsDashboardPage
- [x] Component library: GlassCard, KpiCard, StatusBadge, DataTable, PageHeader, Button, Input/Select/Textarea, Skeleton, EmptyState
- [x] lucide-react icons throughout
- [x] Inter font via Google Fonts CDN
- [x] Design tokens in tailwind.config.js
- [x] Logout button in Topbar
- [x] Demo account quick-login pills on Login page

**Placeholder scan:** No TBD, TODO, or vague steps — all steps include exact code.

**Type consistency:** `TableColumn<T>` defined in DataTable.tsx and re-exported from index.ts; used identically in all pages. `AppLayoutProps.title` is `string` (required) in all usages.
