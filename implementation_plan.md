# Cleanup Nexus Game Companion

The goal is to remove admin-related features from the companion app while keeping the "test-admin" account as a reference in the settings.

## Proposed Changes

### [nexus-game-companion](file:///c:/Users/Zbynek/Desktop/nexus-game-companion)

#### [MODIFY] [SettingsView.tsx](file:///c:/Users/Zbynek/Desktop/nexus-game-companion/components/SettingsView.tsx)
- Re-add the "ADMIN_ÚČTY" section but only show "TEST ADMIN" (test@nexus.cz).
- Ensure "Master Admin" is not displayed.

## Verification Plan

### Manual Verification
1. Run `npm run dev` in `nexus-game-companion`.
2. Open the app and go to the "SYS" (Settings) tab.
3. Verify that:
   - "ADMIN_ÚČTY" section is present.
   - Only "TEST ADMIN" is listed.
   - "MASTER ADMIN" and "REŽIM: MASTER DATABÁZE" are gone.
   - The central button is a "SCANNER" (Scan icon) and not a "Fabrikace" (Hammer icon).
4. Run `npm run deploy` to push the changes to GitHub Pages.
5. Verify the live site at `https://supptdexoart-sudo.github.io/Nexuslink/`.
