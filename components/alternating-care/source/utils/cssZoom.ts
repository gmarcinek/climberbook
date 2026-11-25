// Effective CSS zoom of an element (see the desktop scale in styles/globals.css).
// getBoundingClientRect() and pointer coordinates are zoomed, while CSS lengths
// and scroll offsets are not, so divide by this value when converting between them.
export const cssZoom = (element?: Element | null): number => {
  const zoom = (element as (Element & { currentCSSZoom?: number }) | null)
    ?.currentCSSZoom;
  return zoom && zoom > 0 ? zoom : 1;
};
