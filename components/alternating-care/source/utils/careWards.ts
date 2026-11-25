import dayjs from 'dayjs';

export const WARD_KINDS = [
  'child',
  'animal',
  'property',
  'senior',
  'patient',
  'movable',
] as const;

export type WardKind = (typeof WARD_KINDS)[number];

// ISO weekday: 1 = Monday … 7 = Sunday.
export type Lesson = {
  id: string;
  weekday: number;
  start: number;
  end: number;
  subject: string;
  room?: string;
  color?: string;
};

export const LESSON_COLORS = [
  { value: '#c0262d', pl: 'Czerwony', en: 'Red' },
  { value: '#e0612f', pl: 'Pomarańczowy', en: 'Orange' },
  { value: '#c98a0c', pl: 'Bursztynowy', en: 'Amber' },
  { value: '#6b8f23', pl: 'Oliwkowy', en: 'Olive' },
  { value: '#2f8f5b', pl: 'Zielony', en: 'Green' },
  { value: '#1f7a8c', pl: 'Morski', en: 'Teal' },
  { value: '#1592b5', pl: 'Turkusowy', en: 'Cyan' },
  { value: '#2d6fbf', pl: 'Niebieski', en: 'Blue' },
  { value: '#24476b', pl: 'Granatowy', en: 'Navy' },
  { value: '#3f4fb8', pl: 'Indygo', en: 'Indigo' },
  { value: '#6d5bd0', pl: 'Fioletowy', en: 'Violet' },
  { value: '#b0408f', pl: 'Malinowy', en: 'Magenta' },
  { value: '#d14d7d', pl: 'Różowy', en: 'Pink' },
  { value: '#8a5a3c', pl: 'Brązowy', en: 'Brown' },
  { value: '#4f5d68', pl: 'Grafitowy', en: 'Slate' },
] as const;

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const normalizeSubject = (subject: string) =>
  subject
    .trim()
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Core subjects of Polish primary and secondary schools with fixed colours.
// `match` entries are phrases contained in the subject; `abbr` must equal a whole word.
const SCHOOL_SUBJECTS: Array<{
  name: string;
  color: string;
  match: string[];
  abbr?: string[];
}> = [
  { name: 'Język polski', color: '#c0262d', match: ['polski'], abbr: ['pol', 'jp'] },
  { name: 'Matematyka', color: '#2d6fbf', match: ['matematyk'], abbr: ['mat', 'matma'] },
  { name: 'Język angielski', color: '#6d5bd0', match: ['angielsk'], abbr: ['ang'] },
  {
    name: 'Język niemiecki',
    color: '#3f4fb8',
    match: ['niemieck', 'francusk', 'hiszpansk', 'rosyjsk', 'wlosk', 'lacin'],
    abbr: ['niem'],
  },
  {
    name: 'Historia i teraźniejszość',
    color: '#8a5a3c',
    match: ['historia i terazniejszosc'],
    abbr: ['hit'],
  },
  { name: 'Historia', color: '#8a5a3c', match: ['histori'], abbr: ['hist'] },
  {
    name: 'Wiedza o społeczeństwie',
    color: '#24476b',
    match: ['wiedza o spol', 'biznes i zarzadzanie', 'przedsiebiorczos'],
    abbr: ['wos', 'pp', 'biz'],
  },
  {
    name: 'Edukacja dla bezpieczeństwa',
    color: '#24476b',
    match: ['edukacja dla bezpieczenstwa'],
    abbr: ['edb'],
  },
  { name: 'Biologia', color: '#2f8f5b', match: ['biologi'], abbr: ['bio', 'biol'] },
  { name: 'Przyroda', color: '#2f8f5b', match: ['przyrod', 'edukacja zdrowotna'] },
  { name: 'Chemia', color: '#1f7a8c', match: ['chemi'], abbr: ['chem'] },
  { name: 'Fizyka', color: '#1592b5', match: ['fizyk'], abbr: ['fiz'] },
  { name: 'Geografia', color: '#6b8f23', match: ['geografi'], abbr: ['geo', 'geogr'] },
  { name: 'Informatyka', color: '#4f5d68', match: ['informatyk'], abbr: ['inf', 'info'] },
  { name: 'Technika', color: '#4f5d68', match: ['technik'], abbr: ['tech'] },
  { name: 'Plastyka', color: '#b0408f', match: ['plastyk'], abbr: ['plast'] },
  { name: 'Muzyka', color: '#d14d7d', match: ['muzyk'], abbr: ['muz'] },
  {
    name: 'Wychowanie do życia w rodzinie',
    color: '#d14d7d',
    match: ['wychowanie do zycia'],
    abbr: ['wdz', 'wdzwr'],
  },
  {
    name: 'Wychowanie fizyczne',
    color: '#e0612f',
    match: ['wychowanie fizyczne'],
    abbr: ['wf', 'w f'],
  },
  { name: 'Religia', color: '#c98a0c', match: ['religi', 'etyk'], abbr: ['rel'] },
  {
    name: 'Godzina wychowawcza',
    color: '#c98a0c',
    match: ['wychowawcz'],
    abbr: ['gw', 'zw'],
  },
  {
    name: 'Edukacja wczesnoszkolna',
    color: '#e0612f',
    match: ['wczesnoszkoln'],
  },
];

