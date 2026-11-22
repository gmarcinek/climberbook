import { useCallback } from 'react';

// Uniwersalna funkcja aktualizacji query
export const useUpdateQueryParam = () => {
  return useCallback((key: string, value?: string) => {
    if (typeof window === 'undefined') {
      // Jeśli kod jest uruchamiany po stronie serwera
      return;
    }

    // Uzyskanie aktualnych parametrów zapytania z URL
    const url = new URL(window.location.href);
    const currentQuery = new URLSearchParams(url.search);

    if (value) {
      currentQuery.set(key, value); // Ustawienie nowego lub zaktualizowanie istniejącego parametru
    } else {
      currentQuery.delete(key); // Usunięcie parametru, jeśli nie podano wartości
    }

    // Aktualizacja URL bez przeładowania strony
    window.history.pushState(
      {},
      '',
      `${url.pathname}?${currentQuery.toString()}`
    );
  }, []);
};
