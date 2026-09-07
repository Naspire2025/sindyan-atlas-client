import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'medium' | 'small';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  children?: ReactNode;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: 'border-acid-lime bg-acid-lime text-acid-lime-text hover:bg-acid-lime-hover',
  secondary: 'border-graphite bg-transparent text-mist hover:border-smoke hover:bg-white/[0.035] hover:text-paper',
  danger: 'border-coral-red bg-coral-red text-paper hover:bg-[#f07070]',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  medium: 'min-h-[36px] px-[13px] py-2 text-[13px]',
  small: 'min-h-[24px] px-2 py-1 text-[11px]',
};

const ICON_SIZE: Record<ButtonSize, number> = {
  medium: 14,
  small: 12,
};

export default function Button({
  variant = 'secondary',
  size = 'medium',
  icon: Icon,
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-control border font-[510] transition duration-[140ms] enabled:active:translate-y-px disabled:cursor-not-allowed ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
      {...rest}
    >
      {Icon && <Icon size={ICON_SIZE[size]} />}
      {children}
    </button>
  );
}