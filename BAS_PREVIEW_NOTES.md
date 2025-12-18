# BAS Preview Working Baseline and Navigation

This app uses SAP Fiori Elements (ListReport/ObjectPage) with a FlexibleColumnLayout (FCL).

Working baseline for BAS Project Preview:
- manifest.json: `_version: 1.60.0`
- Root view: `sap.fe.templates.RootContainer.view.Fcl` with `id: appRootView`
- Routing: do not set `routing.config.controlId` (FE wires router → FCL)
- Inbounds: single `saplearningcentersaplearningce/display` without `resolutionResult`
- UI5: `minUI5Version: 1.120.13` (Preview provides its own runtime)

Navigation:
- Entity1: ListReport → ObjectPage
- TrainingAssignments: ListReport → ObjectPage
- Shortcut button: "Training Assignments" appears near the top-right (left of Settings/Export) and opens the TrainingAssignments page.
- AI Assistant: Floating button bottom-right; opens resizable dialog.

Notes:
- Editor warnings about `manifest-schema://local` and `ui5.yaml` schema are informational and do not affect runtime.
- Component-preload 404 is expected in dev; UI5 loads modules individually.
- LREP 404 is normal in sandbox; app starts without flex data.
