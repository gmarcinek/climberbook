export type ModuleKey =
  | "treningowy"
  | "raportowy"
  | "analityka"
  | "modele"
  | "team"
  | "obiekty"
  | "ustawienia";

export type ClimberbookModule = {
  key: ModuleKey;
  route: string;
  title: string;
  navLabel: string;
  description: string;
  eyebrow: string;
};

export const moduleConfig: ClimberbookModule[] = [
  {
    key: "treningowy",
    route: "/trening",
    title: "Moduł treningowy",
    navLabel: "Treningi",
    description: "Kalendarz 12 miesięcy do zbierania i przeglądu treningów.",
    eyebrow: "Codzienna praca",
  },
  {
    key: "analityka",
    route: "/analityka",
    title: "Moduł analityki",
    navLabel: "Analiza",
    description: "Trendy, rozklad wycen i historia danych treningowych.",
    eyebrow: "Przegląd trendów",
  },
  {
    key: "team",
    route: "/team",
    title: "Team",
    navLabel: "Team",
    description: "Edycja zawodników i porównanie aktualnych wyników.",
    eyebrow: "Drużyna",
  },
  {
    key: "obiekty",
    route: "/obiekty",
    title: "Obiekty",
    navLabel: "Obiekty",
    description: "Konfiguracja obiektów, aktywności i ścian z liną.",
    eyebrow: "Infrastruktura",
  },
  {
    key: "raportowy",
    route: "/raporty",
    title: "Moduł raportowy",
    navLabel: "Raporty",
    description: "",
    eyebrow: "Historia przejść",
  },
  {
    key: "modele",
    route: "/modele",
    title: "Modele",
    navLabel: "Modele",
    description: "Modele predykcyjne wspierające planowanie wspinania.",
    eyebrow: "Laboratorium danych",
  },
  {
    key: "ustawienia",
    route: "/ustawienia",
    title: "Settings",
    navLabel: "Settings",
    description: "Profil, zarządzanie zespołem i ustawienia zaawansowane.",
    eyebrow: "Dane bazowe",
  },
];

export function getModuleKeyFromRoute(routeSegment: string) {
  return moduleConfig.find((module) => module.route === `/${routeSegment}`)
    ?.key;
}
