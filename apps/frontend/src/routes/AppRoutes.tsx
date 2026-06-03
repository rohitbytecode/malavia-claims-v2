import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../pages/auth/LoginPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { ClaimsListPage } from "../pages/claims/ClaimsListPage";
import { AllClaimsPage } from "../pages/claims/AllClaimsPage";
import { ClaimDetailsPage } from "../pages/claims/ClaimDetailsPage";
import { SettlementsPage } from "../pages/settlements/SettlementsPage";
import { ReportsPage } from "../pages/reports/ReportsPage";
import { AlertsPage } from "../pages/alerts/AlertsPage";
import { InsurancePage } from "../pages/insurance/InsurancePage";
import { DepartmentsPage } from "../pages/departments/DepartmentsPage";
import { UsersPage } from "../pages/users/UsersPage";
import { PatientsPage } from "../pages/patients/PatientsPage";
import { DoctorsPage } from "../pages/doctors/DoctorsPage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { AdvancedNotificationsPage } from "../pages/advanced-notifications/AdvancedNotificationsPage";
import { PastRecordsPage } from "../pages/past-records/PastRecordsPage";
import { AppLayout } from "../layouts/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import {
  adminRoles,
  accountantRoles,
  operationalRoles,
  pharmacistRoles,
} from "../constants/workflow";
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={operationalRoles}>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/claims"
        element={
          <ProtectedRoute roles={operationalRoles}>
            <AppLayout>
              <ClaimsListPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/claims/all"
        element={
          <ProtectedRoute roles={operationalRoles}>
            <AppLayout>
              <AllClaimsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients"
        element={
          <ProtectedRoute roles={operationalRoles}>
            <AppLayout>
              <PatientsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctors"
        element={
          <ProtectedRoute roles={operationalRoles}>
            <AppLayout>
              <DoctorsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/claims/:claimId"
        element={
          <ProtectedRoute roles={operationalRoles}>
            <AppLayout>
              <ClaimDetailsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settlements"
        element={
          <ProtectedRoute roles={accountantRoles}>
            <AppLayout>
              <SettlementsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute roles={operationalRoles}>
            <AppLayout>
              <AlertsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute roles={operationalRoles}>
            <AppLayout>
              <ReportsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/insurance"
        element={
          <ProtectedRoute roles={pharmacistRoles}>
            <AppLayout>
              <InsurancePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments"
        element={
          <ProtectedRoute roles={pharmacistRoles}>
            <AppLayout>
              <DepartmentsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute roles={adminRoles}>
            <AppLayout>
              <UsersPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/advanced-notifications"
        element={
          <ProtectedRoute roles={["SUPER_ADMIN"]}>
            <AppLayout>
              <AdvancedNotificationsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/past-records"
        element={
          <ProtectedRoute roles={["SUPER_ADMIN"]}>
            <AppLayout>
              <PastRecordsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute roles={operationalRoles}>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
