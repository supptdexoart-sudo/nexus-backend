# Nexus Game Companion Fixes

## Night Rarity Override Fix
The `getAdjustedItem` function is missing logic to apply `nightRarity` and `nightFlavorText` when night mode is active.

## Proposed Changes

### [nexus-game-companion](file:///c:/Users/Zbynek/Desktop/nexus-game-companion)

#### [MODIFY] [useGameLogic.ts](file:///c:/Users/Zbynek/Desktop/nexus-game-companion/hooks/useGameLogic.ts)
- Update `getAdjustedItem` to apply `nightRarity` and `nightFlavorText` from `item.timeVariant`.

## Verification Plan

### Manual Verification
1. Run `npm run dev` in `nexus-game-companion`.
2. In the Admin Terminal, set a card's Night Rarity to "RARE".
3. Scan the card in the Companion app during night mode.
4. Verify that the card displays "RARE" rarity and the correct flavor text.
5. Deploy to GitHub Pages.
