import { useState } from "react";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, TextInput } from "../../components/forms/FormField";
import { useUiStore } from "../../store/ui.store";
import { useAuthStore } from "../../store/auth.store";
import { authApi, paymentsApi } from "../../api/services";
import { APP_CONFIG } from "../../config/app";
import { useQuery } from "@tanstack/react-query";

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function SettingsPage() {
  const { theme, toggleTheme } = useUiStore();
  const logout = useAuthStore((s) => s.logout);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Billing and upgrade state
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradePending, setUpgradePending] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const { data: billingData, isLoading, refetch: refetchBilling } = useQuery({
    queryKey: ["subscriptionStatus"],
    queryFn: paymentsApi.getSubscriptionStatus,
  });

  // Calculate usage and limit with client-side fallback if backend lacks them (e.g. during deployments)
  const usage = billingData?.usage ?? 0;
  const limit = billingData?.limit !== undefined && billingData?.limit !== null ? billingData.limit : (
    billingData?.plan === "FREE" ? 100 :
    billingData?.plan === "STARTER" ? 1000 :
    billingData?.plan === "PRO" ? 5000 : -1
  );

  const triggerUpgradeFlow = async (planName: string) => {
    setUpgradePending(true);
    setUpgradeError(null);
    try {
      const res = await paymentsApi.createSubscription({ planName });
      const isMock = res.subscriptionId.startsWith("sub_mock_") || res.key.includes("mock");

      if (isMock) {
        console.log("Mock upgrade flow starting...");
        await new Promise((r) => setTimeout(r, 1500));
        const verifyRes = await paymentsApi.verifySubscription({ subscriptionId: res.subscriptionId });
        if (verifyRes.verified) {
          refetchBilling();
          setIsUpgrading(false);
        } else {
          setUpgradeError("Mock subscription upgrade verification failed.");
        }
        setUpgradePending(false);
        return;
      }

      console.log("Real upgrade flow starting...");
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setUpgradeError("Failed to load Razorpay payment SDK.");
        setUpgradePending(false);
        return;
      }

      const options = {
        key: res.key,
        subscription_id: res.subscriptionId,
        name: "Hospitra",
        description: `Upgrade to ${planName} Plan`,
        handler: async function (_response: any) {
          try {
            const verifyRes = await paymentsApi.verifySubscription({
              subscriptionId: res.subscriptionId
            });

            if (verifyRes.verified) {
              refetchBilling();
              setIsUpgrading(false);
            } else {
              setUpgradeError("Payment verification failed.");
            }
          } catch (err: any) {
            setUpgradeError(err.message || "Verification failed");
          } finally {
            setUpgradePending(false);
          }
        },
        modal: {
          ondismiss() {
            setUpgradePending(false);
          }
        },
        theme: {
          color: "#2563EB"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setUpgradeError(err.message || "Failed to initiate upgrade.");
      setUpgradePending(false);
    }
  };

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
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
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
            title="Subscription & Limits"
            eyebrow="Manage workspace plan and claim usage"
          />
          <div className="card-pad" style={{ display: "grid", gap: "16px" }}>
            {isLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                <div style={{
                  width: "24px",
                  height: "24px",
                  border: "2px solid rgba(255, 255, 255, 0.1)",
                  borderTop: "2px solid #2563EB",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }}></div>
              </div>
            ) : billingData ? (
              <>
                {upgradeError && (
                  <div style={{
                    color: "#EF4444",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    padding: "10px",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                  }}>
                    {upgradeError}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Current Plan</span>
                    <h3 style={{ margin: "4px 0 0 0", display: "flex", alignItems: "center", gap: "8px" }}>
                      {billingData.plan}
                      <span style={{
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        background: billingData.isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: billingData.isActive ? "#10B981" : "#EF4444",
                        fontWeight: 600
                      }}>
                        {billingData.isActive ? "Active" : "Inactive"}
                      </span>
                    </h3>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Expires On</span>
                    <p style={{ margin: "4px 0 0 0", fontWeight: 600 }}>
                      {billingData.expiresAt ? new Date(billingData.expiresAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : "N/A"}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Monthly Claims Usage</span>
                    <span style={{ fontWeight: 600 }}>
                      {usage} / {limit === -1 ? "Unlimited" : limit}
                    </span>
                  </div>

                  {limit !== -1 ? (
                    <div style={{
                      width: "100%",
                      height: "8px",
                      background: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "9999px",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        width: `${Math.min(100, (usage / limit) * 100)}%`,
                        height: "100%",
                        background: (usage / limit) > 0.9 
                          ? "#EF4444" 
                          : (usage / limit) > 0.7 
                          ? "#F59E0B" 
                          : "linear-gradient(90deg, #2563EB, #3B82F6)",
                        borderRadius: "9999px",
                        transition: "width 0.4s ease-out"
                      }}></div>
                    </div>
                  ) : (
                    <div style={{
                      width: "100%",
                      height: "8px",
                      background: "linear-gradient(90deg, #10B981, #34D399)",
                      borderRadius: "9999px"
                    }}></div>
                  )}
                </div>

                {billingData.plan !== "PRO" && (
                  <div style={{ marginTop: "12px" }}>
                    {isUpgrading ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          {billingData.plan === "FREE" && (
                            <Button 
                              onClick={() => triggerUpgradeFlow("STARTER")} 
                              style={{ background: "#2563EB", color: "#FFF" }}
                              disabled={upgradePending}
                            >
                              {upgradePending ? "Processing..." : "Starter ($29/mo)"}
                            </Button>
                          )}
                          <Button 
                            onClick={() => triggerUpgradeFlow("PRO")} 
                            style={{ background: "linear-gradient(135deg, #7C3AED, #2563EB)", color: "#FFF" }}
                            disabled={upgradePending}
                          >
                            {upgradePending ? "Processing..." : "Pro ($99/mo)"}
                          </Button>
                        </div>
                        <Button variant="ghost" onClick={() => setIsUpgrading(false)} disabled={upgradePending}>Cancel</Button>
                      </div>
                    ) : (
                      <Button onClick={() => setIsUpgrading(true)} style={{ width: "100%" }}>
                        Upgrade Subscription
                      </Button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: "var(--text-secondary)" }}>Failed to load subscription details.</p>
            )}
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
export default SettingsPage;
