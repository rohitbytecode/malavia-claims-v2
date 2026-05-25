import React from "react";

interface ReportFiltersProps {
  reportMode: "monthly" | "calendar" | "financial" | "custom";
  setReportMode: (
    mode: "monthly" | "calendar" | "financial" | "custom"
  ) => void;
  monthlyYear: number;
  setMonthlyYear: (y: number) => void;
  monthlyMonth: number;
  setMonthlyMonth: (m: number) => void;
  calendarYear: number;
  setCalendarYear: (y: number) => void;
  financialYear: number;
  setFinancialYear: (y: number) => void;
  startYear: number;
  setStartYear: (y: number) => void;
  startMonth: number;
  setStartMonth: (m: number) => void;
  endYear: number;
  setEndYear: (y: number) => void;
  endMonth: number;
  setEndMonth: (m: number) => void;
  patientInput: string;
  setPatientInput: (input: string) => void;
  onSearchPatient: (id: string) => void;
  now: Date;
  children?: React.ReactNode;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  reportMode,
  setReportMode,
  monthlyYear,
  setMonthlyYear,
  monthlyMonth,
  setMonthlyMonth,
  calendarYear,
  setCalendarYear,
  financialYear,
  setFinancialYear,
  startYear,
  setStartYear,
  startMonth,
  setStartMonth,
  endYear,
  setEndYear,
  endMonth,
  setEndMonth,
  patientInput,
  setPatientInput,
  onSearchPatient,
  now,
  children,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearchPatient(patientInput.trim());
    }
  };

  const handleSearchClick = () => {
    onSearchPatient(patientInput.trim());
  };

  return (
    <section
      className="filter-bar"
      style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}
    >
      <label
        className="field"
        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <span
          style={{
            whiteSpace: "nowrap",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-tertiary)",
          }}
        >
          Report Period Type
        </span>
        <select
          className="input"
          value={reportMode}
          onChange={(e) => setReportMode(e.target.value as any)}
          style={{ width: 140 }}
        >
          <option value="monthly">Monthly</option>
          <option value="calendar">Calendar Year</option>
          <option value="financial">Financial Year</option>
          <option value="custom">Custom Months</option>
        </select>
      </label>

      {reportMode === "monthly" && (
        <>
          <label
            className="field"
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <span
              style={{
                whiteSpace: "nowrap",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-tertiary)",
              }}
            >
              Year
            </span>
            <input
              className="input"
              type="number"
              style={{ width: 90 }}
              value={monthlyYear}
              onChange={(e) => setMonthlyYear(Number(e.target.value))}
            />
          </label>

          <label
            className="field"
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <span
              style={{
                whiteSpace: "nowrap",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-tertiary)",
              }}
            >
              Month
            </span>
            <input
              className="input"
              type="number"
              min={1}
              max={12}
              style={{ width: 70 }}
              value={monthlyMonth}
              onChange={(e) => setMonthlyMonth(Number(e.target.value))}
            />
          </label>
        </>
      )}

      {reportMode === "calendar" && (
        <label
          className="field"
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <span
            style={{
              whiteSpace: "nowrap",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-tertiary)",
            }}
          >
            Calendar Year
          </span>
          <input
            className="input"
            type="number"
            style={{ width: 90 }}
            value={calendarYear}
            onChange={(e) => setCalendarYear(Number(e.target.value))}
          />
        </label>
      )}

      {reportMode === "financial" && (
        <label
          className="field"
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <span
            style={{
              whiteSpace: "nowrap",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-tertiary)",
            }}
          >
            Financial Year
          </span>
          <select
            className="input"
            value={financialYear}
            onChange={(e) => setFinancialYear(Number(e.target.value))}
            style={{ width: 120 }}
          >
            {[0, 1, 2, 3, 4].map((offset) => {
              const yearVal = now.getFullYear() - offset;
              return (
                <option key={yearVal} value={yearVal}>
                  {yearVal}-{((yearVal + 1) % 100).toString().padStart(2, "0")}
                </option>
              );
            })}
          </select>
        </label>
      )}

      {reportMode === "custom" && (
        <>
          <label
            className="field"
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <span
              style={{
                whiteSpace: "nowrap",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-tertiary)",
              }}
            >
              From
            </span>
            <input
              className="input"
              type="number"
              min={1}
              max={12}
              style={{ width: 50 }}
              value={startMonth}
              onChange={(e) => setStartMonth(Number(e.target.value))}
              placeholder="MM"
            />
            <input
              className="input"
              type="number"
              style={{ width: 75 }}
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              placeholder="YYYY"
            />
          </label>

          <label
            className="field"
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <span
              style={{
                whiteSpace: "nowrap",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-tertiary)",
              }}
            >
              To
            </span>
            <input
              className="input"
              type="number"
              min={1}
              max={12}
              style={{ width: 50 }}
              value={endMonth}
              onChange={(e) => setEndMonth(Number(e.target.value))}
              placeholder="MM"
            />
            <input
              className="input"
              type="number"
              style={{ width: 75 }}
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              placeholder="YYYY"
            />
          </label>
        </>
      )}

      <div
        style={{ display: "flex", gap: 8, flex: "1 1 240px", maxWidth: 360 }}
      >
        <input
          className="input"
          placeholder="Patient ID for summary"
          value={patientInput}
          onChange={(e) => setPatientInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="btn btn-secondary"
          type="button"
          onClick={handleSearchClick}
        >
          Search
        </button>
      </div>

      {children}
    </section>
  );
};
