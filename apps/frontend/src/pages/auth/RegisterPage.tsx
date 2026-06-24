import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { organizationApi } from "../../api/services";
import { Button } from "../../components/ui/Button";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Field, TextInput, SelectInput } from "../../components/forms/FormField";
import { AuthLayout } from "../../layouts/AuthLayout";
import { useAuthStore } from "../../store/auth.store";
import { registerSchema } from "../../validators/forms";
import type { z } from "zod";

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  const defaultPlan = (searchParams.get("plan") || "FREE") as any;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      plan: ["FREE", "STARTER", "PRO", "ENTERPRISE"].includes(defaultPlan)
        ? defaultPlan
        : "FREE",
    },
  });

  const selectedPlan = watch("plan");

  const mutation = useMutation({
    mutationFn: organizationApi.register,
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      setSession(data.user, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      navigate("/dashboard");
    },
  });

  return (
    <AuthLayout>
      <form
        className="login-card"
        style={{ maxWidth: "480px" }}
        onSubmit={handleSubmit((values) => {
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
          <SelectInput
            value={selectedPlan}
            onChange={(e) => setValue("plan", e.target.value as any)}
          >
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
          <TextInput placeholder="e.g. Dr. John Doe" {...register("adminFullName")} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label="Admin Username" error={errors.adminUsername?.message}>
            <TextInput placeholder="username" {...register("adminUsername")} />
          </Field>
          <Field label="Admin Email (Optional)" error={errors.adminEmail?.message}>
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
          {mutation.isPending ? "Creating Account..." : "Register & Start Operating"}
        </Button>

        <small style={{ marginTop: "1rem", textAlign: "center" }}>
          Already have an account? <Link to="/login" style={{ color: "var(--accent-primary)" }}>Sign in here</Link>
        </small>
      </form>
    </AuthLayout>
  );
}
export default RegisterPage;
