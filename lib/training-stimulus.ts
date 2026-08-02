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

const ropePriceGrades = [
  "4a",
  "4a+",
  "4b",
  "4b+",
  "4c",
  "4c+",
  ...ropeLinearGrades,
  ...ropeExponentialGrades,
];
const ropeCoinGradeMultiplier = 1.15;

export const ropeCoinPer10mByGrade: Record<string, number> = (() => {
  const sixBGradeIndex = ropePriceGrades.indexOf("6b");

  return Object.fromEntries(
    ropePriceGrades.map((grade, index) => [
      grade,
      0.002 * ropeCoinGradeMultiplier ** (index - sixBGradeIndex),
    ]),
  );
})();

const boulderRopeGradeByV: Record<string, string> = {
  V1: "6a+",
  V2: "6b",
  V3: "6c",
  V4: "7a+",
  V5: "7b",
  V6: "7b+",
  V7: "7c",
  V8: "7c+",
  V9: "8a",
  V10: "8a+",
  V11: "8b",
  V12: "8b+",
};

const boulderCoinByGrade: Record<string, number> = Object.entries(
  boulderRopeGradeByV,
).reduce<Record<string, number>>((prices, [grade, ropeGrade]) => {
  const coin = (ropeCoinPer10mByGrade[ropeGrade] ?? minimumCoin) / 3;
  prices[grade] = coin;
  prices[grade.slice(1)] = coin;
  return prices;
}, {});

const spraywallAttemptProfile = {
  soft: { grade: "V2", attemptIntervalMinutes: 2 },
  medium: { grade: "V3", attemptIntervalMinutes: 4 },
  hard: { grade: "V7", attemptIntervalMinutes: 5.5 },
} satisfies Record<
  SpraywallIntensity,
  { grade: keyof typeof boulderRopeGradeByV; attemptIntervalMinutes: number }
>;

export const stimulusAlgorithmVersion = 3;

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

const surfaceDimensionSplits: Record<
  TrainingSurface | "general",
  FatigueDimensions
> = {
  lina: {
    aerobicEndurance: 0.45,
    strengthEndurance: 0.35,
    strengthPower: 0.1,
    contactStrength: 0.1,
  },
  baldy: {
    aerobicEndurance: 0.15,
    strengthEndurance: 0.2,
    strengthPower: 0.45,
    contactStrength: 0.2,
  },
  moon: {
    aerobicEndurance: 0.05,
    strengthEndurance: 0.15,
    strengthPower: 0.55,
    contactStrength: 0.25,
  },
  kilter: {
    aerobicEndurance: 0.05,
    strengthEndurance: 0.15,
    strengthPower: 0.55,
    contactStrength: 0.25,
  },
  spraywall: {
    aerobicEndurance: 0.2,
    strengthEndurance: 0.25,
    strengthPower: 0.35,
    contactStrength: 0.2,
  },
  chwytotablica: {
    aerobicEndurance: 0.05,
    strengthEndurance: 0.1,
    strengthPower: 0.2,
    contactStrength: 0.65,
  },
  campus: {
    aerobicEndurance: 0,
    strengthEndurance: 0.1,
    strengthPower: 0.4,
    contactStrength: 0.5,
  },
  drazek: {
    aerobicEndurance: 0.1,
    strengthEndurance: 0.15,
    strengthPower: 0.65,
    contactStrength: 0.1,
  },
  silownia: {
    aerobicEndurance: 0.1,
    strengthEndurance: 0.1,
    strengthPower: 0.7,
    contactStrength: 0.1,
  },
  bieznia: {
    aerobicEndurance: 0.85,
    strengthEndurance: 0.1,
    strengthPower: 0.05,
    contactStrength: 0,
  },
  rower: {
    aerobicEndurance: 0.85,
    strengthEndurance: 0.1,
    strengthPower: 0.05,
    contactStrength: 0,
  },
  bieg: {
    aerobicEndurance: 0.8,
    strengthEndurance: 0.1,
    strengthPower: 0.1,
    contactStrength: 0,
  },
  treking: {
    aerobicEndurance: 0.75,
    strengthEndurance: 0.15,
    strengthPower: 0.1,
    contactStrength: 0,
  },
  general: {
    aerobicEndurance: 0.4,
    strengthEndurance: 0.25,
    strengthPower: 0.25,
    contactStrength: 0.1,
  },
};

const spraywallDimensionSplits = {
  soft: {
    aerobicEndurance: 0.8,
    strengthEndurance: 0.2,
    strengthPower: 0,
    contactStrength: 0,
  },
  medium: {
    aerobicEndurance: 0.2,
    strengthEndurance: 0.45,
    strengthPower: 0.25,
    contactStrength: 0.1,
  },
  hard: {
    aerobicEndurance: 0.05,
    strengthEndurance: 0.2,
    strengthPower: 0.5,
    contactStrength: 0.25,
  },
} satisfies Record<SpraywallIntensity, FatigueDimensions>;

