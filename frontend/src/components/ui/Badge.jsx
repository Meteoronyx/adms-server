const variantStyles = {
  default: 'bg-[#e8eaed] text-[#353736] border-border',
  accent: 'bg-[#e3f1f4] text-[#124957] border-[#b8dce4]',
  indigo: 'bg-[#e3f1f4] text-[#124957] border-[#b8dce4]',
  success: 'bg-[#dcfae5] text-[#04250e] border-[#a7ebb9]',
  warning: 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]',
  danger: 'bg-[#ffedea] text-[#831c1e] border-[#f9c6c0]',
  neutral: 'bg-raised text-muted border-border',
};

const sizeStyles = {
  sm: 'text-xs px-2 h-5 font-medium',
  md: 'text-xs px-2.5 h-6 font-medium',
  lg: 'text-sm px-3 h-7 font-medium',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  icon: Icon,
  className = '',
  ...props
}) {
  const baseStyle = 'inline-flex items-center gap-1.5 rounded-[4px] border transition-colors select-none whitespace-nowrap flex-none';
  const variantStyle = variantStyles[variant] || variantStyles.default;
  const sizeStyle = sizeStyles[size] || sizeStyles.sm;

  return (
    <span className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`} {...props}>
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      {children}
    </span>
  );
}
