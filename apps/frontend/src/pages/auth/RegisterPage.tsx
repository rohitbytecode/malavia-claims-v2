import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { organizationApi, paymentsApi } from "../../api/services";
import { Button } from "../../components/ui/Button";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import {
  Field,
  TextInput,
  SelectInput,
} from "../../components/forms/FormField";
import { AuthLayout } from "../../layouts/AuthLayout";
import { useAuthStore } from "../../store/auth.store";
import { registerSchema } from "../../validators/forms";
import type { z } from "zod";
import { useState } from "react";

type RegisterForm = z.infer<typeof registerSchema>;

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

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  const [checkoutState, setCheckoutState] = useState<
    "form" | "pending_payment" | "verifying" | "success" | "error"
  >("form");
  const [subscriptionData, setSubscriptionData] = useState<{
    subscriptionId: string;
    status: string;
    key: string;
  } | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] =
    useState<string>("FREE");

  const defaultPlan = (searchParams.get("plan") || "FREE") as any;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      plan: ["FREE", "STARTER", "PRO", "ENTERPRISE"].includes(defaultPlan)
        ? defaultPlan
        : "FREE",
    },
  });

  const mutation = useMutation({
    mutationFn: organizationApi.register,
    onSuccess: async (data, variables) => {
      console.log("REGISTRATION SUCCESS", data, variables);
      queryClient.invalidateQueries();
      setSession(data.user, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

      const plan = data.organization?.plan || variables.plan || "FREE";
      setSelectedPlanForCheckout(plan);

      if (plan === "STARTER" || plan === "PRO") {
        setCheckoutState("pending_payment");
        try {
          console.log("CALLING createSubscription FOR PLAN:", plan);
          const res = await paymentsApi.createSubscription({ planName: plan });
          console.log("SUBSCRIPTION DATA RECEIVED:", res);
          setSubscriptionData(res);
        } catch (err: any) {
          console.error("Failed to generate subscription link", err);
          setPaymentError(
            err.message || "Failed to initiate payment. Please try again."
          );
          setCheckoutState("error");
        }
      } else {
        navigate("/dashboard");
      }
    },
  });

  const handleRazorpayCheckout = async () => {
    if (!subscriptionData) return;

    const isMock =
      subscriptionData.subscriptionId.startsWith("sub_mock_") ||
      subscriptionData.key.includes("mock");

    if (isMock) {
      console.log("Initializing Mock Payment Flow...");
      setCheckoutState("verifying");
      try {
        // Wait 1.5 seconds to simulate payment authorization delay
        await new Promise((r) => setTimeout(r, 1500));
        const res = await paymentsApi.verifySubscription({
          subscriptionId: subscriptionData.subscriptionId,
        });
        if (res.verified) {
          setCheckoutState("success");
          setTimeout(() => {
            navigate("/dashboard");
          }, 2000);
        } else {
          setPaymentError("Mock payment verification failed.");
          setCheckoutState("error");
        }
      } catch (err: any) {
        setPaymentError(err.message || "Verification failed");
        setCheckoutState("error");
      }
      return;
    }

    console.log("Initializing Real Razorpay Checkout...");
    setCheckoutState("verifying");
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setPaymentError(
        "Failed to load Razorpay payment SDK. Check your internet connection."
      );
      setCheckoutState("error");
      return;
    }

    try {
      const options = {
        key: subscriptionData.key,
        subscription_id: subscriptionData.subscriptionId,
        name: "Hospitra",
        description: `Hospitra ${selectedPlanForCheckout} Subscription`,
        handler: async function (response: any) {
          console.log(
            "Razorpay payment authorized, verifying on backend...",
            response
          );
          setCheckoutState("verifying");
          try {
            const res = await paymentsApi.verifySubscription({
              subscriptionId: subscriptionData.subscriptionId,
            });

            if (res.verified) {
              setCheckoutState("success");
              setTimeout(() => {
                navigate("/dashboard");
              }, 2000);
            } else {
              setPaymentError(
                "Payment verification failed. Please contact support."
              );
              setCheckoutState("error");
            }
          } catch (err: any) {
            setPaymentError(err.message || "Error verifying payment signature");
            setCheckoutState("error");
          }
        },
        modal: {
          ondismiss() {
            console.log("Checkout modal dismissed");
            setCheckoutState("pending_payment");
          },
        },
        theme: {
          color: "#2563EB",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      setCheckoutState("pending_payment"); // reset back while checkout modal is open
      rzp.open();
    } catch (err: any) {
      setPaymentError(err.message || "Failed to initialize Razorpay checkout");
      setCheckoutState("error");
    }
  };

  const handleRetry = () => {
    setPaymentError(null);
    if (subscriptionData) {
      setCheckoutState("pending_payment");
      handleRazorpayCheckout();
    } else {
      setCheckoutState("form");
    }
  };

  const handleCancel = () => {
    // Clear session & log out since organization is inactive/pending payment
    useAuthStore.getState().logout();
    setCheckoutState("form");
    setSubscriptionData(null);
    setPaymentError(null);
  };

  if (checkoutState !== "form") {
    return (
      <AuthLayout>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes scaleIn {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
        <div
          className="login-card"
          style={{ maxWidth: "480px", textAlign: "center", padding: "2.5rem" }}
        >
          <h2>Activate Subscription</h2>
          <p className="eyebrow" style={{ marginBottom: "1.5rem" }}>
            Hospitra {selectedPlanForCheckout} Plan
          </p>

          {checkoutState === "pending_payment" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                alignItems: "center",
              }}
            >
              <div
                className="plan-badge"
                style={{
                  background: "rgba(37, 99, 235, 0.1)",
                  color: "#2563EB",
                  padding: "0.5rem 1rem",
                  borderRadius: "9999px",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                }}
              >
                {selectedPlanForCheckout === "STARTER"
                  ? "Starter Tier — $29/mo"
                  : "Pro Tier — $99/mo"}
              </div>

              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.95rem",
                  lineHeight: "1.5",
                }}
              >
                Your Hospitra organization account has been created
                successfully! Please complete the payment to activate your
                workspace and start operating.
              </p>

              {!subscriptionData ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    width: "100%",
                    marginTop: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      border: "3px solid rgba(255, 255, 255, 0.1)",
                      borderTop: "3px solid #2563EB",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                      margin: "1rem auto",
                    }}
                  ></div>
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.9rem",
                    }}
                  >
                    Generating secure payment session...
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    width: "100%",
                    marginTop: "1.5rem",
                  }}
                >
                  <Button
                    onClick={handleRazorpayCheckout}
                    style={{ width: "100%", padding: "0.875rem" }}
                  >
                    Proceed to Payment
                  </Button>
                  <Button onClick={handleCancel} style={{ width: "100%" }}>
                    Cancel & Register Later
                  </Button>
                </div>
              )}
            </div>
          )}

          {checkoutState === "verifying" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                alignItems: "center",
                padding: "1rem",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  border: "3px solid rgba(255, 255, 255, 0.1)",
                  borderTop: "3px solid #2563EB",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "1rem auto",
                }}
              ></div>
              <h3 style={{ margin: 0 }}>Verifying Subscription</h3>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.9rem",
                  margin: 0,
                }}
              >
                Please do not close this window. We are verifying your payment
                with Razorpay secure servers...
              </p>
            </div>
          )}

          {checkoutState === "success" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                alignItems: "center",
                padding: "1rem",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.1)",
                  color: "#10B981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                  animation: "scaleIn 0.3s ease-out",
                }}
              >
                ✓
              </div>
              <h3 style={{ margin: 0, color: "#10B981" }}>
                Payment Successful!
              </h3>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.9rem",
                  margin: 0,
                }}
              >
                Your Hospitra workspace is now active. Redirecting you to the
                console dashboard...
              </p>
            </div>
          )}

          {checkoutState === "error" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                alignItems: "center",
                padding: "1rem",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#EF4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                }}
              >
                ✕
              </div>
              <h3 style={{ margin: 0, color: "#EF4444" }}>Payment Failed</h3>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.9rem",
                  margin: 0,
                }}
              >
                {paymentError ||
                  "We couldn't verify your payment. Please try again."}
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  width: "100%",
                  marginTop: "1rem",
                }}
              >
                <Button onClick={handleRetry} style={{ width: "100%" }}>
                  Retry Payment
                </Button>
                <Button onClick={handleCancel} style={{ width: "100%" }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form
        className="login-card"
        style={{ maxWidth: "480px" }}
        onSubmit={handleSubmit((values) => {
          console.log("SUBMITTING REGISTRATION FORM", values);
          mutation.mutate({
            organizationName: values.organizationName,
            adminFullName: values.adminFullName,
            adminUsername: values.adminUsername,
            adminPassword: values.adminPassword,
            adminEmail: values.adminEmail || undefined,
            plan: values.plan,
          });
        })}
      >
        <p className="eyebrow">SaaS Registration</p>
        <h2>Register Your Organization</h2>

        <Field label="Choose Pricing Plan" error={errors.plan?.message}>
          <SelectInput {...register("plan")}>
            <option value="FREE">Free Tier (100 claims/mo)</option>
            <option value="STARTER">Starter Tier ($29/mo)</option>
            <option value="PRO">Pro Tier ($99/mo)</option>
            <option value="ENTERPRISE">Enterprise Tier (Custom)</option>
          </SelectInput>
        </Field>

        <Field
          label="Organization / Hospital Name"
          error={errors.organizationName?.message}
        >
          <TextInput
            placeholder="e.g. Metro General Hospital"
            {...register("organizationName")}
          />
        </Field>

        <Field label="Admin Full Name" error={errors.adminFullName?.message}>
          <TextInput
            placeholder="e.g. Dr. John Doe"
            {...register("adminFullName")}
          />
        </Field>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          <Field label="Admin Username" error={errors.adminUsername?.message}>
            <TextInput placeholder="username" {...register("adminUsername")} />
          </Field>
          <Field
            label="Admin Email (Optional)"
            error={errors.adminEmail?.message}
          >
            <TextInput
              placeholder="admin@hospital.com"
              type="email"
              {...register("adminEmail")}
            />
          </Field>
        </div>

        <Field label="Admin Password" error={errors.adminPassword?.message}>
          <TextInput
            type="password"
            placeholder="••••••••"
            {...register("adminPassword")}
          />
        </Field>

        {mutation.isError && <ErrorPanel error={mutation.error} />}

        <Button disabled={mutation.isPending} style={{ marginTop: "1rem" }}>
          {mutation.isPending
            ? "Creating Account..."
            : "Register & Start Operating"}
        </Button>

        <small style={{ marginTop: "1rem", textAlign: "center" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--accent-primary)" }}>
            Sign in here
          </Link>
        </small>
      </form>
    </AuthLayout>
  );
}
export default RegisterPage;