const ropeDimensionSplits = {
  low: {
    aerobicEndurance: 0.7,
    strengthEndurance: 0.25,
    strengthPower: 0.03,
    contactStrength: 0.02,
  },
  medium: {
    aerobicEndurance: 0.4,
    strengthEndurance: 0.4,
    strengthPower: 0.12,
    contactStrength: 0.08,
  },
  high: {
    aerobicEndurance: 0.2,
    strengthEndurance: 0.4,
    strengthPower: 0.25,
    contactStrength: 0.15,
  },
  elite: {
    aerobicEndurance: 0.1,
    strengthEndurance: 0.25,
    strengthPower: 0.45,
    contactStrength: 0.2,
  },
} satisfies Record<string, FatigueDimensions>;

const inclinationDimensionMultipliers = {
  slab: {
    aerobicEndurance: 1.05,
    strengthEndurance: 0.9,
    strengthPower: 0.7,
    contactStrength: 0.8,
  },
  vertical: {
    aerobicEndurance: 1,
    strengthEndurance: 1,
    strengthPower: 1,
    contactStrength: 1,
  },
  slight_overhang: {
    aerobicEndurance: 1,
    strengthEndurance: 1.1,
    strengthPower: 1.1,
    contactStrength: 1.15,
  },
  overhang: {
    aerobicEndurance: 0.9,
    strengthEndurance: 1.15,
    strengthPower: 1.25,
    contactStrength: 1.25,
  },
  steep: {
    aerobicEndurance: 0.85,
    strengthEndurance: 1.15,
    strengthPower: 1.35,
    contactStrength: 1.35,
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
    aerobicEndurance: dimensions.aerobicEndurance / total,
    strengthEndurance: dimensions.strengthEndurance / total,
    strengthPower: dimensions.strengthPower / total,
    contactStrength: dimensions.contactStrength / total,
  };
}

function parseGrades(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((grade) => grade.trim())
    .filter(Boolean);
}

type GradeReference = {
  average: number;
  maximum: number;
};

function getGradeRank(surface: TrainingSurface, grade: string) {
  if (surface === "lina") return ropePriceGrades.indexOf(grade);

  if (surface === "baldy" || surface === "moon" || surface === "kilter") {
    const match = /^V(\d+)$/i.exec(grade.trim());
    return match ? Number(match[1]) : -1;
  }

  return -1;
}

function getGradeReference(
  training: Pick<TrainingRecord, "id" | "athleteId" | "date">,
  surface: TrainingSurface,
  referenceTrainings: TrainingRecord[],
): GradeReference | null {
  const since = new Date(`${training.date}T00:00:00`);
  since.setDate(since.getDate() - 60);
  const sinceDate = since.toISOString().slice(0, 10);
  const ranks = referenceTrainings
    .filter(
      (candidate) =>
        candidate.id !== training.id &&
        candidate.athleteId === training.athleteId &&
        candidate.date >= sinceDate &&
        candidate.date < training.date,
    )
    .flatMap((candidate) =>
      parseGrades(candidate.difficultyBySurface?.[surface]).map((grade) =>
        getGradeRank(surface, grade),
      ),
    )
    .filter((rank) => rank >= 0);

  if (ranks.length < 3) return null;

  return {
    average: ranks.reduce((total, rank) => total + rank, 0) / ranks.length,
    maximum: Math.max(...ranks),
  };
}

function getBoulderDimensionSplit(
  surface: "baldy" | "moon" | "kilter",
  grades: string[],
  reference: GradeReference | null,
) {
  const highestRank = Math.max(
    ...grades.map((grade) => getGradeRank(surface, grade)),
  );

  if (!reference || highestRank < 0) return surfaceDimensionSplits[surface];
  if (
    highestRank <= reference.average - 2 ||
    highestRank <= reference.maximum - 3
  ) {
    return {
      aerobicEndurance: 0.6,
      strengthEndurance: 0.25,
      strengthPower: 0.1,
      contactStrength: 0.05,
    } satisfies FatigueDimensions;
  }
  if (highestRank <= reference.maximum) {
    return {
      aerobicEndurance: 0.15,
      strengthEndurance: 0.45,
      strengthPower: 0.25,
      contactStrength: 0.15,
    } satisfies FatigueDimensions;
  }

  return surfaceDimensionSplits[surface];
}

function getRopeDimensionSplit(
  grade: string,
  inclination?: FacilityRecord["capabilities"]["ropeWalls"][number]["inclination"],
  reference?: GradeReference | null,
): FatigueDimensions {
  const gradeIndex = [...ropeLinearGrades, ...ropeExponentialGrades].indexOf(
    grade,
  );
  const base = reference
    ? gradeIndex <= reference.average - 2 || gradeIndex <= reference.maximum - 3
      ? ropeDimensionSplits.low
      : gradeIndex <= reference.maximum
        ? ropeDimensionSplits.medium
        : ropeDimensionSplits.high
    : gradeIndex <= 8
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
    aerobicEndurance: base.aerobicEndurance * multipliers.aerobicEndurance,
    strengthEndurance: base.strengthEndurance * multipliers.strengthEndurance,
    strengthPower: base.strengthPower * multipliers.strengthPower,
    contactStrength: base.contactStrength * multipliers.contactStrength,
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
    return grades.reduce(
      (sum, grade) => sum + (boulderCoinByGrade[grade] ?? minimumCoin),
      0,
    );
  }
  return 0;
}

