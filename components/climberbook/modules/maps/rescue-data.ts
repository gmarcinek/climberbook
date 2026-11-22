export type RescueRating =
  | "elite"
  | "leading"
  | "strong"
  | "adequate"
  | "guarded"
  | "limited"
  | "critical";

export type RescueProfile = {
  country: string;
  rating: RescueRating;
  mountainService: string;
  ambulanceTime: string;
  mountainTime: string;
  hems: string;
  helicopterCapability: "dedicated" | "mixed" | "limited";
  fleet: {
    helicopters: number | null;
    helicoptersLabel: string;
    hoistEquipped: number | null;
    hoistEquippedLabel: string;
    bases: number | null;
    basesLabel: string;
    regionalAllocation: string;
  };
  cost: string;
  language: string;
  confidence: "wysoka" | "średnia" | "niska";
  summary: string;
  caveats: string[];
  sources: Array<{ label: string; url: string }>;
};

export const rescueProfiles: Record<string, RescueProfile> = {
  CH: {
    country: "Szwajcaria",
    rating: "elite",
    mountainService: "Alpine Rescue Switzerland / służby lokalne",
    ambulanceTime: "zwykle 10–20 min w obszarach zurbanizowanych",
    mountainTime: "często 15–30 min przy warunkach lotnych",
    hems: "Gęsta sieć REGA i wyspecjalizowane załogi alpejskie.",
    helicopterCapability: "dedicated",
    fleet: {
      helicopters: 14,
      helicoptersLabel: "14 dedykowanych",
      hoistEquipped: 14,
      hoistEquippedLabel: "14",
      bases: 14,
      basesLabel: "14 baz operacyjnych",
      regionalAllocation:
        "Sieć ogólnokrajowa; maszyny są dysponowane między rejonami.",
    },
    cost: "Akcja może być w pełni odpłatna; ubezpieczenie jest kluczowe.",
    language: "112; angielski zwykle dostępny, ale niegwarantowany.",
    confidence: "wysoka",
    summary: "Europejski punkt odniesienia dla ratownictwa alpejskiego.",
    caveats: ["Pogoda i noc mogą znacząco zmienić czas dotarcia."],
    sources: [{ label: "REGA", url: "https://www.rega.ch/en/" }],
  },
  AT: {
    country: "Austria",
    rating: "elite",
    mountainService: "Österreichischer Bergrettungsdienst",
    ambulanceTime: "zwykle 10–20 min w zasięgu baz",
    mountainTime: "często 15–30 min przy warunkach lotnych",
    hems: "Rozbudowana sieć HEMS, w tym Christophorus.",
    helicopterCapability: "dedicated",
    fleet: {
      helicopters: null,
      helicoptersLabel: "do weryfikacji",
      hoistEquipped: null,
      hoistEquippedLabel: "do weryfikacji",
      bases: 30,
      basesLabel: "ponad 30 baz HEMS",
      regionalAllocation:
        "Wiele operatorów i sezonowych baz; przydział zależy od landu.",
    },
    cost: "Ratownictwo górskie i lotnicze może być odpłatne.",
    language: "112 lub 140; angielski zwykle dostępny.",
    confidence: "wysoka",
    summary: "Bardzo gęsta infrastruktura i wysoka specjalizacja górska.",
    caveats: ["Bez polisy rachunek za śmigłowiec może być wysoki."],
    sources: [
      { label: "Bergrettung Österreich", url: "https://bergrettung.at/" },
    ],
  },
  PL: {
    country: "Polska",
    rating: "strong",
    mountainService: "GOPR / TOPR",
    ambulanceTime: "zwykle 15–30 min; poza miastami dłużej",
    mountainTime: "orientacyjnie 20–60 min, zależnie od pasma",
    hems: "Ogólnopolska sieć LPR oraz śmigłowiec TOPR w Tatrach.",
    helicopterCapability: "dedicated",
    fleet: {
      helicopters: null,
      helicoptersLabel: "LPR + 1 TOPR; suma do weryfikacji",
      hoistEquipped: 1,
      hoistEquippedLabel: "minimum 1 (TOPR)",
      bases: 23,
      basesLabel: "22 bazy LPR + baza TOPR",
      regionalAllocation:
        "TOPR: Tatry; GOPR korzysta z LPR i zasobów dostępnych regionalnie.",
    },
    cost: "Publiczna akcja ratunkowa jest co do zasady bezpłatna.",
    language: "112; obsługa po angielsku zależy od operatora.",
    confidence: "wysoka",
    summary:
      "Silne służby górskie, ale zasięg lotniczy zależy od pogody i regionu.",
    caveats: ["TOPR działa w Tatrach; pozostałe pasma obsługuje GOPR."],
    sources: [
      { label: "TOPR", url: "https://topr.pl/" },
      { label: "LPR", url: "https://www.lpr.com.pl/" },
    ],
  },
  IT: {
    country: "Włochy",
    rating: "strong",
    mountainService: "CNSAS i służby regionalne",
    ambulanceTime: "zwykle 15–30 min w zaludnionych rejonach",
    mountainTime: "Alpy często 20–45 min; południe bywa znacznie wolniejsze",
    hems: "Silne regionalne HEMS, szczególnie w północnych Alpach.",
    helicopterCapability: "dedicated",
    fleet: {
      helicopters: null,
      helicoptersLabel: "do zebrania per region",
      hoistEquipped: null,
      hoistEquippedLabel: "do zebrania per region",
      bases: null,
      basesLabel: "system regionalny",
      regionalAllocation:
        "Brak jednej floty krajowej; dane trzeba agregować z regionów.",
    },
    cost: "Zasady opłat różnią się między regionami.",
    language: "112; dostępność angielskiego jest nierówna.",
    confidence: "średnia",
    summary: "Duże różnice regionalne ukryte za mocną średnią krajową.",
    caveats: ["Trentino i Dolomity mają inne realia niż wyspy i południe."],
    sources: [{ label: "CNSAS", url: "https://www.cnsas.it/" }],
  },
  ES: {
    country: "Hiszpania",
    rating: "strong",
    mountainService: "GREIM Guardia Civil i służby regionalne",
    ambulanceTime: "zwykle 15–35 min; wyspy i interior dłużej",
    mountainTime: "często 30–60 min, zależnie od wspólnoty",
    hems: "Regionalne HEMS oraz śmigłowce Guardia Civil.",
    helicopterCapability: "dedicated",
    fleet: {
      helicopters: null,
      helicoptersLabel: "do zebrania per wspólnota",
      hoistEquipped: null,
      hoistEquippedLabel: "do zebrania per wspólnota",
      bases: null,
      basesLabel: "system regionalny + Guardia Civil",
      regionalAllocation:
        "Maszyny należą do wspólnot autonomicznych i służb państwowych.",
    },
    cost: "Najczęściej publiczne; wyjątki zależą od regionu i okoliczności.",
    language: "112; dostępność angielskiego zależy od regionu.",
    confidence: "średnia",
    summary: "Dobre zdolności, lecz system jest zdecentralizowany.",
    caveats: ["Wyspy i odległe rejony wymagają osobnej oceny."],
    sources: [
      {
        label: "Guardia Civil GREIM",
        url: "https://www.guardiacivil.es/en/institucional/Conocenos/especialidades/Greim/",
      },
    ],
  },
  HR: {
    country: "Chorwacja",
    rating: "limited",
    mountainService: "HGSS",
    ambulanceTime: "zwykle 20–45 min; wyspy i góry dłużej",
    mountainTime: "często 1–3 h w trudnym terenie",
    hems: "Zdolności lotnicze rozwijają się; wsparcie bywa wojskowe lub regionalne.",
    helicopterCapability: "mixed",
    fleet: {
      helicopters: null,
      helicoptersLabel: "do weryfikacji",
      hoistEquipped: null,
      hoistEquippedLabel: "do weryfikacji",
      bases: null,
      basesLabel: "HEMS i wsparcie wojskowe",
      regionalAllocation:
        "Dostępność zależy od bazy, sezonu i wsparcia sił zbrojnych.",
    },
    cost: "Akcje HGSS są obecnie zasadniczo bezpłatne.",
    language: "112; w rejonach turystycznych angielski jest częsty.",
    confidence: "średnia",
    summary:
      "Bardzo kompetentne zespoły naziemne przy ograniczonej dostępności lotniczej.",
    caveats: ["Czas dotarcia na wyspy i w masyw Biokovo może być długi."],
    sources: [{ label: "HGSS", url: "https://www.hgss.hr/" }],
  },
  EL: {
    country: "Grecja",
    rating: "limited",
    mountainService: "Straż Pożarna, Hellenic Rescue Team i zespoły lokalne",
    ambulanceTime: "bardzo zmienny; na wyspach często ponad 30–60 min",
    mountainTime: "często kilka godzin w terenie górskim i na wyspach",
    hems: "Brak jednolitej, gęstej sieci dedykowanego ratownictwa górskiego HEMS.",
    helicopterCapability: "limited",
    fleet: {
      helicopters: 0,
      helicoptersLabel: "0 w jednolitej górskiej flocie HEMS",
      hoistEquipped: null,
      hoistEquippedLabel: "brak gwarantowanej dostępności",
      bases: 0,
      basesLabel: "brak dedykowanej sieci górskiej",
      regionalAllocation:
        "Wyspy i regiony proszą o zasoby wojskowe, policyjne lub prywatne.",
    },
    cost: "Publiczna pomoc zasadniczo bezpłatna; transport prywatny może być płatny.",
    language: "112; komunikacja po angielsku poza centrami bywa problemem.",
    confidence: "niska",
    summary:
      "Warunki są silnie regionalne; największym ryzykiem są wyspy, koordynacja i brak szybkiego dostępu do wyspecjalizowanej maszyny.",
    caveats: [
      "Ocena nie przesądza o wyniku konkretnego wezwania.",
      "Kalymnos i inne wyspy wymagają danych lokalnych, nie średniej krajowej.",
      "Manikia leży na drogowo połączonej z lądem Eubei, ale nie ma gwarantowanego ratownictwa ścianowego ani szybkiej wyciągarki.",
    ],
    sources: [
      { label: "EKAB", url: "https://www.ekab.gr/" },
      { label: "Hellenic Rescue Team", url: "https://hrt.org.gr/" },
    ],
  },
  TR: {
    country: "Turcja",
    rating: "limited",
    mountainService: "AFAD, JAK i regionalne zespoły SAR",
    ambulanceTime: "duże różnice między metropoliami i interiorami",
    mountainTime: "od poniżej godziny do wielu godzin",
    hems: "Krajowa flota ambulansów lotniczych; dostępność górska jest nierówna.",
    helicopterCapability: "mixed",
    fleet: {
      helicopters: 20,
      helicoptersLabel: "minimum 20; do potwierdzenia",
      hoistEquipped: null,
      hoistEquippedLabel: "do weryfikacji",
      bases: null,
      basesLabel: "krajowa sieć; liczba baz do weryfikacji",
      regionalAllocation:
        "Zdolności medyczne nie oznaczają automatycznie dostępu do wyciągarki.",
    },
    cost: "Zależy od operatora i statusu ubezpieczenia podróżnego.",
    language: "112; angielski poza turystycznymi ośrodkami nie jest pewny.",
    confidence: "niska",
    summary:
      "Istnieją znaczące zasoby lotnicze, ale sama liczba maszyn nie opisuje zdolności linowych.",
    caveats: ["Nie każdy śmigłowiec medyczny wykonuje podjęcie ze ściany."],
    sources: [{ label: "AFAD", url: "https://en.afad.gov.tr/" }],
  },
};

