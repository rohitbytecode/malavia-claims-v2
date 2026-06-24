import { useState } from "react";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, TextInput } from "../../components/forms/FormField";
import { useUiStore } from "../../store/ui.store";
import { useAuthStore } from "../../store/auth.store";
import { authApi } from "../../api/services";
import { APP_CONFIG } from "../../config/app";

export function SettingsPage() {
  const { theme, toggleTheme } = useUiStore();
  const logout = useAuthStore((s) => s.logout);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsPending(true);
    try {
      await authApi.changePassword({ oldPassword, newPassword });
      setSuccess(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Delay logout to let user see success message
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to change password."
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="page-title">
        <p className="eyebrow">Operator preferences</p>
        <h1>Settings</h1>
        <span>Local workstation preferences persist across sessions.</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
        }}
      >
        <Card>
          <CardHeader title="Theme" eyebrow="Clinical light / premium dark" />
          <div className="card-pad" style={{ display: "grid", gap: "12px" }}>
            <p>
              Current theme: <strong>{theme}</strong>
            </p>
            <Button onClick={toggleTheme}>Switch theme</Button>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Change Password"
            eyebrow="Update your account credentials"
          />
          <form
            onSubmit={handleSubmit}
            className="card-pad"
            style={{ display: "grid", gap: "16px" }}
          >
            {error && (
              <div
                className="alert alert-danger"
                style={{
                  color: "var(--red, #ef4444)",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  padding: "10px",
                  borderRadius: "4px",
                  fontSize: "0.9em",
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="alert alert-success"
                style={{
                  color: "var(--green, #10b981)",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  padding: "10px",
                  borderRadius: "4px",
                  fontSize: "0.9em",
                }}
              >
                Password changed successfully! Logging you out...
              </div>
            )}

            <Field label="Current Password">
              <TextInput
                required
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={isPending || success}
              />
            </Field>

            <Field label="New Password">
              <TextInput
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isPending || success}
              />
            </Field>

            <Field label="Confirm New Password">
              <TextInput
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isPending || success}
              />
            </Field>

            <Button disabled={isPending || success}>
              {isPending ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Card>
      </div>

      <div style={{ marginTop: "32px", opacity: 0.95 }}>
        <Card>
          <div
            className="card-pad"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              alignItems: "center",
              textAlign: "center",
              borderTop: "2px solid var(--amber, #f59e0b)",
              borderRadius: "4px",
              padding: "24px 16px",
            }}
          >
            <span
              style={{
                fontSize: "0.75em",
                textTransform: "uppercase",
                letterSpacing: "2px",
                color: "var(--amber, #f59e0b)",
                fontWeight: "700",
              }}
            >
              Proprietary System & Creator Attribution
            </span>
            <p
              style={{
                fontSize: "0.95em",
                lineHeight: "1.6",
                maxWidth: "680px",
                margin: "12px 0 6px 0",
              }}
            >
              This software is built by{" "}
              <strong
                style={{
                  color: "var(--amber, #f59e0b)",
                  fontSize: "1.1em",
                  letterSpacing: "0.5px",
                  textShadow: "0 0 1px rgba(245, 158, 11, 0.2)",
                }}
              >
                Rohit More
              </strong>
              <span
                style={{
                  display: "block",
                  fontSize: "0.8em",
                  fontStyle: "normal",
                  color: "var(--text-muted, #888)",
                  marginTop: "4px",
                  marginBottom: "8px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                }}
              >
                -The System Architect —
              </span>
              solely for <strong>{APP_CONFIG.ORG_NAME}</strong> internal use.
              Any unauthorized reproduction, distribution, reverse engineering,
              or duplication of this platform is strictly prohibited.
            </p>
            <span
              suppressHydrationWarning
              style={{
                fontSize: "0.75em",
                color: "var(--text-muted, #666)",
              }}
            >
              © {new Date().getFullYear()} {APP_CONFIG.ORG_NAME}. All Rights
              Reserved.
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
