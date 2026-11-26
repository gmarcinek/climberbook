export const CAREGIVER_BACKGROUNDS = [
  '#9b8d9b',
  '#8b6f9f',
  '#b06f65',
  '#6f8b78',
  '#8c7a55',
  '#5f8796',
] as const;

const OTHER_PARENT_BACKGROUND = CAREGIVER_BACKGROUNDS[0];
const OTHER_CAREGIVER_BACKGROUNDS = CAREGIVER_BACKGROUNDS.slice(1);

export type CaregiverColors = Record<string, string>;

// Light theme keeps color; other themes store their own picks in 	hemeColors.
export function caregiverThemeColor(
  caregiver: { color?: string | null; themeColors?: Record<string, string> | null },
  theme: string
): string | null {
  const color =
    theme === 'light' ? caregiver.color : caregiver.themeColors?.[theme];
  return isCareColor(color) ? color : null;
}

export const CARE_COLORS_QUERY_KEY = ['caregiverColors'];

export const isCareColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

// Accepts a subjectId or a `CARE:<subjectId>` group id.
export function caregiverBackground(subjectId: string, colors?: CaregiverColors) {
  const id = subjectId.replace(/^CARE:/, '');
  const custom = colors?.[id];
  if (custom) return custom;
  if (id.startsWith('other:')) return OTHER_PARENT_BACKGROUND;
  const hash = Array.from(id).reduce(
    (value, character) => value + character.charCodeAt(0),
    0
  );
  return OTHER_CAREGIVER_BACKGROUNDS[hash % OTHER_CAREGIVER_BACKGROUNDS.length];
}
