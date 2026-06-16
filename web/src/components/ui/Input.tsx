import { clsx } from 'clsx';
import { forwardRef } from 'react';

const baseClass = [
  'w-full bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-2.5',
  'text-slate-100 placeholder:text-slate-500 text-sm',
  'focus:outline-none focus:ring-2 focus:ring-teal-300/40 focus:border-teal-300/40',
  'transition-colors duration-150',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

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
        style={{ backgroundColor: 'rgba(15,23,42,0.9)' }}
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
