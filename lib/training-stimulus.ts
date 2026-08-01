import type {
  FacilityRecord,
  FatigueDimensions,
  RopeRoute,
  TrainingRecord,
  TrainingSurface,
  SpraywallIntensity,
} from "@/lib/climbs-db";

export type ObjectiveStimulusActivity = {
  surface: TrainingSurface | "general";
  coin: number;
  dimensionSplit: FatigueDimensions;
  dimensionCoin?: Partial<FatigueDimensions>;
};

const minimumCoin = 0.001;
const defaultRopeLengthMeters = 16;

const ropeLinearGrades = [
  "5a",
  "5a+",
  "5b",
  "5b+",
  "5c",
  "5c+",
  "6a",
  "6a+",
  "6b",
];
const ropeExponentialGrades = [
  "6b+",
  "6c",
  "6c+",
  "7a",
  "7a+",
  "7b",
  "7b+",
  "7c",
  "7c+",
  "8a",
  "8a+",
  "8b",
  "8b+",
  "8c",
  "8c+",
  "9a",
  "9a+",
  "9b",
  "9b+",
  "9c",
  "9c+",
];

export const ropeCoinPer10mByGrade: Record<string, number> = (() => {
  const prices: Record<string, number> = {
    "4a": 0.0002,
    "4a+": 0.00025,
    "4b": 0.0003,
    "4b+": 0.00035,
    "4c": 0.00038,
    "4c+": 0.00039,
  };

  ropeLinearGrades.forEach((grade, index) => {
    prices[grade] = 0.0004 + index * 0.0002;
  });

  let price = prices["6b"];
  ropeExponentialGrades.forEach((grade) => {
    price *= 1.5;
    prices[grade] = price;
  });

  return prices;
})();

const boulderCoinByGrade: Record<string, number> = Array.from(
  { length: 12 },
  (_value, index) => index + 1,
).reduce<Record<string, number>>((prices, level) => {
  prices[`V${level}`] = level * 0.0035;
  prices[String(level)] = prices[`V${level}`];
  return prices;
}, {});

const boulderSurfaceCoinMultiplier = {
  baldy: 0.08575,
  moon: 1,
  kilter: 1,
} satisfies Partial<Record<TrainingSurface, number>>;

export const stimulusAlgorithmVersion = 1;

const surfaceHourlyCoin: Record<TrainingSurface | "general", number> = {
  lina: 0.012,
  baldy: 0.016,
  moon: 0.018,
  kilter: 0.018,
  spraywall: 0.014,
  chwytotablica: 0.01,
  campus: 0.014,
  drazek: 0.01,
  silownia: 0.014,
  bieznia: 0.012,
  rower: 0.01,
  bieg: 0.014,
  treking: 0.009,
  general: 0.01,
};

const spraywallHourlyCoinByIntensity = {
  soft: 0.006,
  medium: 0.04,
  hard: 0.3,
} satisfies Record<SpraywallIntensity, number>;

const surfaceDimensionSplits: Record<
  TrainingSurface | "general",
  FatigueDimensions
