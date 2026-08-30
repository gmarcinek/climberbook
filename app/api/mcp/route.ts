import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type {
  FacilityCapabilities,
  FacilityKind,
  TrainingSurface,
} from "@/lib/climbs-db";
import type { TrainingRecord, TrainingSummaryRecord } from "@/lib/climbs-db";
import {
  getObjectiveStimulusActivities,
  getStimulusCatalog,
} from "@/lib/training-stimulus";
import {
  completeAgentActionInPostgres,
  createAgentActionInPostgres,
  createAgentFeedItemInPostgres,
  createFacilityInPostgres,
  createGoalInPostgres,
  createTrainingInPostgres,
  createWeightEntryInPostgres,
  deleteTrainingSummaryFromPostgres,
  deleteGoalFromPostgres,
  getDefaultFacilityFromPostgres,
  getPostgresDatabaseSnapshot,
  getTrainingFromPostgres,
  listAgentActionsFromPostgres,
  listTrainingSummariesFromPostgres,
  listTrainingsFromPostgres,
  listWeightEntriesFromPostgres,
  searchFacilitiesFromPostgres,
  summarizeTrainingsInPostgres,
} from "@/lib/server/climberbook-repository";
import { getEntraActorId } from "@/lib/server/experimental-actor";
import { getPublicOrigin } from "@/lib/server/public-url";

export const runtime = "nodejs";

const mcpTransports = new Map<
  string,
  WebStandardStreamableHTTPServerTransport
>();

const readOnly = {
  readOnlyHint: true,
  openWorldHint: false,
  destructiveHint: false,
};
const write = {
  readOnlyHint: false,
  openWorldHint: false,
  destructiveHint: false,
};
const voiceAgentGuidelines = {
  declaredFacts:
    "Informację zadeklarowaną przez użytkownika uznaj za zebraną po pierwszym podaniu. Nie pytaj o nią ponownie, chyba że użytkownik ją poprawi lub sam zaprzeczy.",
  noRepeatedLists:
    "Kategoryczny zakaz powtarzania list danych, pytań lub elementów już potwierdzonych przez użytkownika. Nie wyliczaj, co zostało zapamiętane.",
  questions:
    "Dopytuj jednym krótkim, prostym pytaniem wprost, np. „Jakie było X?” albo „Co z X?”. Nie poprzedzaj pytania podsumowaniem zebranych danych.",
  finish:
    "Gdy wszystkie potrzebne dane są zebrane, powiedz dokładnie: „OK mam wszystko co potrzeba.” Następnie zakończ rozmowę albo wykonaj uzgodnioną akcję.",
};

function getOAuthSecuritySchemes() {
  const apiClientId = process.env.ENTRA_API_CLIENT_ID?.trim() ?? "";
  const requiredScope =
    process.env.ENTRA_REQUIRED_SCOPE?.trim() || "climberbook.access";
  const apiResource =
    process.env.ENTRA_API_RESOURCE?.trim() || `api://${apiClientId}`;
  return [
    { type: "oauth2" as const, scopes: [`${apiResource}/${requiredScope}`] },
  ];
}

function result(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

function error(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

function hasMeaningfulNotes(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= 24 &&
    value.trim().split(/\s+/).length >= 4
  );
}

function isFacilityKind(value: unknown): value is FacilityKind {
  return value === "indoor_wall" || value === "crag" || value === "crag_sector";
}

function getFacilityCoordinates(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as { latitude?: unknown; longitude?: unknown };
  if (input.latitude === null && input.longitude === null) {
    return { latitude: null, longitude: null };
  }
  if (
    typeof input.latitude !== "number" ||
    typeof input.longitude !== "number" ||
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude) ||
    input.latitude < -90 ||
    input.latitude > 90 ||
    input.longitude < -180 ||
    input.longitude > 180
  ) {
    return null;
  }
  return { latitude: input.latitude, longitude: input.longitude };
}

function getFacilityCapabilities(value: unknown): FacilityCapabilities | null {
  if (!value || typeof value !== "object") return null;
  const input = value as {
    activities?: unknown;
    ropeWalls?: unknown;
    hasAirConditioning?: unknown;
  };
  const supportedSurfaces: TrainingSurface[] = [
    "lina",
    "baldy",
    "moon",
    "drazek",
    "spraywall",
    "kilter",
    "silownia",
    "chwytotablica",
    "campus",
    "bieznia",
    "rower",
    "bieg",
    "treking",
  ];
  if (
    !Array.isArray(input.activities) ||
    !input.activities.every(
      (activity): activity is TrainingSurface =>
        typeof activity === "string" &&
        supportedSurfaces.includes(activity as TrainingSurface),
    ) ||
    !Array.isArray(input.ropeWalls) ||
    (input.hasAirConditioning !== undefined &&
      typeof input.hasAirConditioning !== "boolean")
  ) {
    return null;
  }
  return {
    activities: input.activities,
    ropeWalls: input.ropeWalls as FacilityCapabilities["ropeWalls"],
    hasAirConditioning: input.hasAirConditioning === true,
  };
}

