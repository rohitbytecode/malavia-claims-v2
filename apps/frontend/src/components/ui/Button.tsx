import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../../lib/cn";
type Variant = "primary" | "secondary" | "danger" | "success" | "ghost";
export function Button({
  children,
  className,
  disabled,
  variant = "primary",
  type = "submit",
  ...props
}: PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>) {
  return (
    <button
      type={type}
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
