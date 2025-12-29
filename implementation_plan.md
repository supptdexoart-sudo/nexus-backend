# Nexus Game Companion Fixes

## Night Mode UI Enhancements
Add a visual indicator to inventory cards when night mode is active:
- A blinking "NOC" label in the top right corner.
- A purple/blue diagonal stripe in the top right corner.

## Proposed Changes

### [nexus-game-companion](file:///c:/Users/Zbynek/Desktop/nexus-game-companion)

#### [MODIFY] [InventoryView.tsx](file:///c:/Users/Zbynek/Desktop/nexus-game-companion/components/InventoryView.tsx)
- Add the diagonal stripe and blinking "NOC" text to the card rendering logic.
- Use conditional rendering based on `isNight` and `item.timeVariant.enabled`.

## Verification Plan

### Manual Verification
1. Run `npm run dev` in `nexus-game-companion`.
2. Ensure night mode is active.
3. Verify that cards with a night variant (like "111*") show the blinking "NOC" label and the purple/blue stripe in the backpack.
4. Deploy to GitHub Pages.