> = {
  lina: {
    fitness: 0.35,
    structural: 0.15,
    strength: 0.1,
    fingers: 0.15,
    skill: 0.25,
  },
  baldy: {
    fitness: 0.1,
    structural: 0.2,
    strength: 0.35,
    fingers: 0.2,
    skill: 0.15,
  },
  moon: {
    fitness: 0,
    structural: 0.2,
    strength: 0.4,
    fingers: 0.35,
    skill: 0.05,
  },
  kilter: {
    fitness: 0,
    structural: 0.2,
    strength: 0.4,
    fingers: 0.35,
    skill: 0.05,
  },
  spraywall: {
    fitness: 0.3,
    structural: 0.15,
    strength: 0.15,
    fingers: 0.2,
    skill: 0.2,
  },
  chwytotablica: {
    fitness: 0,
    structural: 0.3,
    strength: 0.15,
    fingers: 0.55,
    skill: 0,
  },
  campus: {
    fitness: 0.1,
    structural: 0.3,
    strength: 0.3,
    fingers: 0.25,
    skill: 0.05,
  },
  drazek: {
    fitness: 0.15,
    structural: 0.25,
    strength: 0.5,
    fingers: 0.05,
    skill: 0.05,
  },
  silownia: {
    fitness: 0.2,
    structural: 0.3,
    strength: 0.4,
    fingers: 0.05,
    skill: 0.05,
  },
  bieznia: {
    fitness: 0.8,
    structural: 0.1,
    strength: 0.05,
    fingers: 0,
    skill: 0.05,
  },
  rower: {
    fitness: 0.8,
    structural: 0.05,
    strength: 0.1,
    fingers: 0,
    skill: 0.05,
  },
  bieg: {
    fitness: 0.7,
    structural: 0.2,
    strength: 0.05,
    fingers: 0,
    skill: 0.05,
  },
  treking: {
    fitness: 0.65,
    structural: 0.2,
    strength: 0.1,
    fingers: 0,
    skill: 0.05,
  },
  general: {
    fitness: 0.35,
    structural: 0.25,
    strength: 0.25,
    fingers: 0.05,
    skill: 0.1,
  },
};

const spraywallDimensionSplits = {
  soft: {
    fitness: 1,
    structural: 0,
    strength: 0,
    fingers: 0,
    skill: 0,
  },
  medium: {
    fitness: 0.35,
    structural: 0.2,
    strength: 0.2,
    fingers: 0.15,
    skill: 0.1,
  },
  hard: {
    fitness: 0.05,
    structural: 0.25,
    strength: 0.35,
    fingers: 0.3,
    skill: 0.05,
  },
} satisfies Record<SpraywallIntensity, FatigueDimensions>;

const ropeDimensionSplits = {
  low: {
    fitness: 0.4,
    structural: 0.1,
    strength: 0.05,
    fingers: 0.05,
    skill: 0.4,
  },
  medium: {
    fitness: 0.35,
    structural: 0.15,
    strength: 0.1,
    fingers: 0.15,
    skill: 0.25,
  },
  high: {
    fitness: 0.3,
    structural: 0.2,
    strength: 0.15,
    fingers: 0.25,
    skill: 0.1,
  },
  elite: {
    fitness: 0.25,
    structural: 0.25,
    strength: 0.2,
    fingers: 0.25,
    skill: 0.05,
  },
} satisfies Record<string, FatigueDimensions>;

const inclinationDimensionMultipliers = {
  slab: {
    fitness: 1.05,
    structural: 0.8,
    strength: 0.7,
    fingers: 0.8,
    skill: 1.3,
  },
  vertical: { fitness: 1, structural: 1, strength: 1, fingers: 1, skill: 1 },
  slight_overhang: {
    fitness: 1,
    structural: 1.1,
    strength: 1.1,
    fingers: 1.15,
    skill: 0.95,
  },
  overhang: {
    fitness: 0.9,
    structural: 1.2,
    strength: 1.25,
    fingers: 1.25,
    skill: 0.85,
  },
  steep: {
    fitness: 0.85,
    structural: 1.3,
    strength: 1.35,
    fingers: 1.35,
    skill: 0.75,
  },
} satisfies Record<
  NonNullable<
    FacilityRecord["capabilities"]["ropeWalls"][number]["inclination"]
  >,
  FatigueDimensions
>;

function normalizeDimensions(dimensions: FatigueDimensions): FatigueDimensions {
  const total = Object.values(dimensions).reduce(
    (sum, value) => sum + value,
    0,
  );
  if (total === 0) return surfaceDimensionSplits.general;
  return {
    fitness: dimensions.fitness / total,
    structural: dimensions.structural / total,
    strength: dimensions.strength / total,
    fingers: dimensions.fingers / total,
    skill: dimensions.skill / total,
  };
}

function parseGrades(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((grade) => grade.trim())
    .filter(Boolean);
}