function getContentTemplates() {
  return {
    version: 3,
    summary: {
      requiredTools: [
        "get_training_stimulus",
        "get_training_stimulus_dictionary",
      ],
      prompt:
        "Napisz unikalny komentarz trenerski po polsku, wyłącznie na podstawie pobranych danych treningu, bodźca i historii. Ma mieć 2-4 konkretne zdania: odnieś się do jednej rzeczy wykonanej na treningu oraz do jednego ostrożnego, praktycznego następnego kroku lub pytania. Nie kopiuj zwrotów z wcześniejszych komentarzy, nie używaj pustych pochwał typu 'dobra robota' ani stałych formuł o dokładnych notatkach. Coin opisuj jako miarę obciążenia, nie poziom formy. Gdy danych jest mało, nazwij ograniczenie zamiast dopowiadać fakty. Nie diagnozuj medycznie.",
      rules: [
        "Pobierz get_training_stimulus i get_training_stimulus_dictionary przed napisaniem coachComment.",
        "Nie twórz podsumowania bez confirmed: true.",
        "Nie przypisuj przyczyn, kontuzji ani gotowości bez danych użytkownika.",
        "Temperaturę wewnątrz bez pomiaru oznacz jako ostrożny szacunek, uwzględniając klimatyzację, zimę i brak informacji o ogrzewaniu.",
      ],
      formatting: {
        engine:
          "coachComment renderuje się jako markdown (react-markdown + remark-gfm) na wallu użytkownika, tak samo jak artykuły.",
        allowed: [
          "**pogrubienie** dla kluczowej liczby lub tezy",
          "`kod inline` dla jednostek/etykiet, np. `coin`",
          "krótka lista punktowana, gdy porównujesz kilka sesji w tygodniu/miesiącu",
        ],
        visualization:
          "Dla pojedynczego treningu (scope: training) nie rysuj paska - jest tylko jedna wartość, opisz ją zdaniem. Dla summarize_period z kilkoma sesjami (week, month) możesz dodać maksymalnie jedną linię z paskami █ (wypełnienie) i ░ (reszta) na sesję, proporcjonalnie do realnego zakresu coin z danych - nigdy nie zmyślaj wartości. To dodatek do 2-4 zdań, nie zamiennik. Każdą linię wykresu (etykietę i pasek) pisz jako nagłówek markdown ##### - zawsze dokładnie pięć znaków # (nigdy 3, 6, 7 ani inna liczba) plus spacja, nigdy zwykłym tekstem. Etykieta i pasek MUSZĄ mieć dokładnie tę samą liczbę # - nie różnicuj poziomu nagłówka między nimi. Są dwa dozwolone układy: (1) gdy wszystkie etykiety (np. daty) mają równą długość, jedna linia ##### z etykietą i paskiem razem: '##### DD.MM ████████░░░░░░░░░░░░ **wartość**'; (2) gdy etykiety mają różną długość, osobna linia ##### na etykietę i osobna linia ##### na pasek pod nią: '##### Etykieta' a pod spodem '##### ████████░░░░░░░░░░░░ **wartość**'.",
        example:
          "Przykład stylu dla podsumowania tygodnia z równymi etykietami-datami (dane ilustracyjne, nie do skopiowania): '**0,075 coin** 13 sierpnia to najmocniejszy bodziec tygodnia, prawie 2x wyższy niż linowe sesje z 10-12 sierpnia. ##### 10.08 ████████░░░░░░░░░░░░ **0,030** / ##### 13.08 ████████████████████ **0,075**. Fakt: przesunięcie w stronę baldów zwiększyło udział siły/mocy w coin. Warto sprawdzić na kolejnym treningu, czy ruch na rozgrzewce jest nadal dynamiczny.'",
      },
    },
    article: {
      structure: [
        "Konkretna teza wynikająca z danych użytkownika.",
        "Dowody: daty, objętość, coin, aktywności i cytowalne fakty z notatek.",
        "Interpretacja z wyraźnym rozróżnieniem faktu i hipotezy.",
        "Praktyczny następny krok lub pytanie do użytkownika.",
      ],
      rules: [
        "Publikuj wyłącznie przez publish_feed_item po oparciu treści na danych użytkownika.",
        "Minimum 80 znaków, język polski, bez ogólników i bez diagnoz medycznych.",
        "Nie publikuj artykułu, gdy dane nie dają wystarczającego materiału.",
      ],
      formatting: {
        engine:
          "body renderuje się jako markdown (react-markdown + remark-gfm) na wallu użytkownika.",
        allowed: [
          "nagłówki ### dla sekcji",
          "**pogrubienie** dla kluczowych liczb i tez",
          "`kod inline` dla jednostek/etykiet, np. `coin na sesję`",
          "listy punktowane dla faktów z sesji",
          "tabele GFM, gdy dane mają regularną strukturę",
        ],
        visualization:
          "Do pokazania trendu w czasie użyj poziomych pasków zbudowanych ze znaków Unicode █ (wypełnienie) i ░ (reszta) w linii tekstu, obok pogrubionej wartości liczbowej. Długość paska licz proporcjonalnie do realnego zakresu min-max danych z get_training_stimulus, nie z przykładu poniżej. Nigdy nie zmyślaj wartości - jeśli danych jest za mało na wiarygodny wykres, opisz to zamiast rysować pasek. Każdą linię wykresu (etykietę i pasek) pisz jako nagłówek markdown ##### - zawsze dokładnie pięć znaków # (nigdy 3, 6, 7 ani inna liczba) plus spacja, nigdy zwykłym tekstem ani nagłówkiem ###. Etykieta i pasek MUSZĄ mieć dokładnie tę samą liczbę # - nie różnicuj poziomu nagłówka między nimi. Są dwa dozwolone układy etykiety+pasek: (1) gdy wszystkie etykiety w zestawieniu mają równą długość (np. same daty DD.MM), etykieta i pasek w jednej linii #####: '##### DD.MM ████████░░░░░░░░░░░░ **wartość** opis'; (2) gdy etykiety mają różną długość (np. nazwy kanałów bodźca jak Tlenowa/Kontaktowa), osobna linia ##### na etykietę i osobna linia ##### na pasek pod nią, tak żeby wszystkie paski zaczynały się w tej samej kolumnie: '##### Etykieta' a pod spodem '##### ████████░░░░░░░░░░░░ **wartość**'. Sekcje artykułu (nietabelaryczne nagłówki) nadal pisz jako ### - ##### jest zarezerwowane wyłącznie dla linii wykresu.",
        example:
          "Poniższy tekst to WYŁĄCZNIE przykład stylu i formatu (nagłówki, pogrubienia, paski █░ w obu układach jako #####, rozróżnienie faktu od hipotezy) - liczby, daty i wnioski są ilustracyjne i nie wolno ich kopiować ani traktować jako prawdziwych danych:\n\n" +
          "### Oś czasu obciążenia\n" +
          "`coin na sesję`, etykiety równej długości - jedna linia ##### na wpis:\n" +
          "##### 01.08 ████████░░░░░░░░░░░░ **0,029** Lina + tablica\n" +
          "##### 08.08 ██████████████░░░░░░ **0,054** Baldy + tablica\n" +
          "##### 13.08 ████████████████████ **0,075** Baldy\n\n" +
          "**Fakt:** między 1 a 12 sierpnia większość sesji linowych mieści się w zakresie około 0,026-0,037 coin, natomiast 13 sierpnia bodziec rośnie do 0,075.\n\n" +
          "**Hipoteza treningowa:** to wygląda jak przejście od objętości na linie do bardziej specyficznego bodźca siłowo-mocowego na baldach - do potwierdzenia kolejnymi sesjami.\n\n" +
          "### Podział bodźca sesji z 13.08\n" +
          "Etykiety różnej długości (nazwy kanałów) - osobna linia ##### na etykietę i osobna ##### na pasek:\n" +
          "##### Tlenowa\n" +
          "##### ████████████░░░░░░░░ **0,0178**\n" +
          "##### Wytrzymałość siłowa\n" +
          "##### ██████░░░░░░░░░░░░░░ **0,0089**\n" +
          "##### Siła/moc\n" +
          "##### ████████████████░░░░ **0,0237**\n" +
          "##### Kontaktowa\n" +
          "##### ████░░░░░░░░░░░░░░░░ **0,0059**\n\n" +
          "**Fakt:** w tej sesji dominował kanał siła/moc, przy najniższym udziale kanału kontaktowego.",
      },
    },
    trainingNote: {
      requiredContext: {
        chwytotablica: ["warmup", "main"],
        campus: ["warmup", "main"],
      },
      question:
        "Czy chwytotablica/campus były rozgrzewką czy osobnym treningiem głównym? Zapisz odpowiedź w notes.",
    },
  };
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getWeekRange(date: string) {
  const current = new Date(`${date}T00:00:00.000Z`);
  const day = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() - day + 1);
  const start = toIsoDate(current);
  current.setUTCDate(current.getUTCDate() + 6);
  return { start, end: toIsoDate(current) };
}

