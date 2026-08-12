import React from 'react';

const variantStyles = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
  danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
  neutral: 'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-slate-200/40 dark:border-slate-800/60',
};

const sizeStyles = {
  sm: 'text-[11px] px-2 py-0.5 font-medium',
  md: 'text-xs px-2.5 py-1 font-semibold',
  lg: 'text-sm px-3 py-1.5 font-semibold',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  icon: Icon,
  className = '',
  ...props
}) {
  const baseStyle = 'inline-flex items-center gap-1.5 rounded-lg border transition-colors select-none';
  const variantStyle = variantStyles[variant] || variantStyles.default;
  const sizeStyle = sizeStyles[size] || sizeStyles.sm;

  return (
    <span className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`} {...props}>
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      {children}
    </span>
  );
}
