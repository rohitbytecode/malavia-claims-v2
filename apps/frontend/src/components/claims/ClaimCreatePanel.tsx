import { useEffect, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import type { z } from "zod";

import {
  claimsApi,
  patientApi,
  departmentApi,
  insuranceApi,
  doctorApi,
} from "../../api/services";
import { claimTypes } from "../../constants/workflow";
import { Field, SelectInput, TextArea, TextInput } from "../forms/FormField";
import { Button } from "../ui/Button";
import { ErrorPanel } from "../ui/ErrorPanel";
import { useAuthStore } from "../../store/auth.store";
import { claimSchema } from "../../validators/forms";

type ClaimFormInput = z.input<typeof claimSchema>;
type ClaimFormOutput = z.output<typeof claimSchema>;

export function ClaimCreatePanel() {
  const user = useAuthStore((s) => s.user);

  const navigate = useNavigate();
  const qc = useQueryClient();

  const [patientSearch, setPatientSearch] = useState("");
  const debouncedSearch = useDebounce(patientSearch, 300);

  const patientQuery = useQuery({
    queryKey: ["patients", "search", debouncedSearch],
    queryFn: () => patientApi.list({ search: debouncedSearch, limit: 20 }),
    enabled: debouncedSearch.length >= 2,
  });

  type Patient = NonNullable<typeof patientQuery.data>["data"][number];

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const departmentsQuery = useQuery({
    queryKey: ["departments", "active"],
    queryFn: () => departmentApi.list({ isActive: true, limit: 100 }),
  });

  const insuranceQuery = useQuery({
    queryKey: ["insurance", "active"],
    queryFn: () => insuranceApi.list({ isActive: true, limit: 100 }),
  });

  const doctorsQuery = useQuery({
    queryKey: ["doctors", "active"],
    queryFn: () => doctorApi.list({ isActive: true, limit: 100 }),
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
      doctorId: "",
    },
  });

  const watchedPatientId = watch("patientId");

  useEffect(() => {
    if (selectedPatient) {
      const insurerIdVal =
        typeof selectedPatient.insuranceCompany === "object" &&
        selectedPatient.insuranceCompany
          ? selectedPatient.insuranceCompany._id
          : selectedPatient.insuranceCompanyId || "";

      setValue("insuranceCompanyId", insurerIdVal);
      setValue("insurerId", selectedPatient.insurerId || "");
    } else {
      setValue("insuranceCompanyId", "");
      setValue("insurerId", "");
    }
  }, [selectedPatient, setValue]);

  const watchedDoctorId = watch("doctorId");

  const selectedDoctor = doctorsQuery.data?.data?.find(
    (d) => (d.id || d._id) === watchedDoctorId
  );

  useEffect(() => {
    if (selectedDoctor) {
      const deptIdVal =
        typeof selectedDoctor.department === "object" &&
        selectedDoctor.department
          ? selectedDoctor.department._id
          : selectedDoctor.departmentId || "";
      setValue("departmentId", deptIdVal);
    } else {
      setValue("departmentId", "");
    }
  }, [selectedDoctor, setValue]);

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
      setPatientSearch("");
      setSelectedPatient(null);
      setShowDropdown(false);
      navigate(`/claims/${claim.id}`);
    },
  });

  const [showDropdown, setShowDropdown] = useState(false);

  const isPharmacist = user?.role === "PHARMACIST";
  if (isPharmacist) {
    return (
      <div className="quick-form">
        <h3>Fast claim entry</h3>
        <p>Pharmacists are not allowed to create claims.</p>
      </div>
    );
  }

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
          <TextInput
            placeholder="Type Patient ID or name..."
            value={patientSearch}
            onChange={(e) => {
              setPatientSearch(e.target.value);
              setShowDropdown(true);
              if (watchedPatientId) {
                setValue("patientId", "");
                setSelectedPatient(null);
              }
            }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          />
          {showDropdown &&
            patientQuery.data?.data &&
            patientSearch.length >= 2 && (
              <ul className="search-dropdown">
                {patientQuery.data.data.map((p) => (
                  <li
                    key={p.id || p._id}
                    onClick={() => {
                      setValue("patientId", p.patientId);
                      setPatientSearch(`${p.patientId} - ${p.name}`);
                      setSelectedPatient(p);
                      setShowDropdown(false);
                    }}
                  >
                    {p.patientId} - {p.name}
                  </li>
                ))}
              </ul>
            )}
          <input type="hidden" {...register("patientId")} />
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
            value={selectedPatient ? selectedPatient.insurerId || "—" : ""}
            placeholder="Selected patient insurer ID..."
          />
        </Field>

        <Field
          label="Insurance Company"
          error={errors.insuranceCompanyId?.message}
        >
          <TextInput
            readOnly
            disabled
            value={
              selectedPatient
                ? typeof selectedPatient.insuranceCompany === "object" &&
                  selectedPatient.insuranceCompany
                  ? selectedPatient.insuranceCompany.name
                  : (insuranceQuery.data?.data?.find(
                      (ins) => ins._id === watch("insuranceCompanyId")
                    )?.name ?? "")
                : ""
            }
            placeholder="Auto-filled from selected patient..."
          />
        </Field>

        <Field label="Doctor" error={errors.doctorId?.message}>
          <SelectInput {...register("doctorId")} defaultValue="">
            <option value="">Select doctor...</option>
            {doctorsQuery.data?.data?.map((doc) => (
              <option key={doc.id || doc._id} value={doc.id || doc._id}>
                Dr. {doc.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Department" error={errors.departmentId?.message}>
          <TextInput
            readOnly
            disabled
            value={
              selectedDoctor
                ? typeof selectedDoctor.department === "object" &&
                  selectedDoctor.department
                  ? selectedDoctor.department.name
                  : (departmentsQuery.data?.data?.find(
                      (d) => d._id === watch("departmentId")
                    )?.name ?? "")
                : ""
            }
            placeholder="Auto-filled from selected doctor..."
          />
        </Field>

        <Field label="Deposit amount">
          <TextInput type="number" {...register("depositAmount")} />
        </Field>

        <Field label="Remarks">
          <TextArea {...register("remarks")} />
        </Field>
      </div>

      {mutation.isError && (
        <div style={{ margin: "1rem 0", width: "100%" }}>
          <ErrorPanel error={mutation.error} />
          {String((mutation.error as any)?.response?.data?.message || "").toLowerCase().includes("limit") && (
            <div style={{
              marginTop: "0.75rem",
              background: "rgba(37, 99, 235, 0.1)",
              border: "1px solid rgba(37, 99, 235, 0.2)",
              padding: "1rem",
              borderRadius: "6px",
              textAlign: "center"
            }}>
              <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", color: "var(--text-primary)" }}>
                Upgrade your subscription to Starter or Pro to continue creating more claims.
              </p>
              <Button type="button" onClick={() => navigate("/settings")} style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                Upgrade Now
              </Button>
            </div>
          )}
        </div>
      )}

      <Button disabled={mutation.isPending || isPharmacist}>
        {isPharmacist
          ? "Pharmacist not allowed to create claims"
          : mutation.isPending
            ? "Creating..."
            : "Create claim"}
      </Button>
    </form>
  );
}
