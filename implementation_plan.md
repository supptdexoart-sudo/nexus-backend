# Nexus Game Companion Fixes

## Night Mode UI Enhancements
Add a visual indicator to inventory cards when night mode is active:
- A blinking "NOC" label in the top right corner.
- A purple/blue diagonal stripe in the top right corner.

## Proposed Changes

### [nexus-game-companion](file:///c:/Users/Zbynek/Desktop/nexus-game-companion)

#### [MODIFY] [InventoryView.tsx](file:///c:/Users/Zbynek/Desktop/nexus-game-companion/components/InventoryView.tsx)
- (Completed) Added night mode indicators to backpack cards.

#### [MODIFY] [App.tsx](file:///c:/Users/Zbynek/Desktop/nexus-game-companion/App.tsx)
- Pass `isNight={logic.isNight}` to `EventCard`.

#### [MODIFY] [EventCard.tsx](file:///c:/Users/Zbynek/Desktop/nexus-game-companion/components/EventCard.tsx)
- Add `isNight` to props.
- Implement the same diagonal stripe and blinking "NOC" label as in `InventoryView.tsx`.

## Verification Plan

### Manual Verification
1. Run `npm run dev` in `nexus-game-companion`.
2. Ensure night mode is active.
3. Open a card from the inventory or scan a card that has a night variant.
4. Verify that the opened card shows the blinking "NOC" label and the purple/blue stripe in the top-right corner.
5. Deploy to GitHub Pages.
