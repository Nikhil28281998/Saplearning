# Critical Code Fix Report: Fiori App Connectivity

## Issue Diagnosis
**Symptom**: Fiori tile opens the app, but displays "Service not reachable" or behaves as if disconnected, despite Gateway service `ZCOURSES_SRV` being active.

**Root Cause Analysis**:
A "Startup Health Check" mechanism was found in `Component.js`. This code was **hardcoded** to check a non-existent service:
- **Incorrect Service**: `Z_COURSES_MAIN_SRV` (Legacy/Template value)
- **Correct Service**: `ZCOURSES_SRV` (Actual deployed service)

Because of this mismatch, the app's internal check failed (404 Not Found) and triggered a blocking error dialog, even though the actual data service was perfectly healthy.

## Fix Applied
**File**: `webapp/Component.js`
- **Correction 1**: Updated service path from `Z_COURSES_MAIN_SRV` to `ZCOURSES_SRV`.
- **Correction 2**: Updated entity set check from `TrainingsSet` to `Trainings` (matching manifest.json).

## Why This Works
1.  **Alignment**: The health check now pings the *actual* OData service defined in your `manifest.json`.
2.  **Traffic**: The check receives a `200 OK` response instead of `404 Not Found`.
3.  **UX**: The "Service not reachable" dialog is suppressed, allowing the app to render the `Trainings` list.

## Remaining Warnings
- **User Roles**: The `UserContext.js` service (`Z_COURSES_USERCTX_SRV`) is missing. The app will default to "End User" permissions (hiding "Create" buttons for Managers). This is a silent failure and won't block the app.

## Next Steps
1.  **Redeploy**: Run `npm run deploy` `cd app/z.sap.courses` to push the code fix to S/4HANA.
2.  **Clear Cache**: Use `/UI2/INVAL_CACHES` or browser cache clear.
3.  **Test**: Open the Fiori tile again.