function getMonthRange(date: string) {
  const [year, month] = date.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = toIsoDate(new Date(Date.UTC(year, month, 0)));
  return { start, end };
}

function getSummaryRecommendations(
  trainings: TrainingRecord[],
  summaries: TrainingSummaryRecord[],
) {
  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 2);
  const recentCutoff = toIsoDate(cutoff);
  const summarizedTrainingIds = new Set(
    summaries
      .filter((summary) => summary.scope === "training")
      .map((summary) => summary.trainingId),
  );
  const summarizedPeriods = new Set(
    summaries
      .filter((summary) => summary.scope !== "training")
      .map(
        (summary) =>
          `${summary.scope}:${summary.periodStart}:${summary.periodEnd}`,
      ),
  );
  const recommendations: Array<Record<string, unknown>> = [];

  for (const training of trainings) {
    if (
      training.date >= recentCutoff &&
      !summarizedTrainingIds.has(training.id)
    ) {
      recommendations.push({
        kind: "summarize_training",
        trainingId: training.id,
        title: `Podsumuj trening z ${training.date}`,
        requiresUserConfirmation: true,
        policy: "Trening jest z ostatnich dwóch miesięcy.",
      });
    }
  }

  const recentWeeks = new Map<string, { start: string; end: string }>();
  const olderMonths = new Map<string, { start: string; end: string }>();
  for (const training of trainings) {
    const range =
      training.date >= recentCutoff
        ? getWeekRange(training.date)
        : getMonthRange(training.date);
    const key = `${range.start}:${range.end}`;
    if (training.date >= recentCutoff) recentWeeks.set(key, range);
    else olderMonths.set(key, range);
  }

  for (const range of recentWeeks.values()) {
    if (!summarizedPeriods.has(`week:${range.start}:${range.end}`)) {
      recommendations.push({
        kind: "summarize_week",
        scope: "week",
        start: range.start,
        end: range.end,
        title: `Podsumuj tydzień ${range.start} - ${range.end}`,
        requiresUserConfirmation: true,
        policy: "Tydzień mieści się w ostatnich dwóch miesiącach.",
      });
    }
  }
  for (const range of olderMonths.values()) {
    if (!summarizedPeriods.has(`month:${range.start}:${range.end}`)) {
      recommendations.push({
        kind: "summarize_month",
        scope: "month",
        start: range.start,
        end: range.end,
        title: `Podsumuj miesiąc ${range.start.slice(0, 7)}`,
        requiresUserConfirmation: true,
        policy:
          "Starsze dane są proponowane wyłącznie jako podsumowanie zbiorcze miesiąca.",
      });
    }
  }
  return { recentCutoff, recommendations };
}

