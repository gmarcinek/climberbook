import { useCallback } from 'react';
import { mainNavbar } from './constants';

/**
 * Niestandardowy hak `useScrollToId` dostarcza funkcję do przewijania do elementu o określonym identyfikatorze
 * oraz opcjonalnego dodawania efektu powiększenia do tego elementu.
 *
 * Hak ten wykorzystuje `useCallback` z Reacta do optymalizacji funkcji przewijania, aby nie była ona
 * na nowo tworzona przy każdym renderze komponentu.
 *
 * @returns {Object} Obiekt z jedną funkcją:
 * - `scrollToElement` (Function): Funkcja przewijająca do elementu o określonym identyfikatorze z opcjonalnym
 *   efektem powiększenia. Przyjmuje następujące parametry:
 *   - `elementId` (string): Identyfikator elementu, do którego ma zostać przewinięte.
 *   - `offset` (number, opcjonalny): Dodatkowy offset (w pikselach) do uwzględnienia przy przewijaniu. Domyślnie `0`.
 *   - `zoom` (boolean, opcjonalny): Czy dodać efekt powiększenia do elementu. Domyślnie `false`.
 *   - `containerId` (string, opcjonalny): Identyfikator kontenera, wewnątrz którego ma być przewijane. Jeśli nie jest podany,
 *     przewijanie odbywa się w oknie przeglądarki.
 *
 * @example
 * // Przykład użycia haka
 * import React from 'react';
 * import { useScrollToId } from './useScrollToId'; // Załóżmy, że hak jest zapisany w pliku `useScrollToId.ts`
 *
 * const MyComponent: React.FC = () => {
 *   const { scrollToElement } = useScrollToId();
 *
 *   return (
 *     <div>
 *       <button onClick={() => scrollToElement('sectionId', 50, true)}>Przewiń do sekcji</button>
 *
 *       <div id="sectionId" style={{ height: '500px', backgroundColor: 'lightgrey' }}>Sekcja</div>
 *     </div>
 *   );
 * };
 *
 * export default MyComponent;
 */
export const useScrollToId = () => {
  const scrollToElement = useCallback(
    (elementId: string, offset = 0, zoom?: boolean, containerId?: string) => {
      if (typeof document === 'undefined' || typeof window === 'undefined') {
        return;
      }

      const navbarHeight =
        document.getElementById(mainNavbar)?.offsetHeight ?? 64;
      const element = document.getElementById(elementId);
      const container = containerId
        ? document.getElementById(containerId)
        : null;

      if (element) {
        const position =
          element.getBoundingClientRect().top +
          window.scrollY -
          navbarHeight -
          offset;

        // Scrollowanie do elementu
        if (container) {
          container.scrollTo({ top: position, behavior: 'instant' });
        } else {
          window.scrollTo({ top: position, behavior: 'smooth' });
        }

        // Dodajemy klasę powiększenia

        if (zoom) {
          const timer1 = setTimeout(() => {
            element.classList.add('zoomIn');
            clearTimeout(timer1);
          }, 400);

          // Po 1 sekundzie zmieniamy klasę na zoomOut, żeby powrócił do oryginalnego rozmiaru
          const timer2 = setTimeout(() => {
            element.classList.remove('zoomIn');
            element.classList.add('zoomOut');
            clearTimeout(timer2);
          }, 1400);

          // Usuwamy klasę zoomOut po zakończeniu animacji (np. po 0.3s)
          const timer3 = setTimeout(() => {
            element.classList.remove('zoomOut');
            clearTimeout(timer3);
          }, 1700); // 1000ms (czas animacji powiększenia) + 300ms (czas powrotu do normalnego rozmiaru)
        }
      }
    },
    []
  );

  return { scrollToElement };
};
