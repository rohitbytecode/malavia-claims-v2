import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/services";
import { Button } from "../../components/ui/Button";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Field, TextInput } from "../../components/forms/FormField";
import { AuthLayout } from "../../layouts/AuthLayout";
import { useAuthStore } from "../../store/auth.store";
import { loginSchema } from "../../validators/forms";
import type { z } from "zod";
type LoginForm = z.infer<typeof loginSchema>;
export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ user, accessToken, refreshToken }) => {
      setSession(user, { accessToken, refreshToken });
      navigate("/dashboard");
    },
  });
  return (
    <AuthLayout>
      <form
        className="login-card"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <p className="eyebrow">Secure JWT Login</p>
        <h2>Operator sign in</h2>
        <Field label="Email" error={errors.email?.message}>
          <TextInput type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <TextInput
            type="password"
            autoComplete="current-password"
            {...register("password")}
          />
        </Field>
        {mutation.isError && <ErrorPanel error={mutation.error} />}
        <Button disabled={mutation.isPending}>
          {mutation.isPending
            ? "Authenticating..."
            : "Enter operations console"}
        </Button>
        <small>
          Access is role-based and all critical workflow actions require an
          audit trail.
        </small>
      </form>
    </AuthLayout>
  );
}
