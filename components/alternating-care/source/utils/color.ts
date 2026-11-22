export const white = '#ffffff'; // #ffffff (white)
export const colorWhite50 = '#ffffff88'; // #ffffff88
export const colorNeutralGray100 = '#ffffff'; // #ffffff (white)
export const colorNeutralGray150 = '#f7f7f7'; // #f7f7f7
export const colorNeutralGray200 = '#d7d7d7'; // #d7d7d7
export const colorNeutralGray300 = '#cfcfcf'; // #cfcfcf
export const colorNeutralGray900 = '#494949'; // #494949
export const colorGray200 = '#e0e0e0'; // #e0e0e0

// Red tones
export const colorRed500 = '#ff4f4f'; //
export const colorRed600 = '#e94646'; //

// Green/blue tones
export const colorTurquoise500 = '#00deb9'; // #00deb9
export const colorBlueGreen700 = '#2d5465'; // #2d5465

export const mainNavbar = 'MAIN_NAVBAR';

export const swatches = [
  ['#B71C1C', '#D32F2F', '#F44336', '#E57373', '#FFCDD2'], // Red
  ['#880E4F', '#C2185B', '#E91E63', '#F06292', '#F8BBD0'], // Pink
  ['#4A148C', '#7B1FA2', '#9C27B0', '#BA68C8', '#E1BEE7'], // Purple
  ['#311B92', '#512DA8', '#673AB7', '#9575CD', '#D1C4E9'], // Deep Purple
  ['#1A237E', '#303F9F', '#3F51B5', '#7986CB', '#C5CAE9'], // Indigo
  ['#0D47A1', '#1976D2', '#2196F3', '#64B5F6', '#BBDEFB'], // Blue
  ['#01579B', '#0288D1', '#03A9F4', '#4FC3F7', '#B3E5FC'], // Light Blue
  ['#006064', '#0097A7', '#00BCD4', '#4DD0E1', '#B2EBF2'], // Cyan
  ['#004D40', '#00796B', '#009688', '#4DB6AC', '#B2DFDB'], // Teal
  ['#194D33', '#388E3C', '#4CAF50', '#81C784', '#C8E6C9'], // Green
  ['#33691E', '#689F38', '#8BC34A', '#AED581', '#DCEDC8'], // Light Green
  ['#827717', '#AFB42B', '#CDDC39', '#DCE775', '#F0F4C3'], // Lime
  ['#F57F17', '#FBC02D', '#FFEB3B', '#FFF176', '#FFF9C4'], // Yellow
  ['#FF6F00', '#FFA000', '#FFC107', '#FFD54F', '#FFECB3'], // Amber
  ['#E65100', '#FB8C00', '#FF9800', '#FFB74D', '#FFE0B2'], // Orange
  ['#BF360C', '#F4511E', '#FF5722', '#FF8A65', '#FFCCBC'], // Deep Orange
  ['#3E2723', '#5D4037', '#795548', '#A1887F', '#D7CCC8'], // Brown
  ['#263238', '#455A64', '#607D8B', '#90A4AE', '#CFD8DC'], // Be Grey
];
export function getTextColorByBackground(backgroundHex?: string): string {
  if (!backgroundHex) {
    return '';
  }
  // Usuwamy znak # z koloru HEX, jeśli jest obecny
  backgroundHex = backgroundHex.replace('#', '');

  // Konwertujemy wartości HEX na odpowiednie wartości RGB
  const r = parseInt(backgroundHex.substring(0, 2), 16);
  const g = parseInt(backgroundHex.substring(2, 4), 16);
  const b = parseInt(backgroundHex.substring(4, 6), 16);

  // Obliczamy luminancję
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Wybór koloru tekstu w zależności od luminancji tła
  if (luminance < 0.2) {
    return '#FFFFFF'; // Biały tekst dla bardzo ciemnego tła
  } else if (luminance < 0.5) {
    return '#E0E0E0'; // Jasnoszary tekst dla średnio ciemnego tła
  } else if (luminance < 0.8) {
    return '#606060'; // Średnioszary tekst dla średnio jasnego tła
  } else {
    return '#404040'; // Ciemnoszary tekst dla bardzo jasnego tła
  }
}