// Suggestions for the subject field.
export const SCHOOL_SUBJECT_NAMES = [
  'Język polski',
  'Matematyka',
  'Język angielski',
  'Język niemiecki',
  'Język francuski',
  'Język hiszpański',
  'Historia',
  'Historia i teraźniejszość',
  'Wiedza o społeczeństwie',
  'Biznes i zarządzanie',
  'Biologia',
  'Przyroda',
  'Chemia',
  'Fizyka',
  'Geografia',
  'Informatyka',
  'Technika',
  'Plastyka',
  'Muzyka',
  'Wychowanie fizyczne',
  'Edukacja dla bezpieczeństwa',
  'Edukacja zdrowotna',
  'Wychowanie do życia w rodzinie',
  'Religia',
  'Etyka',
  'Godzina wychowawcza',
  'Edukacja wczesnoszkolna',
];

export function schoolSubjectColor(subject: string) {
  const normalized = normalizeSubject(subject);
  if (!normalized) return null;
  const words = normalized.split(' ');
  const found = SCHOOL_SUBJECTS.find(
    (entry) =>
      entry.match.some((phrase) =>
        phrase.includes(' ')
          ? normalized.includes(phrase)
          : words.some((word) => word.startsWith(phrase)),
      ) ||
      entry.abbr?.some((abbr) =>
        abbr.includes(' ') ? normalized === abbr : words.includes(abbr),
      ),
  );
  return found?.color ?? null;
}

// Core school subjects always use their fixed colour; other subjects use the
// chosen colour or a stable colour derived from the subject name.
export function lessonColor(lesson: Pick<Lesson, 'subject' | 'color'>) {
  const fixed = schoolSubjectColor(lesson.subject);
  if (fixed) return fixed;
  if (lesson.color && COLOR_PATTERN.test(lesson.color)) return lesson.color;
  const key = normalizeSubject(lesson.subject);
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return LESSON_COLORS[hash % LESSON_COLORS.length].value;
}

export type LessonPlan = {
  validFrom?: string | null;
  validTo?: string | null;
  lessons: Lesson[];
};

export type CareWard = {
  id?: string;
  name: string;
  kind: WardKind;
  note?: string | null;
  birthDate?: string | null;
  lessonPlan?: LessonPlan;
};

export const EMPTY_LESSON_PLAN: LessonPlan = { lessons: [] };

export const WARD_KIND_LABELS: Record<WardKind, { pl: string; en: string }> = {
  child: { pl: 'Dziecko', en: 'Child' },
  animal: { pl: 'Zwierzę', en: 'Animal' },
  property: { pl: 'Nieruchomość', en: 'Property' },
  senior: { pl: 'Osoba starsza', en: 'Senior' },
  patient: { pl: 'Pacjent', en: 'Patient' },
  movable: { pl: 'Ruchomość', en: 'Movable item' },
};

export const isWardKind = (value: unknown): value is WardKind =>
  typeof value === 'string' && (WARD_KINDS as readonly string[]).includes(value);

// Avatar subject used with the shared care avatars API ("other:ward:<id>").
export const wardAvatarSubject = (id: string) => `ward:${id}`;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (value: unknown): value is string =>
  typeof value === 'string' && DATE_PATTERN.test(value) && dayjs(value).isValid();

export const normalizeBirthDate = (value: unknown) =>
  isDate(value) && value <= dayjs().format('YYYY-MM-DD') ? value : null;

// Returns null when the payload is not a valid lesson plan.
export function normalizeLessonPlan(value: unknown): LessonPlan | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.lessons) || raw.lessons.length > 200) return null;
  const lessons: Lesson[] = [];
  for (const item of raw.lessons) {
    if (!item || typeof item !== 'object') return null;
    const lesson = item as Record<string, unknown>;
    const subject =
      typeof lesson.subject === 'string' ? lesson.subject.trim() : '';
    const room = typeof lesson.room === 'string' ? lesson.room.trim() : '';
    const color =
      typeof lesson.color === 'string' && COLOR_PATTERN.test(lesson.color)
        ? lesson.color.toLowerCase()
        : undefined;
    if (lesson.color !== undefined && lesson.color !== null && !color) {
      return null;
    }
    const { weekday, start, end } = lesson;
    if (
      typeof lesson.id !== 'string' ||
      lesson.id.length > 64 ||
      !subject ||
      subject.length > 80 ||
      room.length > 40 ||
      !Number.isInteger(weekday) ||
      (weekday as number) < 1 ||
      (weekday as number) > 7 ||
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      (start as number) < 0 ||
      (end as number) > 1440 ||
      (start as number) >= (end as number)
    ) {
      return null;
    }
    lessons.push({
      id: lesson.id,
      weekday: weekday as number,
      start: start as number,
      end: end as number,
      subject,
      ...(room ? { room } : {}),
      ...(color ? { color } : {}),
    });
  }
  const validFrom = isDate(raw.validFrom) ? raw.validFrom : null;
  const validTo = isDate(raw.validTo) ? raw.validTo : null;
  if (validFrom && validTo && validFrom > validTo) return null;
  return { validFrom, validTo, lessons };
}

export function wardAge(birthDate: string | null | undefined, today = dayjs()) {
  if (!birthDate) return null;
  const years = today.diff(dayjs(birthDate), 'year');
  return years >= 0 ? years : null;
}

export function formatAge(years: number, isEnglish: boolean) {
  if (isEnglish) return `${years} ${years === 1 ? 'year' : 'years'} old`;
  if (years === 1) return '1 rok';
  const lastDigit = years % 10;
  const lastTwo = years % 100;
  const few = lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14);
  return `${years} ${few ? 'lata' : 'lat'}`;
}
