import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-10 w-full rounded-[var(--radius-md)] bg-surface px-3 text-sm text-foreground outline-none ring-1 ring-border",
          "shadow-[var(--shadow-xs)] transition duration-200 ease-out",
          "placeholder:text-muted-foreground/70",
          "hover:bg-surface-raised",
          "focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