export function getTextColor(
  backgroundHex?: string,
  thresholds: [number, number] = [0.35, 0.7]
): string {
  if (!backgroundHex) {
    return '';
  }

  // Usuwamy znak # z koloru HEX, jeśli jest obecny
  backgroundHex = backgroundHex.replace('#', '');

  // Konwertujemy wartości HEX na odpowiednie wartości RGB
  const r = parseInt(backgroundHex.substring(0, 2), 16);
  const g = parseInt(backgroundHex.substring(2, 4), 16);
  const b = parseInt(backgroundHex.substring(4, 6), 16);

  // Obliczamy luminancję
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Funkcja do obliczania stosunku kontrastu
  function getContrast(
    r1: number,
    g1: number,
    b1: number,
    r2: number,
    g2: number,
    b2: number
  ): number {
    const l1 = (0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1) / 255;
    const l2 = (0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2) / 255;
    const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (light + 0.05) / (dark + 0.05);
  }

  // Funkcja liniowej interpolacji (przejście między dwoma kolorami)
  function lerp(color1: string, color2: string, t: number): string {
    const c1 = parseInt(color1.substring(1), 16);
    const c2 = parseInt(color2.substring(1), 16);

    const r1 = (c1 >> 16) & 0xff;
    const g1 = (c1 >> 8) & 0xff;
    const b1 = c1 & 0xff;

    const r2 = (c2 >> 16) & 0xff;
    const g2 = (c2 >> 8) & 0xff;
    const b2 = c2 & 0xff;

    const r = Math.round(r1 + t * (r2 - r1));
    const g = Math.round(g1 + t * (g2 - g1));
    const b = Math.round(b1 + t * (b2 - b1));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  // Definiowanie kolorów
  const colors = {
    black: '#000000',
    darkGray: '#404040',
    gray: '#808080',
    white: '#FFFFFF',
  };

  // Pobieranie progów
  const [lowThreshold, highThreshold] = thresholds;

  // Wybór koloru tekstu na podstawie luminancji i kontrastu
  if (luminance < lowThreshold) {
    return colors.white; // Biały tekst dla bardzo ciemnego tła
  } else if (luminance >= lowThreshold && luminance < highThreshold) {
    // Stopniowe przejście między białym a ciemnoszarym w zakresie progów
    const contrast = getContrast(r, g, b, 64, 64, 64);
    if (contrast >= 4.5) {
      const t = (luminance - lowThreshold) / (highThreshold - lowThreshold); // t z przedziału [0, 1]
      return lerp(colors.white, colors.darkGray, t);
    } else {
      return colors.white; // Zbyt niski kontrast, wybieramy biały tekst
    }
  } else {
    // Jasne tła: przejście między ciemnoszarym a czarnym
    const contrast = getContrast(r, g, b, 0, 0, 0);
    if (contrast >= 4.5) {
      const t = (luminance - highThreshold) / (1 - highThreshold); // t z przedziału [0, 1]
      return lerp(colors.darkGray, colors.black, t);
    } else {
      return colors.darkGray; // Zbyt niski kontrast, wybieramy ciemnoszary tekst
    }
  }
}

export const hslToHex = (hsl: string): string => {
  const hslValues = hsl.match(/\d+(\.\d+)?/g)?.map(Number);
  if (!hslValues || hslValues.length < 3) {
    throw new Error('Invalid HSL format');
  }

  const [h, s, l] = hslValues;
  const saturation = s / 100;
  const lightness = l / 100;

  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  const toHexValue = (value: number) => value.toString(16).padStart(2, '0');
  return `#${toHexValue(r)}${toHexValue(g)}${toHexValue(b)}`;
};

// Helper function to convert HEX to HSL
const hexToHsl = (hex: string): [number, number, number] => {
  let r = 0,
    g = 0,
    b = 0;

  if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16) / 255;
    g = parseInt(hex.slice(3, 5), 16) / 255;
    b = parseInt(hex.slice(5, 7), 16) / 255;
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const h = (max + min) / 2;
  let s = 0;
  let l = (max + min) / 2;

  if (max === min) {
    s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  }

  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === r) {
      hue = (g - b) / delta + (g < b ? 6 : 0);
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
    hue /= 6;
  }

  return [Math.round(hue * 360), Math.round(s * 100), Math.round(l * 100)];
};

export const reduceSaturation = (
  color: string,
  saturationReduce = 30
): string => {
  let h: number, s: number, l: number;

  if (color.startsWith('#')) {
    [h, s, l] = hexToHsl(color);
  } else {
    // Assume HSL input format
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
      h = parseFloat(match[1]);
      s = parseFloat(match[2]);
      l = parseFloat(match[3]);
    } else {
      throw new Error('Invalid color format');
    }
  }

  // Reduce saturation by 30%
  s = Math.max(0, s - saturationReduce);

  return hslToHex(`hsl(${h}%, ${s}%,${l}%)`);
};
