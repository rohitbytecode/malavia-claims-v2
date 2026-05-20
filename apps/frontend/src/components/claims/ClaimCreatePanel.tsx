import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import type { z } from "zod";

import { claimsApi, patientApi, departmentApi, insuranceApi } from "../../api/services";
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

  const patientsQuery = useQuery({
    queryKey: ["patients", "active"],
    queryFn: () => patientApi.list({ isActive: true, limit: 100 }),
  });

  const departmentsQuery = useQuery({
    queryKey: ["departments", "active"],
    queryFn: () => departmentApi.list({ isActive: true, limit: 100 }),
  });

  const insuranceQuery = useQuery({
    queryKey: ["insurance", "active"],
    queryFn: () => insuranceApi.list({ isActive: true, limit: 100 }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ClaimFormInput, unknown, ClaimFormOutput>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      type: "CASHLESS",
      totalClaimAmount: 0,
      patientId: "",
      insurerId: "",
      insuranceCompanyId: "",
      departmentId: "",
    },
  });

  const watchedPatientId = watch("patientId");

  const selectedPatient = patientsQuery.data?.data?.find(
    (p) => p.patientId === watchedPatientId
  );

  useEffect(() => {
    if (selectedPatient) {
      const insurerIdVal = typeof selectedPatient.insuranceCompany === "object" && selectedPatient.insuranceCompany
        ? selectedPatient.insuranceCompany._id
        : selectedPatient.insuranceCompanyId || "";
      
      setValue("insuranceCompanyId", insurerIdVal);
      setValue("insurerId", selectedPatient.insurerId || "");
    } else {
      setValue("insuranceCompanyId", "");
      setValue("insurerId", "");
    }
  }, [selectedPatient, setValue]);

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
          <SelectInput {...register("patientId")} defaultValue="">
            <option value="" disabled>Select patient...</option>
            {patientsQuery.data?.data?.map((p) => (
              <option key={p.id || p._id} value={p.patientId}>
                {p.patientId} - {p.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Patient Name">
          <TextInput
            readOnly
            disabled
            value={selectedPatient ? selectedPatient.name : ""}
            placeholder="Selected patient name..."
          />
        </Field>

        <Field label="Insurer ID">
          <TextInput
            readOnly
            disabled
            value={selectedPatient ? (selectedPatient.insurerId || "—") : ""}
            placeholder="Selected patient insurer ID..."
          />
        </Field>

        <Field label="Insurance Company" error={errors.insuranceCompanyId?.message}>
          <SelectInput {...register("insuranceCompanyId")} defaultValue="">
            <option value="">Select insurance company...</option>
            {insuranceQuery.data?.data?.map((ins) => (
              <option key={ins._id} value={ins._id}>
                {ins.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Department ID" error={errors.departmentId?.message}>
          <SelectInput {...register("departmentId")} defaultValue="">
            <option value="">Select department...</option>
            {departmentsQuery.data?.data?.map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </SelectInput>
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
