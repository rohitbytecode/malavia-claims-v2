import type { PropsWithChildren } from "react";
import { cn } from "../../lib/cn";
export function Card({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return <section className={cn("card", className)}>{children}</section>;
}
export function CardHeader({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
