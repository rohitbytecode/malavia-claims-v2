import type { PropsWithChildren } from "react";
import { APP_CONFIG } from "../config/app";

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="auth-layout">
      <div className="auth-brand">
        <p className="eyebrow">{APP_CONFIG.ORG_NAME}</p>
        <h1>Insurance Claims Operations</h1>
        <p>
          Cashless, reimbursement, settlement and audit workflows in one
          controlled hospital platform.
        </p>
      </div>
      {children}
    </main>
  );
}