function getSpraywallCoin(minutes: number, intensity: SpraywallIntensity) {
  const profile = spraywallAttemptProfile[intensity];
  const attempts = minutes / profile.attemptIntervalMinutes;
  return attempts * (boulderCoinByGrade[profile.grade] ?? minimumCoin);
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
        key: "aerobicEndurance",
        label: "Wytrzymałość tlenowa",
        description: "Praca tlenowa i tolerancja dużej objętości ruchu.",
      },
      {
        key: "strengthEndurance",
        label: "Wytrzymałość siłowa",
        description: "Powtarzalna praca blisko własnego poziomu trudności.",
      },
      {
        key: "strengthPower",
        label: "Siła / moc",
        description: "Krótka praca o wysokiej trudności lub intensywności.",
      },
      {
        key: "contactStrength",
        label: "Siła kontaktowa",
        description: "Eksplozywny chwyt i dynamiczne obciążenie kontaktu.",
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
        "Każdy zadeklarowany problem V kosztuje 1/3 ceny 10 m liny o porównywalnej wycenie.",
        {
          priceByGrade: boulderCoinByGrade,
          fallbackPerHour: surfaceHourlyCoin.baldy,
        },
      ),
      activity(
        "moon",
        "Moon",
        "Każdy zadeklarowany problem V kosztuje 1/3 ceny 10 m liny o porównywalnej wycenie.",
        {
          unit: "wycena",
          priceByGrade: boulderCoinByGrade,
          fallbackPerHour: surfaceHourlyCoin.moon,
        },
      ),
      activity(
        "kilter",
        "Kilter",
        "Każdy zadeklarowany problem V kosztuje 1/3 ceny 10 m liny o porównywalnej wycenie.",
        {
          unit: "wycena",
          priceByGrade: boulderCoinByGrade,
          fallbackPerHour: surfaceHourlyCoin.kilter,
        },
      ),
      activity(
        "spraywall",
        "Spray",
        "Cena wynika z realistycznej liczby wstawek: V2 co 2 min, V4 co 4 min albo V7 co 5,5 min.",
        { unit: "wstawka", attemptProfile: spraywallAttemptProfile },
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
    | "id"
    | "athleteId"
    | "date"
    | "surfaces"
    | "durationMinutes"
    | "difficultyBySurface"
    | "protocol"
    | "facilityName"
    | "ropeRoutes"
  >,
  facilities: FacilityRecord[] = [],
  referenceTrainings: TrainingRecord[] = [],
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
      const reference = getGradeReference(
        training,
        surface,
        referenceTrainings,
      );
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
          dimensionSplit: getRopeDimensionSplit(
            route.grade,
            wall?.inclination,
            reference,
          ),
        };
      });
      const coin = routeStimuli.reduce((sum, route) => sum + route.coin, 0);
      const dimensionSplit = normalizeDimensions(
        routeStimuli.reduce<FatigueDimensions>(
          (total, route) => ({
            aerobicEndurance:
              total.aerobicEndurance +
              route.coin * route.dimensionSplit.aerobicEndurance,
            strengthEndurance:
              total.strengthEndurance +
              route.coin * route.dimensionSplit.strengthEndurance,
            strengthPower:
              total.strengthPower +
              route.coin * route.dimensionSplit.strengthPower,
            contactStrength:
              total.contactStrength +
              route.coin * route.dimensionSplit.contactStrength,
          }),
          {
            aerobicEndurance: 0,
            strengthEndurance: 0,
            strengthPower: 0,
            contactStrength: 0,
          },
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
    const timeCoin = (minutesPerSurface / 60) * surfaceHourlyCoin[surface];
    const spraywallCoin =
      surface === "spraywall"
        ? getSpraywallCoin(
            training.durationMinutes,
            training.protocol?.spraywallIntensity ?? "medium",
          )
        : 0;
    return {
      surface,
      coin: Math.max(
        minimumCoin,
        surface === "spraywall"
          ? spraywallCoin
          : gradeCoin || protocolCoin
            ? gradeCoin + protocolCoin
            : timeCoin,
      ),
      dimensionSplit:
        surface === "spraywall"
          ? spraywallDimensionSplits[
              training.protocol?.spraywallIntensity ?? "medium"
            ]
          : surface === "baldy" || surface === "moon" || surface === "kilter"
            ? getBoulderDimensionSplit(
                surface,
                parseGrades(training.difficultyBySurface?.[surface]),
                getGradeReference(training, surface, referenceTrainings),
              )
            : surfaceDimensionSplits[surface],
    };
  });
}
