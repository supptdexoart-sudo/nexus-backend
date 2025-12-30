
import { GameEvent, GameEventType } from "../types";

// Tyto karty budou dostupné VŽDY, i bez prvního připojení k internetu.
export const NEXUS_SEED_DATA: GameEvent[] = [
  {
    id: "ITEM-01",
    title: "Základní Lékárnička",
    description: "Stará plechová krabička s nápisem 'První pomoc'. Obsahuje čisté obvazy.",
    type: GameEventType.ITEM,
    rarity: "Common",
    isConsumable: true,
    stats: [{ label: "HP", value: "+20" }],
    price: 15
  },
  {
    id: "ITEM-02",
    title: "Energetický Článek",
    description: "Standardní baterie pro Nexus zařízení. Trochu jiskří.",
    type: GameEventType.ITEM,
    rarity: "Common",
    isConsumable: true,
    stats: [{ label: "MANA", value: "+25" }],
    price: 25
  },
  {
    id: "BOSS-01",
    title: "Strážce Brány",
    description: "Masivní mechanický konstrukt, který nepustí nikoho bez propustky.",
    type: GameEventType.BOSS,
    rarity: "Legendary",
    stats: [
        { label: "HP", value: "500" },
        { label: "ATK", value: "25" }
    ],
    bossPhases: [
        { name: "Obranný režim", triggerType: "HP_PERCENT", triggerValue: 50, description: "Strážce aktivuje štíty.", damageBonus: 10 }
    ]
  },
  {
    id: "DILEMA-01",
    title: "Rezavé Dveře",
    description: "Stojíš před dveřmi, které vedou do neznáma. Slyšíš z nich podivné škrábání.",
    type: GameEventType.DILEMA,
    rarity: "Common",
    dilemmaOptions: [
        { label: "Vykopnout dveře", successChance: 100, consequenceText: "Dveře povolí, ale hluk přilákal nepřátele!", effectType: "hp", effectValue: -10 },
        { label: "Opatrně otevřít", successChance: 100, consequenceText: "Podařilo se ti vklouznout dovnitř tiše.", effectType: "none", effectValue: 0 }
    ]
  },
  {
    id: "TRAP-01",
    title: "Elektrický Oblouk",
    description: "Ze stěny šlehají blesky. Musíš proběhnout ve správný moment!",
    type: GameEventType.TRAP,
    rarity: "Rare",
    trapConfig: {
        difficulty: 12,
        damage: 30,
        disarmClass: "Zloděj" as any,
        successMessage: "Proklouzl jsi bez škrábnutí!",
        failMessage: "Dostal jsi ránu proudem!"
    }
  },
  // --- PLANETY (NAVIGAČNÍ DATA) ---
  {
    id: "PLANET-01",
    title: "Nav Data: Terra Nova",
    description: "Souřadnice k obyvatelné planetě s bujnou vegetací. Bezpečná zóna pro obchod.",
    type: GameEventType.PLANET,
    rarity: "Rare",
    planetConfig: {
        planetId: "p1",
        landingEventType: GameEventType.MERCHANT
    }
  },
  {
    id: "PLANET-02",
    title: "Nav Data: Kepler-186f",
    description: "Vzdálená exoplaneta pokrytá ledem. Detekovány staré ruiny.",
    type: GameEventType.PLANET,
    rarity: "Epic",
    planetConfig: {
        planetId: "p2",
        landingEventType: GameEventType.DILEMA
    }
  },
  {
    id: "PLANET-03",
    title: "Nav Data: Mars Outpost",
    description: "Vojenská základna na Marsu. Vysoké riziko konfliktu.",
    type: GameEventType.PLANET,
    rarity: "Rare",
    planetConfig: {
        planetId: "p3",
        landingEventType: GameEventType.ENCOUNTER
    }
  },
  {
    id: "PLANET-04",
    title: "Nav Data: Black Nebula",
    description: "Nestabilní sektor plný anomálií. Pouze pro zkušené piloty.",
    type: GameEventType.PLANET,
    rarity: "Legendary",
    planetConfig: {
        planetId: "p4",
        landingEventType: GameEventType.BOSS
    }
  }
];