function getRopeDimensionSplit(
  grade: string,
  inclination?: FacilityRecord["capabilities"]["ropeWalls"][number]["inclination"],
): FatigueDimensions {
  const gradeIndex = [...ropeLinearGrades, ...ropeExponentialGrades].indexOf(
    grade,
  );
  const base =
    gradeIndex <= 8
      ? ropeDimensionSplits.low
      : gradeIndex <= 14
        ? ropeDimensionSplits.medium
        : gradeIndex <= 20
          ? ropeDimensionSplits.high
          : ropeDimensionSplits.elite;
  const multipliers = inclination
    ? inclinationDimensionMultipliers[inclination]
    : inclinationDimensionMultipliers.vertical;
  return normalizeDimensions({
    fitness: base.fitness * multipliers.fitness,
    structural: base.structural * multipliers.structural,
    strength: base.strength * multipliers.strength,
    fingers: base.fingers * multipliers.fingers,
    skill: base.skill * multipliers.skill,
  });
}

function getFacilityWalls(
  training: Pick<TrainingRecord, "facilityName">,
  facilities: FacilityRecord[],
) {
  return (
    facilities.find((facility) => facility.name === training.facilityName)
      ?.capabilities.ropeWalls ?? []
  );
}

function getFallbackRopeLength(
  walls: FacilityRecord["capabilities"]["ropeWalls"],
) {
  if (!walls.length) return defaultRopeLengthMeters;
  return walls.reduce((sum, wall) => sum + wall.lengthMeters, 0) / walls.length;
}

function getRopeRoutes(
  training: Pick<TrainingRecord, "ropeRoutes" | "difficultyBySurface">,
): RopeRoute[] {
  if (training.ropeRoutes?.length)
    return training.ropeRoutes.filter((route) => route.grade.trim());
  return parseGrades(training.difficultyBySurface?.lina).map((grade) => ({
    grade,
    ropeWallName: "",
  }));
}

function getProtocolCoin(
  training: Pick<TrainingRecord, "protocol">,
  surface: TrainingSurface,
) {
  if (surface === "drazek") {
    return (training.protocol?.pullUp ?? []).reduce(
      (sum, set) =>
        sum +
        set.sets *
          (set.repetitions ?? 1) *
          (0.0005 + Math.abs(set.loadDeloadKg) * 0.00001),
      0,
    );
  }
  if (surface === "chwytotablica") {
    return (training.protocol?.hangboard ?? []).reduce(
      (sum, set) =>
        sum +
        set.sets *
          (set.repetitions ?? 1) *
          (set.hangSeconds ?? 7) *
          (0.00005 + Math.abs(set.loadDeloadKg) * 0.000001),
      0,
    );
  }
  return 0;
}

function getGradeCoin(surface: TrainingSurface, grades: string[]) {
  if (surface === "baldy" || surface === "moon" || surface === "kilter") {
    const multiplier = boulderSurfaceCoinMultiplier[surface];
    return grades.reduce(
      (sum, grade) =>
        sum + (boulderCoinByGrade[grade] ?? minimumCoin) * multiplier,
      0,
    );
  }
  return 0;
}

