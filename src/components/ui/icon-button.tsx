import * as React from "react";
import { cn } from "@/lib/utils";

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-[var(--radius-md)] text-muted-foreground ring-1 ring-transparent transition duration-200 ease-out",
          "hover:bg-muted/80 hover:text-foreground hover:ring-border",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-40",
          className,
        )}
        {...props}
      />
    );
  },
);
IconButton.displayName = "IconButton";