function createServer(request: Request) {
  const server = new Server(
    { name: "climberbook", version: "0.1.0" },
    { capabilities: { tools: { listChanged: true } } },
  );
  const securitySchemes = getOAuthSecuritySchemes();
  server.setRequestHandler(
    ListToolsRequestSchema,
    async () =>
      ({
        tools: [
          {
            name: "get_voice_agent_guidelines",
            title: "Pobierz zasady rozmowy głosowej",
            description:
              "Zwraca obowiązkowe zasady prowadzenia krótkiej rozmowy głosowej z użytkownikiem. Wywołaj raz na początku rozmowy, zanim zaczniesz zbierać dane.",
            inputSchema: { type: "object", properties: {} },
            annotations: readOnly,
            securitySchemes,
          },
          {
            name: "get_climbing_snapshot",
            title: "Pobierz dane wspinaczkowe",
            description:
              "Zwraca pełny, prywatny snapshot danych zalogowanego użytkownika.",
            inputSchema: { type: "object", properties: {} },
            annotations: readOnly,
            securitySchemes,
          },
          {
            name: "get_goals",
            title: "Pobierz cele zawodnika",
            description:
              "Zwraca cele nadrzędne i okresowe wraz z danymi potrzebnymi do oceny postępu.",
            inputSchema: { type: "object", properties: {} },
            annotations: readOnly,
            securitySchemes,
          },
          {
            name: "create_goal",
            title: "Ustaw cel zawodnika",
            description:
              "Tworzy cel wyłącznie po jasnym poleceniu użytkownika. kind: weight, training_count, route_grade, aerobic_coin albo strength_coin. Cel okresowy ma endDate; dla route_grade wymagane jest targetGrade, np. 8a.",
            inputSchema: {
              type: "object",
              properties: {
                athleteId: { type: "string" },
                kind: {
                  type: "string",
                  enum: [
                    "weight",
                    "training_count",
                    "route_grade",
                    "aerobic_coin",
                    "strength_coin",
                  ],
                },
                title: { type: "string" },
                targetValue: { type: "number" },
                targetGrade: { type: "string" },
                startDate: { type: "string" },
                endDate: { type: "string" },
              },
              required: ["kind", "title", "targetValue", "startDate"],
            },
            annotations: write,
            securitySchemes,
          },
          {
            name: "delete_goal",
            title: "Usuń cel zawodnika",
            description:
              "Usuwa cel dopiero po pokazaniu go użytkownikowi i uzyskaniu wyraźnego potwierdzenia.",
            inputSchema: {
              type: "object",
              properties: {
                goalId: { type: "string" },
                confirmed: { type: "boolean" },
              },
              required: ["goalId", "confirmed"],
            },
            annotations: { ...write, destructiveHint: true },
            securitySchemes,
          },
          {
            name: "get_training",
            title: "Pobierz pojedynczy trening",
            description: "Pobiera pełne dane jednego treningu.",
            inputSchema: {
              type: "object",
              properties: { trainingId: { type: "string" } },
              required: ["trainingId"],
            },
            annotations: readOnly,
            securitySchemes,
          },
          {
            name: "get_trainings_in_range",
            title: "Pobierz treningi z zakresu dat",
            description:
              "Pobiera treningi od start do end, włącznie; daty mają format YYYY-MM-DD.",
            inputSchema: {
              type: "object",
              properties: {
                start: { type: "string" },
                end: { type: "string" },
                athleteId: { type: "string" },
              },
              required: ["start", "end"],
            },
            annotations: readOnly,
            securitySchemes,
          },
          {
            name: "get_default_facility",
            title: "Pobierz domyślny obiekt",
            description:
              "Zwraca ostatnio użyty obiekt użytkownika, potem prywatny lub globalny obiekt.",
            inputSchema: { type: "object", properties: {} },
            annotations: readOnly,
            securitySchemes,
          },
          {
            name: "search_facilities",
            title: "Wyszukaj ścianę lub sektor",
            description:
              "Wyszukuje dostępne ściany, skały i sektory według nazwy albo lokalizacji.",
            inputSchema: {
              type: "object",
              properties: { query: { type: "string" } },
              required: ["query"],
            },
            annotations: readOnly,
            securitySchemes,
          },
          {
            name: "create_facility",
            title: "Dodaj nową ścianę lub sektor",
            description:
              "Najpierw użyj search_facilities. Gdy obiektu nie ma, znajdź jego współrzędne w publicznym źródle i przekaż je jako coordinates. Jeśli nie udało się potwierdzić współrzędnych, przekaż coordinates: { latitude: null, longitude: null }; obiekt nadal może zostać utworzony i przypisany do treningu. Nie twórz obiektu bez wyraźnego polecenia użytkownika.",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string" },
                kind: {
                  type: "string",
                  enum: ["indoor_wall", "crag", "crag_sector"],
                },
                locationLabel: { type: "string" },
                coordinates: {
                  type: "object",
                  properties: {
                    latitude: { type: ["number", "null"] },
                    longitude: { type: ["number", "null"] },
                  },
                  required: ["latitude", "longitude"],
                },
                capabilities: { type: "object" },
              },
              required: ["name", "kind", "coordinates", "capabilities"],
            },
            annotations: write,
            securitySchemes,
          },
          {
            name: "get_weight_entries",
            title: "Pobierz pomiary wagi",
            description:
              "Pobiera historię pomiarów masy ciała. Bez athleteId używa głównego zawodnika użytkownika. Opcjonalne start i end mają format YYYY-MM-DD.",
            inputSchema: {
              type: "object",
              properties: {
                athleteId: { type: "string" },
                start: { type: "string" },
                end: { type: "string" },
              },
            },
            annotations: readOnly,
            securitySchemes,
          },
          {
            name: "record_weight",
            title: "Zapisz pomiar wagi",
            description:
              "Zapisuje pojedynczy pomiar masy ciała od razu po jasnym poleceniu użytkownika, np. „dzisiaj się ważyłem o 9 i było 74.2”. Wymaga wartości weightKg, date (YYYY-MM-DD) i time (HH:MM). Bez athleteId zapisuje dla głównego zawodnika. Dopytuj użytkownika czy zapisać",
            inputSchema: {
              type: "object",
              properties: {
                athleteId: { type: "string" },
                date: { type: "string" },
                time: { type: "string" },
                weightKg: { type: "number" },
              },
              required: ["date", "time", "weightKg"],
            },
            annotations: write,
            securitySchemes,
          },
          {
            name: "get_training_stimulus_dictionary",
            title:
              "Pobierz słownik wartości bodźców treningowych - coinów, to zbiór reguł ile kosztuje każda aktywność i jaki bodziec treningowy kosztuje daje.",
            description:
              "Zwraca wersjonowany słownik algorytmu: znaczenie coinów, reguły objętości dla aktywności oraz cztery kanały bodźca/zmęczenia. Używaj go do interpretacji loadProfile i analizy treningów.",
            inputSchema: { type: "object", properties: {} },
            annotations: readOnly,
            securitySchemes,
          },
          {
            name: "get_training_stimulus",
            title: "Wyjaśnij bodziec treningu",
            description:
              "Zwraca obiektywną interpretację konkretnego treningu: surową objętość, coin dla każdej aktywności, sumę coinów i podział na kanały bodźca. Nie zmienia danych.",
            inputSchema: {
              type: "object",
              properties: { trainingId: { type: "string" } },
              required: ["trainingId"],
            },
            annotations: readOnly,
            securitySchemes,
          },
          {
            name: "get_content_templates",
            title: "Pobierz prompt podsumowań i artykułów",
            description:
              "Zwraca prompt i zasady dla unikalnych podsumowań treningowych, artykułów na wall oraz notatek o roli chwytotablicy/campusu.",
            inputSchema: { type: "object", properties: {} },
            annotations: readOnly,
            securitySchemes,
          },
          {
            name: "create_training",
            title: "Zbierz i zapisz trening",
            description:
              "Przed rozpoczęciem rozmowy wywołaj raz get_voice_agent_guidelines i bezwzględnie stosuj zwrócone zasady. Następnie wywołaj z mode=draft i poprowadź krótki wywiad, zadając jedno naturalne pytanie naraz. Zacznij od: co robiłeś/aś na treningu - lina, baldy czy coś innego? Dopytuj tylko o informacje, których jeszcze nie podał użytkownik: rozgrzewkę, cel, aktywności lub drogi, rezultat, trudności, samopoczucie ogólne i stan palców. Gdy użytkownik nie poda czasu, zapytaj: „Ile trwał - 2 godziny?”; po potwierdzeniu użyj fallbacku 120 minut. Przy linie dla każdej drogi zapytaj o całość/odcinek oraz procent ukończenia: 25%, 50%, 75% lub 100%; gdy użytkownik nie zna wartości, użyj 25% jako fallback i zaznacz niepewność. Po wywiadzie ułóż krótki opis w notes językiem naturalnym; rozgrzewkę, palce i postęp na drogach zapisuj tylko w notes, bez nowych pól wejściowych. Facility jest opcjonalne: gdy użytkownik poda miejsce, najpierw użyj search_facilities; jeśli nie istnieje, możesz po wyraźnym poleceniu utworzyć je przez create_facility, po znalezieniu współrzędnych w publicznym źródle lub z pustymi współrzędnymi. Jeśli użytkownik nie poda miejsca, zapisz trening bez facility. Pokaż użytkownikowi zebrane dane i dopiero po jego potwierdzeniu wywołaj mode=confirm. Nie wymyślaj danych.",
            inputSchema: {
              type: "object",
              properties: {
                mode: { type: "string", enum: ["draft", "confirm"] },
                athleteId: { type: "string" },
                date: { type: "string" },
                time: { type: "string" },
                durationMinutes: { type: "number" },
                surfaces: { type: "array", items: { type: "string" } },
                notes: { type: "string" },
                facilityId: { type: "string" },
                weatherSnapshot: { type: "object" },
                attemptsCount: { type: "number" },
                caloriesBurned: { type: "number" },
                wellbeing: { type: "string" },
                difficultyNotes: { type: "string" },
                difficultyBySurface: { type: "object" },
                ropeWallName: { type: "string" },
                ropeRoutes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      grade: { type: "string" },
                      ropeWallName: { type: "string" },
                      completed: { type: "number" },
                    },
                    required: ["grade", "ropeWallName", "completed"],
                  },
                },
                ageYears: { type: "number" },
                hangboardContext: {
                  type: "string",
                  enum: ["warmup", "main"],
                },
                campusContext: {
                  type: "string",
                  enum: ["warmup", "main"],
                },
              },
              required: ["mode"],
            },
            annotations: write,
            securitySchemes,
          },
          {
            name: "summarize_training",
            title: "Podsumuj trening",
            description:
              "Zapisuje faktograficzne podsumowanie treningu wyłącznie po wyraźnym potwierdzeniu użytkownika. Przed wywołaniem pobierz get_content_templates oraz dane bodźca, a następnie przekaż unikalny coachComment zgodny z promptem. Rekord jest tworzony tylko raz.",
            inputSchema: {
              type: "object",
              properties: {
                trainingId: { type: "string" },
                confirmed: { type: "boolean" },
                coachComment: { type: "string" },
              },
              required: ["trainingId", "confirmed", "coachComment"],
            },
            annotations: write,
            securitySchemes,
          },
          {
            name: "summarize_period",
            title: "Podsumuj tydzień lub miesiąc",
            description:
              "Zapisuje podsumowanie treningów w podanym okresie wyłącznie po wyraźnym potwierdzeniu użytkownika. Przed wywołaniem pobierz get_content_templates oraz dane bodźca, a następnie przekaż unikalny coachComment zgodny z promptem. Rekord jest tworzony tylko raz.",
            inputSchema: {
              type: "object",
              properties: {
                scope: { type: "string", enum: ["week", "month"] },
                start: { type: "string" },
                end: { type: "string" },
                confirmed: { type: "boolean" },
                coachComment: { type: "string" },
              },
              required: ["scope", "start", "end", "confirmed", "coachComment"],
            },
            annotations: write,
            securitySchemes,
          },
          {
            name: "delete_training_summary",
            title: "Usuń podsumowanie agenta",
            description:
              "Usuwa zapisane podsumowanie treningu, tygodnia lub miesiąca należące do użytkownika. Najpierw pokaż użytkownikowi podsumowanie i poproś o wyraźne potwierdzenie usunięcia.",
            inputSchema: {
              type: "object",
              properties: {
                summaryId: { type: "string" },
                confirmed: { type: "boolean" },
              },
              required: ["summaryId", "confirmed"],
            },
            annotations: { ...write, destructiveHint: true },
            securitySchemes,
          },
          {
            name: "get_agent_actions",
            title: "Pobierz zadania agenta",
            description:
              "Zwraca trwałą kolejkę TODO i rekomendacje podsumowania treningów.",
            inputSchema: { type: "object", properties: {} },
            annotations: readOnly,
            securitySchemes,
          },
          {
            name: "create_agent_action",
            title: "Dodaj zadanie agenta",
            description:
              "Dodaje wewnętrzne TODO wyłącznie dla agenta MCP. Nie jest wyświetlane w GUI.",
            inputSchema: {
              type: "object",
              properties: {
                kind: {
                  type: "string",
                  enum: [
                    "summarize_training",
                    "summarize_week",
                    "summarize_month",
                    "write_article",
                  ],
                },
                title: { type: "string" },
                details: { type: "object" },
              },
              required: ["kind", "title"],
            },
            annotations: write,
            securitySchemes,
          },
          {
            name: "complete_agent_action",
            title: "Oznacz zadanie agenta jako wykonane",
            description:
              "Oznacza istniejące zadanie jako wykonane po zrealizowaniu celu.",
            inputSchema: {
              type: "object",
              properties: { actionId: { type: "string" } },
              required: ["actionId"],
            },
            annotations: write,
            securitySchemes,
          },
          {
            name: "publish_feed_item",
            title: "Opublikuj wpis na wallu",
            description:
              "Publikuje widoczny dla użytkownika artykuł, news lub notatkę do treningu. Używaj tylko dla treści opartej na danych użytkownika. title i body muszą być konkretne, po polsku, bez ogólników; body ma opisywać fakty, nie diagnozy medyczne.",
            inputSchema: {
              type: "object",
              properties: {
                kind: {
                  type: "string",
                  enum: ["article", "news", "training_note"],
                },
                title: { type: "string" },
                body: { type: "string" },
                trainingId: { type: "string" },
              },
              required: ["kind", "title", "body"],
            },
            annotations: write,
            securitySchemes,
          },
        ],
      }) as never,
  );

  server.setRequestHandler(CallToolRequestSchema, async (message) => {
    const actorId = await getEntraActorId(request);
    if (typeof actorId !== "string") {
      return {
        ...error("Wymagane jest zalogowanie przez Entra External ID."),
        _meta: {
          "mcp/www_authenticate": [
            `Bearer resource_metadata="${getPublicOrigin(request)}/.well-known/oauth-protected-resource"`,
          ],
        },
      };
    }
    const args = (message.params.arguments ?? {}) as Record<string, unknown>;
    try {
      switch (message.params.name) {
        case "get_voice_agent_guidelines":
          return result(voiceAgentGuidelines);
        case "get_climbing_snapshot":
          return result(await getPostgresDatabaseSnapshot(actorId));
        case "get_goals": {
          const snapshot = await getPostgresDatabaseSnapshot(actorId);
          return result({ goals: snapshot.goals, athletes: snapshot.athletes });
        }
        case "create_goal": {
          const snapshot = await getPostgresDatabaseSnapshot(actorId);
          const athleteId =
            typeof args.athleteId === "string"
              ? args.athleteId
              : snapshot.athletes[0]?.id;
          const kind =
            args.kind === "weight" ||
            args.kind === "training_count" ||
            args.kind === "route_grade" ||
            args.kind === "aerobic_coin" ||
            args.kind === "strength_coin";
          if (
            !athleteId ||
            !kind ||
            typeof args.title !== "string" ||
            !args.title.trim() ||
            typeof args.targetValue !== "number" ||
            !Number.isFinite(args.targetValue) ||
            args.targetValue <= 0 ||
            !isDate(args.startDate) ||
            (args.endDate !== undefined && !isDate(args.endDate)) ||
            (isDate(args.endDate) && args.endDate < args.startDate) ||
            (args.kind === "route_grade" &&
              (typeof args.targetGrade !== "string" ||
                !args.targetGrade.trim()))
          ) {
            return error(
              "Wymagane są poprawne kind, title, targetValue, startDate oraz dla wyceny targetGrade; endDate nie może poprzedzać startDate.",
            );
          }
          return result(
            await createGoalInPostgres(actorId, {
              athleteId,
              kind: args.kind as
                | "weight"
                | "training_count"
                | "route_grade"
                | "aerobic_coin"
                | "strength_coin",
              title: args.title.trim(),
              targetValue: args.targetValue,
              targetGrade:
                typeof args.targetGrade === "string"
                  ? args.targetGrade.trim()
                  : undefined,
              startDate: args.startDate,
              endDate: isDate(args.endDate) ? args.endDate : undefined,
              status: "active",
            }),
          );
        }
        case "delete_goal":
          if (typeof args.goalId !== "string" || !args.goalId.trim())
            return error("goalId jest wymagane.");
          if (args.confirmed !== true)
            return error(
              "Usunięcie celu wymaga wyraźnego potwierdzenia użytkownika (confirmed: true).",
            );
          return result(await deleteGoalFromPostgres(actorId, args.goalId));
        case "get_training":
          return typeof args.trainingId === "string"
            ? result(await getTrainingFromPostgres(actorId, args.trainingId))
            : error("trainingId jest wymagane.");
        case "get_trainings_in_range":
          return isDate(args.start) &&
            isDate(args.end) &&
            args.start <= args.end
            ? result(
                await listTrainingsFromPostgres(
                  actorId,
                  typeof args.athleteId === "string"
                    ? args.athleteId
                    : undefined,
                  { start: args.start, end: args.end },
                ),
              )
            : error("start i end muszą być datami YYYY-MM-DD.");
        case "get_default_facility":
          return result(await getDefaultFacilityFromPostgres(actorId));
        case "search_facilities":
          return typeof args.query === "string"
            ? result(await searchFacilitiesFromPostgres(actorId, args.query))
            : error("query jest wymagane.");
        case "create_facility": {
          const name = typeof args.name === "string" ? args.name.trim() : "";
          const locationLabel =
            typeof args.locationLabel === "string"
              ? args.locationLabel.trim()
              : "";
          const coordinates = getFacilityCoordinates(args.coordinates);
          const capabilities = getFacilityCapabilities(args.capabilities);
          if (
            !name ||
            !isFacilityKind(args.kind) ||
            !coordinates ||
            !capabilities
          ) {
            return error(
              "name, kind, coordinates oraz capabilities są wymagane; współrzędne muszą być poprawną parą liczb albo null/null.",
            );
          }
          return result(
            await createFacilityInPostgres(actorId, {
              name,
              kind: args.kind,
              locationLabel,
              capabilities,
              ...coordinates,
            }),
          );
        }
        case "get_weight_entries": {
          const snapshot = await getPostgresDatabaseSnapshot(actorId);
          const athleteId =
            typeof args.athleteId === "string"
              ? args.athleteId
              : snapshot.athletes[0]?.id;
          if (!athleteId)
            return error("Brak zawodnika, dla którego można pobrać wagę.");
          return isDate(args.start) && isDate(args.end) && args.start > args.end
            ? error("start nie może być późniejsze niż end.")
            : result(
                await listWeightEntriesFromPostgres(
                  actorId,
                  athleteId,
                  isDate(args.start) && isDate(args.end)
                    ? { start: args.start, end: args.end }
                    : undefined,
                ),
              );
        }
        case "record_weight": {
          if (
            !isDate(args.date) ||
            !isTime(args.time) ||
            typeof args.weightKg !== "number" ||
            !Number.isFinite(args.weightKg) ||
            args.weightKg <= 0
          ) {
            return error(
              "date (YYYY-MM-DD), time (HH:MM) oraz dodatnie weightKg są wymagane.",
            );
          }
          const snapshot = await getPostgresDatabaseSnapshot(actorId);
          const athleteId =
            typeof args.athleteId === "string"
              ? args.athleteId
              : snapshot.athletes[0]?.id;
          if (!athleteId)
            return error("Brak zawodnika, dla którego można zapisać wagę.");
          return result(
            await createWeightEntryInPostgres(actorId, {
              athleteId,
              date: args.date,
              time: args.time,
              weightKg: args.weightKg,
            }),
          );
        }
        case "get_training_stimulus_dictionary":
          return result(getStimulusCatalog());
        case "get_training_stimulus": {
          if (typeof args.trainingId !== "string") {
            return error("trainingId jest wymagane.");
          }
          const snapshot = await getPostgresDatabaseSnapshot(actorId);
          const training = snapshot.trainings.find(
            (item) => item.id === args.trainingId,
          );
          if (!training) {
            return error("Nie znaleziono treningu należącego do użytkownika.");
          }
          const activities = getObjectiveStimulusActivities(
            training,
            snapshot.facilities,
            snapshot.trainings,
          );
          const dimensions = activities.reduce(
            (total, activity) => ({
              aerobicEndurance:
                total.aerobicEndurance +
                (activity.dimensionCoin?.aerobicEndurance ??
                  activity.coin * activity.dimensionSplit.aerobicEndurance),
              strengthEndurance:
                total.strengthEndurance +
                (activity.dimensionCoin?.strengthEndurance ??
                  activity.coin * activity.dimensionSplit.strengthEndurance),
              strengthPower:
                total.strengthPower +
                (activity.dimensionCoin?.strengthPower ??
                  activity.coin * activity.dimensionSplit.strengthPower),
              contactStrength:
                total.contactStrength +
                (activity.dimensionCoin?.contactStrength ??
                  activity.coin * activity.dimensionSplit.contactStrength),
            }),
            {
              aerobicEndurance: 0,
              strengthEndurance: 0,
              strengthPower: 0,
              contactStrength: 0,
            },
          );
          return result({
            algorithmVersion: getStimulusCatalog().algorithmVersion,
            trainingId: training.id,
            volume: {
              durationMinutes: training.durationMinutes,
              surfaces: training.surfaces,
              attemptsCount: training.attemptsCount,
              ropeRoutes: training.ropeRoutes ?? [],
              difficultyBySurface: training.difficultyBySurface ?? {},
              protocol: training.protocol ?? {},
            },
            activities,
            coin: Object.values(dimensions).reduce(
              (total, value) => total + value,
              0,
            ),
            dimensions,
          });
        }
        case "get_content_templates":
          return result(getContentTemplates());
        case "create_training": {
          const snapshot = await getPostgresDatabaseSnapshot(actorId);
          const facility =
            typeof args.facilityId === "string"
              ? (await searchFacilitiesFromPostgres(actorId, "")).find(
                  (item) => item.id === args.facilityId,
                )
              : await getDefaultFacilityFromPostgres(actorId);
          const missingFields = [
            ...(isDate(args.date) ? [] : ["date (YYYY-MM-DD)"]),
            ...(isTime(args.time) ? [] : ["time (HH:MM)"]),
            ...(Array.isArray(args.surfaces) && args.surfaces.length > 0
              ? []
              : ["surfaces"]),
            ...(hasMeaningfulNotes(args.notes)
              ? []
              : [
                  "notes: opis naturalnym językiem (cel, przebieg, odczucia i rezultat; min. 4 słowa / 24 znaki)",
                ]),
            ...(Array.isArray(args.surfaces) &&
            args.surfaces.includes("chwytotablica") &&
            args.hangboardContext !== "warmup" &&
            args.hangboardContext !== "main"
              ? ["hangboardContext: warmup albo main"]
              : []),
            ...(Array.isArray(args.surfaces) &&
            args.surfaces.includes("campus") &&
            args.campusContext !== "warmup" &&
            args.campusContext !== "main"
              ? ["campusContext: warmup albo main"]
              : []),
            ...((facility?.kind === "crag" ||
              facility?.kind === "crag_sector") &&
            !args.weatherSnapshot
              ? ["weatherSnapshot (dla skały lub sektora)"]
              : []),
          ];
          const weatherRequest =
            facility &&
            facility.latitude !== null &&
            facility.longitude !== null
              ? {
                  date: args.date,
                  time: args.time,
                  latitude: facility.latitude,
                  longitude: facility.longitude,
                }
              : null;
          if (args.mode !== "confirm" || missingFields.length > 0)
            return result({
              status: "draft",
              missingFields,
              suggestedFacility: facility,
              defaultAthleteId: snapshot.athletes[0]?.id ?? null,
              weatherRequest,
              noteQuestions: [
                "Co robiłeś/aś na treningu - lina, baldy czy coś innego?",
                ...(typeof args.durationMinutes === "number" &&
                args.durationMinutes > 0
                  ? []
                  : ["Ile trwał - 2 godziny?"]),
                ...(Array.isArray(args.surfaces) &&
                args.surfaces.includes("lina")
                  ? [
                      "Dla każdej drogi na linie: całość czy odcinek i ile procent ukończono: 25%, 50%, 75% czy 100%? Przy braku danych użyjemy 25% jako ostrożnego fallbacku.",
                    ]
                  : []),
                "Jak wyglądała rozgrzewka?",
                "Jaki był cel i co konkretnie udało się zrobić?",
                "Jak ogólnie się czułeś/aś i jak czuły się palce?",
                "Co było trudne, co poszło dobrze i jaki wniosek chcesz zapamiętać?",
                ...(Array.isArray(args.surfaces) &&
                args.surfaces.includes("chwytotablica")
                  ? [
                      "Czy chwytotablica była rozgrzewką (warmup) czy osobnym treningiem głównym (main)?",
                    ]
                  : []),
                ...(Array.isArray(args.surfaces) &&
                args.surfaces.includes("campus")
                  ? [
                      "Czy campus był rozgrzewką (warmup) czy osobnym treningiem głównym (main)?",
                    ]
                  : []),
              ],
            });
          if (
            !isDate(args.date) ||
            !isTime(args.time) ||
            !Array.isArray(args.surfaces) ||
            !hasMeaningfulNotes(args.notes) ||
            (args.surfaces.includes("chwytotablica") &&
              args.hangboardContext !== "warmup" &&
              args.hangboardContext !== "main") ||
            (args.surfaces.includes("campus") &&
              args.campusContext !== "warmup" &&
              args.campusContext !== "main")
          )
            return error("Niepełne dane treningu.");
          const athleteId =
            typeof args.athleteId === "string"
              ? args.athleteId
              : snapshot.athletes[0]?.id;
          if (!athleteId)
            return error("Brak zawodnika, dla którego można zapisać trening.");
          return result(
            await createTrainingInPostgres(actorId, {
              athleteId,
              date: args.date,
              time: args.time,
              durationMinutes:
                typeof args.durationMinutes === "number" &&
                args.durationMinutes > 0
                  ? args.durationMinutes
                  : 120,
              surfaces: args.surfaces as TrainingSurface[],
              notes: [
                args.notes.trim(),
                ...(args.surfaces.includes("chwytotablica")
                  ? [
                      `Kontekst chwytotablicy: ${args.hangboardContext === "warmup" ? "rozgrzewka" : "trening główny"}.`,
                    ]
                  : []),
                ...(args.surfaces.includes("campus")
                  ? [
                      `Kontekst campusu: ${args.campusContext === "warmup" ? "rozgrzewka" : "trening główny"}.`,
                    ]
                  : []),
              ].join(" "),
              facilityId: facility?.id,
              facilityName: facility?.name,
              facilityVersion: facility?.currentVersion,
              weatherSnapshot: args.weatherSnapshot as never,
              attemptsCount:
                typeof args.attemptsCount === "number" ? args.attemptsCount : 0,
              caloriesBurned:
                typeof args.caloriesBurned === "number"
                  ? args.caloriesBurned
                  : 0,
              wellbeing:
                typeof args.wellbeing === "string" ? args.wellbeing : "",
              difficultyNotes:
                typeof args.difficultyNotes === "string"
                  ? args.difficultyNotes
                  : "",
              difficultyBySurface:
                args.difficultyBySurface &&
                typeof args.difficultyBySurface === "object" &&
                !Array.isArray(args.difficultyBySurface)
                  ? (args.difficultyBySurface as TrainingRecord["difficultyBySurface"])
                  : undefined,
              ropeWallName:
                typeof args.ropeWallName === "string"
                  ? args.ropeWallName
                  : undefined,
              ropeRoutes: Array.isArray(args.ropeRoutes)
                ? (args.ropeRoutes.filter(
                    (
                      route,
                    ): route is {
                      grade: string;
                      ropeWallName: string;
                      completed: number;
                    } =>
                      typeof route === "object" &&
                      route !== null &&
                      typeof route.grade === "string" &&
                      typeof route.ropeWallName === "string" &&
                      typeof route.completed === "number",
                  ) as TrainingRecord["ropeRoutes"])
                : undefined,
              ageYears: typeof args.ageYears === "number" ? args.ageYears : 0,
            }),
          );
        }
        case "summarize_training": {
          if (typeof args.trainingId !== "string")
            return error("trainingId jest wymagane.");
          if (args.confirmed !== true)
            return error(
              "Podsumowanie wymaga wyraźnego potwierdzenia użytkownika (confirmed: true).",
            );
          if (!hasMeaningfulNotes(args.coachComment))
            return error(
              "coachComment musi zawierać konkretny komentarz na podstawie danych treningu.",
            );
          const training = await getTrainingFromPostgres(
            actorId,
            args.trainingId,
          );
          return result(
            await summarizeTrainingsInPostgres({
              ownerUserId: actorId,
              scope: "training",
              periodStart: training.date,
              periodEnd: training.date,
              trainingId: training.id,
              coachComment: args.coachComment.trim(),
            }),
          );
        }
        case "summarize_period":
          return (args.scope === "week" || args.scope === "month") &&
            isDate(args.start) &&
            isDate(args.end) &&
            args.start <= args.end &&
            args.confirmed === true &&
            hasMeaningfulNotes(args.coachComment)
            ? result(
                await summarizeTrainingsInPostgres({
                  ownerUserId: actorId,
                  scope: args.scope,
                  periodStart: args.start,
                  periodEnd: args.end,
                  coachComment: args.coachComment.trim(),
                }),
              )
            : error(
                "scope, start, end, coachComment oraz wyraźne confirmed: true są wymagane.",
              );
        case "delete_training_summary":
          if (typeof args.summaryId !== "string" || !args.summaryId.trim())
            return error("summaryId jest wymagane.");
          if (args.confirmed !== true)
            return error(
              "Usunięcie podsumowania wymaga wyraźnego potwierdzenia użytkownika (confirmed: true).",
            );
          return result(
            await deleteTrainingSummaryFromPostgres(actorId, args.summaryId),
          );
        case "get_agent_actions": {
          const [actions, trainings, summaries] = await Promise.all([
            listAgentActionsFromPostgres(actorId),
            listTrainingsFromPostgres(actorId),
            listTrainingSummariesFromPostgres(actorId),
          ]);
          return result({
            actions,
            ...getSummaryRecommendations(trainings, summaries),
          });
        }
        case "create_agent_action":
          return (args.kind === "summarize_training" ||
            args.kind === "summarize_week" ||
            args.kind === "summarize_month" ||
            args.kind === "write_article") &&
            typeof args.title === "string" &&
            args.title.trim()
            ? result(
                await createAgentActionInPostgres(actorId, {
                  kind: args.kind,
                  title: args.title.trim(),
                  details:
                    args.details &&
                    typeof args.details === "object" &&
                    !Array.isArray(args.details)
                      ? (args.details as Record<string, unknown>)
                      : {},
                }),
              )
            : error("Poprawne kind i title są wymagane.");
        case "complete_agent_action":
          return typeof args.actionId === "string"
            ? result(
                await completeAgentActionInPostgres(actorId, args.actionId),
              )
            : error("actionId jest wymagane.");
        case "publish_feed_item":
          return (args.kind === "article" ||
            args.kind === "news" ||
            args.kind === "training_note") &&
            typeof args.title === "string" &&
            args.title.trim().length >= 8 &&
            typeof args.body === "string" &&
            args.body.trim().length >= 80
            ? result(
                await createAgentFeedItemInPostgres(actorId, {
                  kind: args.kind,
                  title: args.title,
                  body: args.body,
                  trainingId:
                    typeof args.trainingId === "string"
                      ? args.trainingId
                      : undefined,
                }),
              )
            : error(
                "kind, konkretny title (min. 8 znaków) i merytoryczny body (min. 80 znaków) są wymagane.",
              );
        default:
          return error("Nieznane narzędzie MCP.");
      }
    } catch (caught) {
      return error(
        caught instanceof Error
          ? caught.message
          : "Nie udało się wykonać narzędzia MCP.",
      );
    }
  });
  return server;
}

async function handleMcpRequest(request: Request) {
  const sessionId = request.headers.get("mcp-session-id");
  let transport = sessionId ? mcpTransports.get(sessionId) : undefined;

  if (sessionId && !transport) {
    return Response.json(
      {
        jsonrpc: "2.0",
        error: { code: -32001, message: "Nie znaleziono sesji MCP." },
        id: null,
      },
      { status: 404 },
    );
  }
  if (!transport && request.method !== "POST") {
    return Response.json(
      {
        jsonrpc: "2.0",
        error: { code: -32600, message: "Inicjalizacja MCP wymaga POST." },
        id: null,
      },
      { status: 400 },
    );
  }
  if (!transport) {
    let initializedSessionId: string | undefined;
    transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: (newSessionId) => {
        initializedSessionId = newSessionId;
        mcpTransports.set(newSessionId, transport!);
      },
    });
    transport.onclose = () => {
      if (initializedSessionId) mcpTransports.delete(initializedSessionId);
    };
    await createServer(request).connect(transport);
  }
  return transport.handleRequest(request);
}

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
export const DELETE = handleMcpRequest;
