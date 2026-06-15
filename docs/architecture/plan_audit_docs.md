# Implementation Plan: Audit Log Viewer & In-App Document Viewer

This document details the analysis and step-by-step implementation plans for:

1. **Visual Audit Log Viewer for Admins**
2. **In-App Document Viewer & PDF Rotator/Zoomer**

---

## Part 1: Visual Audit Log Viewer for Admins

### 1. Current State Analysis

- **Backend Schema (`AuditLogModel`)**: Currently tracks:
  - `module` (e.g., CLAIMS, USER, DEPOSIT)
  - `entityId` (Mongoose ObjectId of target document)
  - `action` (e.g., CREATE, UPDATE, DELETE)
  - `performedBy` (Mongoose ObjectId referencing `User`)
  - `previousData` (Mixed representation of prior state)
  - `newData` (Mixed representation of new state)
  - `timestamps` (createdAt, updatedAt)
- **Backend Endpoints**: Currently only supports fetching logs filtered strictly by a specific `entityId` or `module` (in `audit-logs.routes.ts`). No global logs dashboard exists.
- **Frontend API Layer (`auditApi`)**: Maps to entity-specific and module-specific list routes.
- **Routing restrictions**: Access to this dashboard must be restricted to users in `adminRoles` (`["SUPER_ADMIN", "ADMIN"]`).

### 2. Implementation Steps

#### A. Backend Extensions

1.  **Add General List Endpoint**:
    - Expose `GET /api/v1/audit-logs` in `audit-logs.routes.ts`.
    - Add validation using Zod to support query parameters: `page`, `limit`, `module` (optional filter), `action` (optional filter), `performedBy` (optional filter), and `search` (to search by entity ID or user names).
2.  **Controller & Repository Enhancements**:
    - Implement query parsing in `AuditLogController.getAllLogs`.
    - Query the database using `AuditLogModel.find()` with filters, sorting by `createdAt: -1` (most recent first).
    - Call `.populate("performedBy", "username fullName")` so the frontend doesn't need to do separate user lookups.
    - Implement skip-based pagination returning standard pagination metadata: `items`, `pagination: { total, page, limit, pages }`.

#### B. Frontend API Integration

1.  **Extend `auditApi`**:
    - Add `list: (params: ListParams) => unwrap<Paginated<AuditLog>>(apiClient.get("/audit-logs", { params })).then(normalized)` to `apps/frontend/src/api/services.ts`.

#### C. UI/UX Design & Components

1.  **Create `AuditLogsPage.tsx`**:
    - Layout: Left/top panel containing dropdown filters for `Module` and `Action`, an input box for searching, and date pickers.
    - Main Panel: A list or table layout displaying logs.
    - Columns: Date/Time, Performed By (User Tag), Module, Action (Status Chip), Entity ID, Actions (e.g. "View Change").
    - Implement pagination controls at the bottom.
2.  **Interactive Diff Modal / Drawer**:
    - When an administrator clicks "View Change", open a modal/drawer.
    - Show a structured metadata summary (who, when, what was changed).
    - Implement an **Inline/Split Diff Viewer** component.
    - Use a simple key-value difference comparison (looping over keys of `newData` and comparing them to `previousData`).
    - Color code additions in green (`+`) and deletions in red (`-`).
3.  **Register Route**:
    - Add the route in `AppRoutes.tsx`: `/audit-logs` element protected by `adminRoles`.
    - Update `AppLayout.tsx` navigation items list to display an "Audit Logs" entry under the "System" group visible to administrators.

---

## Part 2: In-App Document Viewer & PDF Rotator/Zoomer

### 1. Current State Analysis

- **Document Downloads**: Serving via Express `res.sendFile(filePath)` which automatically matches the file's `mimeType`.
- **Frontend Download Trigger**: `DocumentManager.tsx` has `handlePreview` which calls `documentApi.download(filename)`, creates an Object URL using `URL.createObjectURL(blob)`, and triggers a native tab open with `window.open(url, "_blank")`.

### 2. Implementation Steps

#### A. Document Overlay Modal

1.  **Create `DocumentPreviewModal.tsx`**:
    - State: `zoomLevel` (number, default `1.0`), `rotationAngle` (number, default `0`).
    - Layout: Premium backdrop overlay modal with a header toolbar and a flexible canvas body.
    - Toolbar controls:
      - Zoom In / Zoom Out (e.g. increments of 25%)
      - Rotate Left / Rotate Right (90-degree increments)
      - Download Original
      - Close Modal

#### B. Rendering Engines

1.  **Image Formats (`image/jpeg`, `image/png`)**:
    - Render inline using a standard HTML `<img>` tag.
    - Apply inline CSS styles dynamically based on state:
      ```css
      transform: rotate(${rotationAngle}deg) scale(${zoomLevel});
      transition: transform 0.2s ease-in-out;
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
      ```
2.  **PDF Formats (`application/pdf`)**:
    - _Option A (Lightweight)_: Use an `<object>` or `<iframe>` embed linking directly to the Object URL. This uses the browser's built-in PDF viewer, but browser UI features (rotation/zoom) cannot be programmatically controlled by frontend CSS wrappers.
    - _Option B (Premium Control)_: Integrate `react-pdf` (a React wrapper for Mozilla's PDF.js).
      - Render the PDF pages dynamically onto an HTML5 `<canvas>`.
      - Apply `transform: rotate(...)` and scale properties to the page container, providing absolute programmatic control over zooming and rotation.

#### C. Integration into Claim details Cockpit

1.  **Update `DocumentManager.tsx`**:
    - Replace `window.open(url, "_blank")` in `handlePreview` with state changes that set the active document to preview: `setPreviewDoc({ url, mimeType, originalName })`.
    - Conditionally render the `DocumentPreviewModal` at the bottom of the component if `previewDoc` is not null.
    - Ensure proper cleanup: revoke the Object URL (`URL.revokeObjectURL(url)`) when the modal is closed to prevent memory leaks.