export function getStimulusCatalog() {
  const activity = (
    surface: TrainingSurface,
    label: string,
    description: string,
    pricing: Record<string, unknown>,
  ) => ({ surface, label, description, pricing });

  return {
    algorithmVersion: stimulusAlgorithmVersion,
    coin: {
      unit: "coin",
      description:
        "Obiektywna cena bodźca treningowego. Nie opisuje formy zawodnika ani subiektywnego odczucia wysiłku.",
      interpretation:
        "Sumuj coin aktywności w sesji. Wektor wymiarów rozdziela tę cenę między kanały adaptacji.",
    },
    dimensions: [
      {
        key: "fitness",
        label: "Wydolność",
        description: "Bodziec układu tlenowego i tolerancji objętości.",
      },
      {
        key: "structural",
        label: "Strukturalne",
        description: "Obciążenie tkanek, ścięgien i struktur wspierających.",
      },
      {
        key: "strength",
        label: "Siła",
        description: "Bodziec siły ogólnej i specyficznej.",
      },
      {
        key: "fingers",
        label: "Palce",
        description: "Bodziec chwytu i struktur palców.",
      },
      {
        key: "skill",
        label: "Technika",
        description: "Bodziec koordynacji i umiejętności ruchowych.",
      },
    ],
    activities: [
      activity(
        "lina",
        "Lina",
        "Każda droga ma cenę wyceny za 10 m, następnie mnożoną przez długość wybranej ściany. Bez ściany używana jest średnia obiektu, a bez obiektu 16 m.",
        { unit: "droga", pricePer10mByGrade: ropeCoinPer10mByGrade },
      ),
      activity(
        "baldy",
        "Baldy",
        "Każda zadeklarowana pozycja wyceny jest jednostką bodźca; cena V jest mnożona przez współczynnik powierzchni.",
        {
          priceByGrade: boulderCoinByGrade,
          surfaceMultiplier: boulderSurfaceCoinMultiplier.baldy,
          fallbackPerHour: surfaceHourlyCoin.baldy,
        },
      ),
      activity(
        "moon",
        "Moon",
        "Wyceny V mają ceny wspólne z tabelą boulderową; brak wyceny używa stawki godzinowej.",
        {
          unit: "wycena",
          priceByGrade: boulderCoinByGrade,
          surfaceMultiplier: boulderSurfaceCoinMultiplier.moon,
          fallbackPerHour: surfaceHourlyCoin.moon,
        },
      ),
      activity(
        "kilter",
        "Kilter",
        "Wyceny V mają ceny wspólne z tabelą boulderową; brak wyceny używa stawki godzinowej.",
        {
          unit: "wycena",
          priceByGrade: boulderCoinByGrade,
          surfaceMultiplier: boulderSurfaceCoinMultiplier.kilter,
          fallbackPerHour: surfaceHourlyCoin.kilter,
        },
      ),
      activity(
        "spraywall",
        "Spray",
        "Cena godzinowa zależy od trybu: regeneracja tlenowa, obwody lub projekty.",
        { unit: "godzina", coinByIntensity: spraywallHourlyCoinByIntensity },
      ),
      activity(
        "chwytotablica",
        "Tablica",
        "Cena protokołu: serie × powtórzenia × sekundy zwisu, z korektą obciążenia zewnętrznego.",
        {
          unit: "sekunda zwisu",
          baseCoin: 0.00005,
          loadCoinPerKg: 0.000001,
          fallbackPerHour: surfaceHourlyCoin.chwytotablica,
        },
      ),
      activity(
        "campus",
        "Campus",
        "Cena godzinowa; rozkład bodźca akcentuje struktury, siłę i palce.",
        { unit: "godzina", coin: surfaceHourlyCoin.campus },
      ),
      activity(
        "drazek",
        "Drążek",
        "Cena protokołu: serie × powtórzenia, z korektą obciążenia zewnętrznego.",
        {
          unit: "powtórzenie",
          baseCoin: 0.0005,
          loadCoinPerKg: 0.00001,
          fallbackPerHour: surfaceHourlyCoin.drazek,
        },
      ),
      activity(
        "silownia",
        "Siłka",
        "Cena godzinowa dla ogólnego treningu siłowego.",
        { unit: "godzina", coin: surfaceHourlyCoin.silownia },
      ),
      activity("rower", "Rower", "Cena godzinowa treningu kolarskiego.", {
        unit: "godzina",
        coin: surfaceHourlyCoin.rower,
      }),
      activity("bieg", "Bieg", "Cena godzinowa treningu biegowego.", {
        unit: "godzina",
        coin: surfaceHourlyCoin.bieg,
      }),
      activity(
        "treking",
        "Treck",
        "Cena godzinowa treningu marszowego/terenowego.",
        { unit: "godzina", coin: surfaceHourlyCoin.treking },
      ),
      activity(
        "bieznia",
        "Bieżnia",
        "Aktywność historyczna; zachowana do przeliczenia starszych treningów.",
        { unit: "godzina", coin: surfaceHourlyCoin.bieznia, status: "legacy" },
      ),
    ],
  };
}

