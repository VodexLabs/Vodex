import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "accent"
  | "destructive";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-background shadow-[var(--shadow-sm)] hover:brightness-[0.97] active:brightness-[0.93] dark:hover:brightness-110",
  accent:
    "bg-accent text-accent-foreground shadow-[var(--shadow-sm)] hover:brightness-[1.03] active:brightness-[0.97]",
  secondary:
    "bg-surface text-foreground shadow-[var(--shadow-xs)] ring-1 ring-border hover:bg-surface-raised active:bg-muted",
  outline:
    "bg-transparent text-foreground ring-1 ring-border hover:bg-muted/60 active:bg-muted",
  ghost:
    "bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground active:bg-muted",
  destructive:
    "bg-red-500/10 text-red-600 ring-1 ring-red-500/20 hover:bg-red-500/15 dark:text-red-400",
};

const sizeClass: Record<ButtonSize, string> = {
  xs: "h-7 gap-1 rounded-[var(--radius-sm)] px-2.5 text-[12px] font-medium",
  sm: "h-8 gap-1.5 rounded-[var(--radius-sm)] px-3 text-[13px] font-medium",
  md: "h-9 gap-2 rounded-[var(--radius-md)] px-3.5 text-[13px] font-medium",
  lg: "h-10 gap-2 rounded-[var(--radius-md)] px-4 text-sm font-medium",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      type = "button",
      disabled,
      asChild = false,
      children,
      ...props
    },
    ref,
  ) => {
    const classes = cn(
      "inline-flex select-none cursor-pointer items-center justify-center whitespace-nowrap outline-none transition duration-150 ease-out",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "active:scale-[0.97]",
      "disabled:pointer-events-none disabled:opacity-45",
      variantClass[variant],
      sizeClass[size],
      className,
    );

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(
        children as React.ReactElement<{ className?: string }>,
        { className: cn(classes, (children.props as { className?: string }).className) },
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={classes}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
