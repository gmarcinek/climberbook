export const supportedLocales = ["pl", "en"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = "pl";

const informationMessages = {
  pl: {
    modalTriggerLabel: "Wyjaśnienie: {title}",
    modalConfirmLabel: "OK",
    modalInfoLabel: "Info",
    entries: {
      trainingVolume: {
        title: "Objętość treningowa",
        description:
          "**Jak czytać wartość?**\n\n**25%**, **50%**, **75%** i **100%** określają, jaką część objętości pełnej drogi zawodnik wykonał. **100%** oznacza objętość odpowiadającą całej drodze, niezależnie od stylu.\n\n**Czego nie oznacza?**\n\nNie określa ani prowadzenia, ani stylu przejścia, takiego jak **RP** czy **flash**.\n\n**Wartość ponad 100%**\n\nObjętość może przekroczyć **100%**, np. do **150%**, gdy długie wiszenie lub ponowne próby dały objętość większą niż jedno pełne przejście drogi.",
      },
      ropeRouteGrades: {
        title: "Skale dróg na linie",
        description:
          "Porównanie jest **orientacyjne**: wyceny zależą także od charakteru drogi i lokalnych zwyczajów.\n\n| Francuska | Kurtyki | USA (YDS) |\n| --- | --- | --- |\n| 4a | IV | 5.2 |\n| 4b | IV | 5.3 |\n| 4c | IV+ | 5.4 |\n| 5a | V- | 5.5 |\n| 5b | V | 5.6 |\n| 5c | V+ | 5.7 |\n| 6a | VI | 5.9 |\n| 6a+ | VI+ | 5.10a |\n| 6b | VI.1 | 5.10b |\n| 6b+ | VI.1+ | 5.10c |\n| 6c | VI.2 | 5.10d |\n| 6c+ | VI.2+ | 5.11a-b |\n| 7a | VI.3 | 5.11c-d |\n| 7a+ | VI.3+ | 5.12a |\n| 7b | VI.4 | 5.12b |\n| 7b+ | VI.4 | 5.12c |\n| 7c | VI.4+ | 5.12d |\n| 7c+ | VI.5 | 5.13a |\n| 8a | VI.5+ | 5.13b |\n| 8a+ | VI.5+ | 5.13c |\n| 8b | VI.6 | 5.13d |\n| 8b+ | VI.6+ | 5.14a |\n| 8c | VI.7 | 5.14b |\n| 8c+ | VI.7 | 5.14c |",
      },
      outdoorConditions: {
        title: "Warunki zewnętrzne",
        description:
          "Traktuj te dane jako **tło** dla treningu na zewnątrz. Nie opisują one dokładnie warunków panujących na ścianie ani w innej przestrzeni indoor.\n\nNa ścianie mogło być jeszcze cieplej lub bardziej wilgotno. Opisz takie różnice w polu **Samopoczucie i notatki** oraz wybierz **warunki subiektywne**. Te informacje będą miały wpływ na ocenę treningu przez Agenta.",
      },
      wellbeingAndNotes: {
        title: "Samopoczucie i notatki",
        description:
          'Zapisz odczucia po treningu, np. zmęczenie, ból, motywację, trudności lub istotne wydarzenia. Ten opis daje LLM lepszy kontekst do późniejszej analizy treningu.\n\n**Przykłady**\n\n"Bardzo ciepło, 30 stopni. Drogi na linie do połowy robiłem, bo wyżej było za gorąco."\n\n"Baldy. Generalnie sporo z nich robiłem ze schodzeniem. Do V5 RP, a V6 tylko mocne, prawie zrobione. Nadal boli bark."',
      },
      trainingFocus: {
        title: "Główny cel",
        description:
          "**Główny cel** opisuje dominujący akcent sesji. Gdyby jednym słowem opisać, co podczas tego treningu było trenowane najbardziej, byłoby to właśnie to pole.\n\nWybierz wartość, która najlepiej oddaje główny bodziec, nawet gdy sesja zawierała też elementy innych celów.",
      },
      trainingStimulusDistribution: {
        title: "Rozkład bodźca",
        description:
          "Pokazuje kumulację bodźców na treningach z uwzględnieniem ich szacunkowego podziału.\n\nMożesz wybrać, który parametr chcesz oglądać: **łączny bodziec**, **wytrzymałość tlenową**, **wytrzymałość siłową**, **siłę / moc** lub **siłę kontaktową**. Wybór pomaga sprawdzić, jak dany rodzaj obciążenia zmieniał się w wybranym okresie.",
      },
      trainingGradesAndSessions: {
        title: "Wyceny i sesje",
        description:
          "Pokazuje zarejestrowane wyceny dróg i problemów oraz sesje treningowe w wybranym okresie.\n\n**Legenda**\n\n- **Temperatura** i **wilgotność**: opcjonalne linie z warunkami zewnętrznymi zapisanymi przy treningach. Polami wyboru można je pokazać lub ukryć.\n- **Bodziec**: linia przedstawiająca szacunkową wielkość bodźca treningowego dla danej sesji.\n- **Lina**, **Moon**, **Kilter** i **baldy**: znaczniki sesji zarejestrowanych odpowiednio na drogach z liną, MoonBoardzie, KilterBoardzie i boulderach.\n- **Chwytotablica** i **Campus**: znaczniki treningów na chwytotablicy oraz campusie.\n- **Regeneracja**, **obwody** i **projekty**: intensywność sesji na spraywallu: odpowiednio lekka praca tlenowa (V1-V3), obwody (V3-V6) i projekty (V4-V7).",
      },
      boulderGymGrades: {
        title: "Wyceny boulderowe",
        description:
          "Wyceny są skalą używaną na boulderowni i nie są formalnie identyczne ze skalą **V**. Gdy nie ma dokładniejszego odpowiednika, można traktować je jako przybliżenie skali V.\n\n**Ściągawka skali V**\n\n| Fontainebleau | V | Boulderownia |\n| --- | --- | --- |\n| 6b | V1 | 1 |\n| 6b+ | V2 | 2 |\n| 6c | V3 | 3 |\n| 6c+ | V4 | 4 |\n| 7a | V5 | 5 |\n| 7a+ | V6 | 6 |\n| 7b | V7 | 7 |\n| 7b+ | V8 | 8 |\n| 7c | V9 | 9 |",
      },
      moonBoardGrades: {
        title: "Wyceny MoonBoard",
        description:
          "MoonBoard jest zazwyczaj wyceniany w skali **Fontainebleau**. W tym formularzu używamy skali **V**, ponieważ pozwala na bardziej granularny zapis trudności.\n\n**Ściągawka: V → Fontainebleau**\n\n| V | Fontainebleau |\n| --- | --- |\n| V1 | 6b |\n| V2 | 6b+ |\n| V3 | 6c |\n| V4 | 6c+ |\n| V5 | 7a |\n| V6 | 7a+ |\n| V7 | 7b |\n| V8 | 7b+ |\n| V9 | 7c |",
      },
      kilterBoardGrades: {
        title: "Wyceny KilterBoard",
        description:
          "KilterBoard jest zazwyczaj wyceniany w skali **Fontainebleau**. W tym formularzu używamy skali **V**, ponieważ pozwala na bardziej granularny zapis trudności.\n\n**Ściągawka: V → Fontainebleau**\n\n| V | Fontainebleau |\n| --- | --- |\n| V1 | 6b |\n| V2 | 6b+ |\n| V3 | 6c |\n| V4 | 6c+ |\n| V5 | 7a |\n| V6 | 7a+ |\n| V7 | 7b |\n| V8 | 7b+ |\n| V9 | 7c |",
      },
    },
  },
  en: {
    modalTriggerLabel: "Explanation: {title}",
    modalConfirmLabel: "OK",
    modalInfoLabel: "Info",
    entries: {
      trainingVolume: {
        title: "Training volume",
        description:
          "**How to read the value**\n\n**25%**, **50%**, **75%**, and **100%** describe how much of a full route's volume the athlete completed after bouldering. **100%** means volume equivalent to the entire route, regardless of ascent style.\n\n**What it does not mean**\n\nIt does not specify whether the route was led or the ascent style, such as **redpoint** or **flash**.\n\n**A value above 100%**\n\nVolume may exceed **100%**, for example **150%**, when prolonged hanging or repeated attempts produced more volume than one full route.",
      },
      ropeRouteGrades: {
        title: "Rope route scales",
        description:
          "This comparison is **approximate**: grades also depend on route character and local conventions.\n\n| French | Kurtyka | USA (YDS) |\n| --- | --- | --- |\n| 4a | IV | 5.2 |\n| 4b | IV | 5.3 |\n| 4c | IV+ | 5.4 |\n| 5a | V- | 5.5 |\n| 5b | V | 5.6 |\n| 5c | V+ | 5.7 |\n| 6a | VI | 5.9 |\n| 6a+ | VI+ | 5.10a |\n| 6b | VI.1 | 5.10b |\n| 6b+ | VI.1+ | 5.10c |\n| 6c | VI.2 | 5.10d |\n| 6c+ | VI.2+ | 5.11a-b |\n| 7a | VI.3 | 5.11c-d |\n| 7a+ | VI.3+ | 5.12a |\n| 7b | VI.4 | 5.12b |\n| 7b+ | VI.4 | 5.12c |\n| 7c | VI.4+ | 5.12d |\n| 7c+ | VI.5 | 5.13a |\n| 8a | VI.5+ | 5.13b |\n| 8a+ | VI.5+ | 5.13c |\n| 8b | VI.6 | 5.13d |\n| 8b+ | VI.6+ | 5.14a |\n| 8c | VI.7 | 5.14b |\n| 8c+ | VI.7 | 5.14c |",
      },
      outdoorConditions: {
        title: "Outdoor conditions",
        description:
          "Treat these data as **background context** for outdoor training. They do not precisely describe conditions at a climbing gym or another indoor space.\n\nIt may have been warmer or more humid on the wall. Describe such differences in **Wellbeing and notes** and select the **subjective conditions**. This information will affect the Agent's assessment of the training session.",
      },
      wellbeingAndNotes: {
        title: "Wellbeing and notes",
        description:
          'Record how the session felt, such as fatigue, pain, motivation, difficulties, or important events. This description gives the LLM better context for later training analysis.\n\n**Examples**\n\n"Very warm, 30 degrees. I climbed rope routes only to halfway because it was too hot higher up."\n\n"Boulders. I downclimbed quite a few of them. Up to V5 redpoint, while V6 were only strong near-sends. My shoulder still hurts."',
      },
      trainingFocus: {
        title: "Primary focus",
        description:
          "**Primary focus** describes the dominant emphasis of the session. If one word had to describe what this workout trained the most, it would be this field.\n\nChoose the value that best reflects the main stimulus, even when the session also included elements of other goals.",
      },
      trainingStimulusDistribution: {
        title: "Stimulus distribution",
        description:
          "Shows the accumulated training stimuli while accounting for their estimated distribution.\n\nYou can choose which parameter to view: **total stimulus**, **aerobic endurance**, **strength endurance**, **strength / power**, or **contact strength**. The selection helps show how a particular type of load changed during the selected period.",
      },
      trainingGradesAndSessions: {
        title: "Grades and sessions",
        description:
          "Shows recorded route and problem grades together with training sessions for the selected period.\n\n**Legend**\n\n- **Temperature** and **humidity**: optional lines from outdoor conditions recorded with training sessions. Use the checkboxes to show or hide them.\n- **Stimulus**: a line showing the estimated size of the training stimulus for each session.\n- **Rope routes**, **Moon**, **Kilter**, and **boulders**: markers for sessions recorded on rope routes, MoonBoard, KilterBoard, and boulders respectively.\n- **Hangboard** and **campus**: markers for hangboard and campus-board sessions.\n- **Recovery**, **circuits**, and **projects**: spraywall session intensity: light aerobic work (V1-V3), circuits (V3-V6), and projects (V4-V7), respectively.",
      },
      boulderGymGrades: {
        title: "Bouldering grades",
        description:
          "These grades are used at the bouldering gym and are not formally identical to the **V scale**. When no more precise equivalent is available, they can be treated as an approximation of the V scale.\n\n**V-scale reference**\n\n| Fontainebleau | V | Gym grade |\n| --- | --- | --- |\n| 6b | V1 | 1 |\n| 6b+ | V2 | 2 |\n| 6c | V3 | 3 |\n| 6c+ | V4 | 4 |\n| 7a | V5 | 5 |\n| 7a+ | V6 | 6 |\n| 7b | V7 | 7 |\n| 7b+ | V8 | 8 |\n| 7c | V9 | 9 |",
      },
      moonBoardGrades: {
        title: "MoonBoard grades",
        description:
          "MoonBoard is usually graded using the **Fontainebleau scale**. This form uses the **V scale** because it provides a more granular record of difficulty.\n\n**Reference: V → Fontainebleau**\n\n| V | Fontainebleau |\n| --- | --- |\n| V1 | 6b |\n| V2 | 6b+ |\n| V3 | 6c |\n| V4 | 6c+ |\n| V5 | 7a |\n| V6 | 7a+ |\n| V7 | 7b |\n| V8 | 7b+ |\n| V9 | 7c |",
      },
      kilterBoardGrades: {
        title: "KilterBoard grades",
        description:
          "KilterBoard is usually graded using the **Fontainebleau scale**. This form uses the **V scale** because it provides a more granular record of difficulty.\n\n**Reference: V → Fontainebleau**\n\n| V | Fontainebleau |\n| --- | --- |\n| V1 | 6b |\n| V2 | 6b+ |\n| V3 | 6c |\n| V4 | 6c+ |\n| V5 | 7a |\n| V6 | 7a+ |\n| V7 | 7b |\n| V8 | 7b+ |\n| V9 | 7c |",
      },
    },
  },
} as const;

export type InformationKey =
  keyof (typeof informationMessages)["pl"]["entries"];

const informationModalMaxWidths: Partial<Record<InformationKey, string>> = {
  ropeRouteGrades: "58rem",
};

export function getInformationEntry(
  key: InformationKey,
  locale: SupportedLocale = defaultLocale,
) {
  return informationMessages[locale].entries[key];
}

export function getInformationModalMaxWidth(topic: InformationKey) {
  return informationModalMaxWidths[topic] ?? "30rem";
}

export function getInformationModalTriggerLabel(
  title: string,
  locale: SupportedLocale = defaultLocale,
) {
  return informationMessages[locale].modalTriggerLabel.replace(
    "{title}",
    title,
  );
}

export function getInformationModalConfirmLabel(
  locale: SupportedLocale = defaultLocale,
) {
  return informationMessages[locale].modalConfirmLabel;
}

export function getInformationModalInfoLabel(
  locale: SupportedLocale = defaultLocale,
) {
  return informationMessages[locale].modalInfoLabel;
}
