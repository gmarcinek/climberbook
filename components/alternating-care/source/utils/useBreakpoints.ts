import { useEffect, useMemo, useState } from 'react';
import { useMediaQuery } from 'react-responsive';

/**
 * Niestandardowy hak `useBreakpoints` dostarcza wartości logiczne, które wskazują, czy aktualny widok
 * pasuje do jednego z kilku przedziałów rozmiarów ekranów: mobilnego, tabletu, desktopu oraz dużego desktopu.
 *
 * Hak wykorzystuje `useMediaQuery` z biblioteki `react-responsive` do monitorowania zmian w szerokości okna
 * przeglądarki i dostarczania odpowiednich wartości dla różnych punktów przerwania (breakpoints).
 *
 * @returns {UseBreakpoints} Obiekt zawierający właściwości logiczne, które informują o aktualnym rozmiarze ekranu:
 * - `isMobile` (boolean): `true`, jeśli szerokość okna przeglądarki jest mniejsza lub równa 767px.
 * - `isTablet` (boolean): `true`, jeśli szerokość okna przeglądarki jest mniejsza lub równa 1023px.
 * - `isDesktop` (boolean): `true`, jeśli szerokość okna przeglądarki jest mniejsza lub równa 1280px.
 * - `isBigDesktop` (boolean): `true`, jeśli szerokość okna przeglądarki jest większa lub równa 1281px.
 *
 * @example
 * // Przykład użycia haka
 * import React from 'react';
 * import { useBreakpoints } from './useBreakpoints'; // Załóżmy, że hak jest zapisany w pliku `useBreakpoints.ts`
 *
 * const MyComponent: React.FC = () => {
 *   const { isMobile, isTablet, isDesktop, isBigDesktop } = useBreakpoints();
 *
 *   return (
 *     <div>
 *       {isMobile && <p>Jesteś na urządzeniu mobilnym.</p>}
 *       {isTablet && !isMobile && <p>Jesteś na tablecie.</p>}
 *       {isDesktop && !isTablet && !isMobile && <p>Jesteś na desktopie.</p>}
 *       {isBigDesktop && <p>Jesteś na dużym desktopie.</p>}
 *     </div>
 *   );
 * };
 *
 * export default MyComponent;
 */

export interface UseBreakpoints {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isBigDesktop: boolean;
  is768: boolean;
  is1024: boolean;
  is1280: boolean;
  is1360: boolean;
  is1440: boolean;
  is1671: boolean;
  is1920: boolean;
  is2560: boolean;
  isMax768: boolean;
  isMax1024: boolean;
  isMax1280: boolean;
  isMax1360: boolean;
  isMax1440: boolean;
  isMax1671: boolean;
  isMax1920: boolean;
  isMax2560: boolean;
}
export const useBreakpoints = (): UseBreakpoints => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // Używamy useMediaQuery do monitorowania punktów przerwania
  const isMobile = useMediaQuery({ query: '(max-width: 767px)' });
  const isTablet = useMediaQuery({
    query: '(max-width: 1023px)',
  });
  const isDesktop = useMediaQuery({
    query: '(max-width: 1280px)',
  });
  const isBigDesktop = useMediaQuery({ query: '(min-width: 1281px)' });

  const is768 = useMediaQuery({ query: '(min-width: 768px)' });
  const is1024 = useMediaQuery({ query: '(min-width: 1024px)' });
  const is1280 = useMediaQuery({ query: '(min-width: 1280px)' });
  const is1360 = useMediaQuery({ query: '(min-width: 1360px)' });
  const is1440 = useMediaQuery({ query: '(min-width: 1440px)' });
  const is1671 = useMediaQuery({ query: '(min-width: 1671px)' });
  const is1920 = useMediaQuery({ query: '(min-width: 1920px)' });
  const is2560 = useMediaQuery({ query: '(min-width: 2560px)' });

  const isMax768 = useMediaQuery({ query: '(max-width: 767px)' });
  const isMax1024 = useMediaQuery({ query: '(max-width: 1023px)' });
  const isMax1280 = useMediaQuery({ query: '(max-width: 1279px)' });
  const isMax1360 = useMediaQuery({ query: '(max-width: 1359px)' });
  const isMax1440 = useMediaQuery({ query: '(max-width: 1439px)' });
  const isMax1671 = useMediaQuery({ query: '(max-width: 1670px)' });
  const isMax1920 = useMediaQuery({ query: '(max-width: 1919px)' });
  const isMax2560 = useMediaQuery({ query: '(max-width: 2559px)' });

  const api = useMemo(() => {
    return {
      isMobile,
      isTablet,
      isDesktop,
      isBigDesktop,
      is768,
      is1024,
      is1280,
      is1360,
      is1440,
      is1671,
      is1920,
      is2560,
      isMax768,
      isMax1024,
      isMax1280,
      isMax1360,
      isMax1440,
      isMax1671,
      isMax1920,
      isMax2560,
    };
  }, [
    isMobile,
    isTablet,
    isDesktop,
    isBigDesktop,
    is768,
    is1024,
    is1280,
    is1360,
    is1440,
    is1671,
    is1920,
    is2560,
    isMax768,
    isMax1024,
    isMax1280,
    isMax1360,
    isMax1440,
    isMax1671,
    isMax1920,
    isMax2560,
  ]);

  if (!isMounted) {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: false,
      isBigDesktop: false,
      is768: false,
      is1024: false,
      is1280: false,
      is1360: false,
      is1440: false,
      is1671: false,
      is1920: false,
      is2560: false,
      isMax768: false,
      isMax1024: false,
      isMax1280: false,
      isMax1360: false,
      isMax1440: false,
      isMax1671: false,
      isMax1920: false,
      isMax2560: false,
    };
  }

  return {
    ...api,
  };
};
