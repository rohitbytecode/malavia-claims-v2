import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../../lib/cn";
type Variant = "primary" | "secondary" | "danger" | "ghost";
export function Button({
  children,
  className,
  disabled,
  variant = "primary",
  ...props
}: PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>) {
  return (
    <button
      className={cn(
        "btn",
        `btn-${variant}`,
        disabled && "btn-disabled",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
