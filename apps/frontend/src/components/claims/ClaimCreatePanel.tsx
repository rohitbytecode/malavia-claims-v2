import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import type { z } from "zod";

import { claimsApi } from "../../api/services";
import { claimTypes } from "../../constants/workflow";
import { Field, SelectInput, TextArea, TextInput } from "../forms/FormField";
import { Button } from "../ui/Button";
import { useAuthStore } from "../../store/auth.store";
import { claimSchema } from "../../validators/forms";

type ClaimFormInput = z.input<typeof claimSchema>;
type ClaimFormOutput = z.output<typeof claimSchema>;

export function ClaimCreatePanel() {
  const user = useAuthStore((s) => s.user);

  const navigate = useNavigate();
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ClaimFormInput, unknown, ClaimFormOutput>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      type: "CASHLESS",
      totalClaimAmount: 0,
    },
  });

  const mutation = useMutation({
    mutationFn: claimsApi.create,
    onSuccess: (claim) => {
      if (!claim?.id) {
        console.error("Missing claim id", claim);
        return;
      }

      qc.invalidateQueries({
        queryKey: ["claims"],
      });

      reset();

      navigate(`/claims/${claim.id}`);
    },
  });

  return (
    <form
      className="quick-form"
      onSubmit={handleSubmit((values) =>
        mutation.mutate({
          ...values,
          createdBy: user?._id,
        })
      )}
    >
      <h3>Fast claim entry</h3>

      <div className="form-grid">
        <Field label="Type" error={errors.type?.message}>
          <SelectInput {...register("type")}>
            {claimTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Patient ID" error={errors.patientId?.message}>
          <TextInput {...register("patientId")} />
        </Field>

        <Field label="Insurer ID">
          <TextInput {...register("insuranceCompanyId")} />
        </Field>

        <Field label="Hospital ID" error={errors.hospitalId?.message}>
          <TextInput {...register("hospitalId")} />
        </Field>

        <Field label="Department ID">
          <TextInput {...register("departmentId")} />
        </Field>

        <Field label="Claim amount" error={errors.totalClaimAmount?.message}>
          <TextInput type="number" {...register("totalClaimAmount")} />
        </Field>

        <Field label="Deposit amount">
          <TextInput type="number" {...register("depositAmount")} />
        </Field>

        <Field label="Remarks">
          <TextArea {...register("remarks")} />
        </Field>
      </div>

      <Button disabled={mutation.isPending}>
        {mutation.isPending ? "Creating..." : "Create claim"}
      </Button>
    </form>
  );
}
