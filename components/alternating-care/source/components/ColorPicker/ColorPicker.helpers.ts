export const getHueColor = (position: number, width: number): string => {
  const hue = Math.round((position / width) * 360 * 100) / 100; // Zaokrąglamy do 2 miejsc po przecinku
  return `hsl(${hue}, 100%, 50%)`;
};

export const getBrightnessColor = (hue: number, brightness: number): string => {
  return `hsl(${hue}, 100%, ${brightness}%)`;
};
