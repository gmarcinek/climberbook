import { useCallback } from 'react';
import { mainNavbar } from './constants';

/**
 * Niestandardowy hak `useZoomEase` dostarcza funkcję do dodawania efektu powiększenia i zmniejszenia
 * do elementu o określonym identyfikatorze.
 *
 * Hak ten wykorzystuje `useCallback` z Reacta do optymalizacji funkcji efektu, aby nie była ona
 * na nowo tworzona przy każdym renderze komponentu.
 *
 * @returns {Object} Obiekt z jedną funkcją:
 * - `zoomEaseElement` (Function): Funkcja dodająca efekt powiększenia i zmniejszenia do elementu o określonym
 *   identyfikatorze. Przyjmuje następujące parametry:
 *   - `elementId` (string): Identyfikator elementu, do którego ma zostać dodany efekt powiększenia.
 *   - `offset` (number, opcjonalny): Dodatkowy offset (w pikselach) do uwzględnienia. Domyślnie `0`.
 *
 * @example
 * // Przykład użycia haka
 * import React from 'react';
 * import { useZoomEase } from './useZoomEase'; // Załóżmy, że hak jest zapisany w pliku `useZoomEase.ts`
 *
 * const MyComponent: React.FC = () => {
 *   const { zoomEaseElement } = useZoomEase();
 *
 *   return (
 *     <div>
 *       <button onClick={() => zoomEaseElement('zoomElement')}>Powiększ element</button>
 *
 *       <div id="zoomElement" style={{ height: '200px', backgroundColor: 'lightgrey' }}>Element</div>
 *     </div>
 *   );
 * };
 *
 * export default MyComponent;
 */
export const useZoomEase = () => {
  const navbatHeight = document.getElementById(mainNavbar)?.offsetHeight ?? 64;

  const zoomEaseElement = useCallback(
    (elementId: string, offset = 0) => {
      const element = document.getElementById(elementId);

      if (element) {
        setTimeout(() => {
          element.classList.add('zoomIn');
        }, 400);

        // Po 1 sekundzie zmieniamy klasę na zoomOut, żeby powrócił do oryginalnego rozmiaru
        setTimeout(() => {
          element.classList.remove('zoomIn');
          element.classList.add('zoomOut');
        }, 1400);

        // Usuwamy klasę zoomOut po zakończeniu animacji (np. po 0.3s)
        setTimeout(() => {
          element.classList.remove('zoomOut');
        }, 1700); // 1000ms (czas animacji powiększenia) + 300ms (czas powrotu do normalnego rozmiaru)
      }
    },
    [navbatHeight]
  );

  return { zoomEaseElement };
};
