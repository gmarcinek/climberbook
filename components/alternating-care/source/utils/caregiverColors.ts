export const CAREGIVER_BACKGROUNDS = [
  '#9b8d9b',
  '#8b6f9f',
  '#b06f65',
  '#6f8b78',
  '#8c7a55',
  '#5f8796',
] as const;

export function caregiverBackground(subjectId: string, position = 0) {
  if (position > 0) {
    return CAREGIVER_BACKGROUNDS[(position - 1) % CAREGIVER_BACKGROUNDS.length];
  }
  const hash = Array.from(subjectId).reduce(
    (value, character) => value + character.charCodeAt(0),
    0
  );
  return CAREGIVER_BACKGROUNDS[hash % CAREGIVER_BACKGROUNDS.length];
}