export const ratingLabels: Record<RescueRating, string> = {
  elite: "Światowa czołówka",
  leading: "Bardzo dobra zdolność",
  strong: "Dobra zdolność",
  adequate: "Wystarczająca zdolność",
  guarded: "Wymaga ostrożności",
  limited: "Poważne ograniczenia",
  critical: "Wysokie ryzyko",
};

export const regionalRescueRatings: Record<string, RescueRating> = {
  EL3: "adequate",
  EL4: "critical",
  EL5: "guarded",
  EL6: "limited",
};

export const regionalRescueNotes: Record<string, string> = {
  EL3: "Attyka ma najlepszy w Grecji dostęp do karetek i szpitali; ratownictwo w trudnym terenie nadal nie jest alpejskim HEMS.",
  EL4: "Wyspy Egejskie i Kreta mają największe ryzyko opóźnionego dotarcia oraz transportu między wyspą a szpitalem.",
  EL5: "Północna Grecja ma lepszy dostęp drogowy niż wyspy, ale czas pomocy w górach jest bardzo nierówny.",
  EL6: "Region obejmuje m.in. Eubeę z Manikią. Dojazd z lądu jest możliwy, lecz szybkie podjęcie ze ściany i wyciągarka nie są gwarantowane.",
};

export const regionalPolishNames: Record<string, string> = {
  EL3: "Attyka",
  EL4: "Wyspy Egejskie i Kreta",
  EL5: "Grecja Północna",
  EL6: "Grecja Centralna",
};

// Wstępna warstwa porównawcza. Szczegółowe profile i źródła będą ją zastępować
// w miarę zbierania danych regionalnych.
export const provisionalCountryRatings: Record<string, RescueRating> = {
  AT: "elite",
  CH: "elite",
  DE: "leading",
  FR: "leading",
  NO: "leading",
  CZ: "strong",
  ES: "strong",
  FI: "strong",
  IT: "strong",
  PL: "strong",
  SE: "strong",
  SI: "strong",
  BE: "adequate",
  DK: "adequate",
  IE: "adequate",
  IS: "adequate",
  LI: "adequate",
  LU: "adequate",
  NL: "adequate",
  PT: "adequate",
  SK: "adequate",
  EE: "guarded",
  HR: "guarded",
  LT: "guarded",
  LV: "guarded",
  MT: "guarded",
  RO: "guarded",
  BG: "guarded",
  CY: "guarded",
  AL: "limited",
  BA: "limited",
  ME: "limited",
  MK: "limited",
  RS: "limited",
  TR: "limited",
  XK: "limited",
  EL: "critical",
};