export function getObjectiveStimulusActivities(
  training: Pick<
    TrainingRecord,
    | "surfaces"
    | "durationMinutes"
    | "difficultyBySurface"
    | "protocol"
    | "facilityName"
    | "ropeRoutes"
  >,
  facilities: FacilityRecord[] = [],
): ObjectiveStimulusActivity[] {
  const surfaces: Array<TrainingSurface | "general"> = training.surfaces.length
    ? training.surfaces
    : ["general" as const];
  const minutesPerSurface =
    Math.max(training.durationMinutes, 1) / surfaces.length;
  const ropeWalls = getFacilityWalls(training, facilities);
  const fallbackRopeLength = getFallbackRopeLength(ropeWalls);

  return surfaces.map((surface) => {
    if (surface === "lina") {
      const routes = getRopeRoutes(training);
      if (!routes.length) {
        return {
          surface,
          coin: Math.max(
            minimumCoin,
            (minutesPerSurface / 60) * surfaceHourlyCoin.lina,
          ),
          dimensionSplit: surfaceDimensionSplits.lina,
        };
      }

      const routeStimuli = routes.map((route) => {
        const wall = ropeWalls.find(
          (candidate) => candidate.name === route.ropeWallName,
        );
        const lengthMeters = wall?.lengthMeters ?? fallbackRopeLength;
        const coin =
          (ropeCoinPer10mByGrade[route.grade] ?? minimumCoin) *
          (lengthMeters / 10);
        return {
          coin,
          dimensionSplit: getRopeDimensionSplit(route.grade, wall?.inclination),
        };
      });
      const coin = routeStimuli.reduce((sum, route) => sum + route.coin, 0);
      const dimensionSplit = normalizeDimensions(
        routeStimuli.reduce<FatigueDimensions>(
          (total, route) => ({
            fitness: total.fitness + route.coin * route.dimensionSplit.fitness,
            structural:
              total.structural + route.coin * route.dimensionSplit.structural,
            strength:
              total.strength + route.coin * route.dimensionSplit.strength,
            fingers: total.fingers + route.coin * route.dimensionSplit.fingers,
            skill: total.skill + route.coin * route.dimensionSplit.skill,
          }),
          { fitness: 0, structural: 0, strength: 0, fingers: 0, skill: 0 },
        ),
      );
      return { surface, coin: Math.max(minimumCoin, coin), dimensionSplit };
    }

    if (surface === "general") {
      return {
        surface,
        coin: Math.max(
          minimumCoin,
          (minutesPerSurface / 60) * surfaceHourlyCoin.general,
        ),
        dimensionSplit: surfaceDimensionSplits.general,
      };
    }

    const gradeCoin = getGradeCoin(
      surface,
      parseGrades(training.difficultyBySurface?.[surface]),
    );
    const protocolCoin = getProtocolCoin(training, surface);
    const timeCoin =
      (minutesPerSurface / 60) *
      (surface === "spraywall"
        ? spraywallHourlyCoinByIntensity[
            training.protocol?.spraywallIntensity ?? "medium"
          ]
        : surfaceHourlyCoin[surface]);
    return {
      surface,
      coin: Math.max(
        minimumCoin,
        gradeCoin || protocolCoin ? gradeCoin + protocolCoin : timeCoin,
      ),
      dimensionSplit:
        surface === "spraywall"
          ? spraywallDimensionSplits[
              training.protocol?.spraywallIntensity ?? "medium"
            ]
          : surfaceDimensionSplits[surface],
      ...(surface === "spraywall" && {
        dimensionCoin: {
          fitness: (minutesPerSurface / 60) * surfaceHourlyCoin.spraywall,
        },
      }),
    };
  });
}
