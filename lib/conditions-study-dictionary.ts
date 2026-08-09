export type ConditionIcon =
  | "cloud"
  | "cloud-drizzle"
  | "cloud-rain"
  | "droplet"
  | "droplets"
  | "snowflake"
  | "sun"
  | "thermometer"
  | "thermometer-sun"
  | "tornado"
  | "wind";

export type ConditionDescriptor = {
  label: string;
  detail: string;
  icon: ConditionIcon;
  tone: string;
};

type ConditionRange = ConditionDescriptor & { maximum: number };

const temperatureRanges: readonly ConditionRange[] = [
  {
    maximum: 0,
    label: "mróz",
    detail: "wyraźnie nieprzyjemnie",
    icon: "snowflake",
    tone: "cold",
  },
  {
    maximum: 7,
    label: "zimno",
    detail: "nieprzyjemnie chłodno",
    icon: "thermometer",
    tone: "cold",
  },
  {
    maximum: 15,
    label: "chłodno",
    detail: "rześko",
    icon: "thermometer",
    tone: "cool",
  },
  {
    maximum: 24,
    label: "komfortowo",
    detail: "przyjemny zakres",
    icon: "thermometer-sun",
    tone: "comfortable",
  },
  {
    maximum: 29,
    label: "ciepło",
    detail: "wyraźnie ciepło",
    icon: "sun",
    tone: "warm",
  },
  {
    maximum: Number.POSITIVE_INFINITY,
    label: "upał",
    detail: "obciążające ciepło",
    icon: "sun",
    tone: "hot",
  },
];

const humidityRanges: readonly ConditionRange[] = [
  {
    maximum: 30,
    label: "bardzo sucho",
    detail: "sucho w powietrzu",
    icon: "droplet",
    tone: "dry",
  },
  {
    maximum: 40,
    label: "sucho",
    detail: "niska wilgotność",
    icon: "droplet",
    tone: "dry",
  },
  {
    maximum: 60,
    label: "komfortowo",
    detail: "komfortowa wilgotność",
    icon: "droplets",
    tone: "comfortable",
  },
  {
    maximum: 70,
    label: "wilgotno",
    detail: "podwyższona wilgotność",
    icon: "cloud-drizzle",
    tone: "damp",
  },
  {
    maximum: 80,
    label: "bardzo wilgotno",
    detail: "ciężkie powietrze",
    icon: "cloud-rain",
    tone: "wet",
  },
  {
    maximum: Number.POSITIVE_INFINITY,
    label: "duszno",
    detail: "bardzo wysoka wilgotność",
    icon: "cloud-rain",
    tone: "wet",
  },
];

const windRanges: readonly ConditionRange[] = [
  {
    maximum: 1,
    label: "cisza",
    detail: "powietrze niemal nieruchome",
    icon: "cloud",
    tone: "calm",
  },
  {
    maximum: 5,
    label: "powiew",
    detail: "ledwo wyczuwalny",
    icon: "wind",
    tone: "calm",
  },
  {
    maximum: 11,
    label: "lekka bryza",
    detail: "przyjemny ruch powietrza",
    icon: "wind",
    tone: "breeze",
  },
  {
    maximum: 19,
    label: "łagodna bryza",
    detail: "wyraźnie wyczuwalna",
    icon: "wind",
    tone: "breeze",
  },
  {
    maximum: 29,
    label: "umiarkowany wiatr",
    detail: "odczuwalny opór",
    icon: "wind",
    tone: "windy",
  },
  {
    maximum: 38,
    label: "silny wiatr",
    detail: "utrudnia komfort",
    icon: "wind",
    tone: "strong",
  },
  {
    maximum: 49,
    label: "bardzo silny wiatr",
    detail: "wyraźnie nieprzyjemny",
    icon: "tornado",
    tone: "strong",
  },
  {
    maximum: 61,
    label: "wichura",
    detail: "warunki trudne",
    icon: "tornado",
    tone: "gale",
  },
  {
    maximum: Number.POSITIVE_INFINITY,
    label: "wiatr sztormowy",
    detail: "warunki niebezpieczne",
    icon: "tornado",
    tone: "gale",
  },
];

function findRange(value: number, ranges: readonly ConditionRange[]) {
  return (
    ranges.find((range) => value <= range.maximum) ?? ranges[ranges.length - 1]
  );
}

export function getTemperatureCondition(temperatureC: number) {
  return findRange(temperatureC, temperatureRanges);
}

export function getHumidityCondition(humidityPercent: number) {
  return findRange(humidityPercent, humidityRanges);
}

export function getWindCondition(windKph: number) {
  return findRange(windKph, windRanges);
}
