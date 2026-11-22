/**
 * Dzieli tablicę na mniejsze tablice (kawałki) o określonym rozmiarze.
 * Jeśli długość tablicy nie dzieli się równo przez rozmiar kawałka, ostatni kawałek może być mniejszy.
 *
 * @param array - Tablica typu `T` do podziału na kawałki.
 * @param chunkSize - Rozmiar każdego kawałka. Musi być liczbą całkowitą większą od zera.
 * @returns Tablica tablic, gdzie każda wewnętrzna tablica ma maksymalnie `chunkSize` elementów.
 *          Jeśli długość tablicy nie jest podzielna przez `chunkSize`, ostatnia tablica może być krótsza.
 *
 * @template T - Typ elementów znajdujących się w tablicy.
 *
 * @example
 * ```typescript
 * const array = [1, 2, 3, 4, 5, 6, 7, 8, 9];
 * const chunkSize = 3;
 *
 * const result = splitEvenly(array, chunkSize);
 * console.log(result);
 * // Output: [
 * //   [1, 2, 3],
 * //   [4, 5, 6],
 * //   [7, 8, 9]
 * // ]
 * ```
 */
export function splitEvenly<T>(array: T[], chunkSize: number): T[][] {
  const numberOfChunks = Math.floor(array.length / chunkSize);
  const remainder = array.length % chunkSize;

  const result: T[][] = new Array(numberOfChunks + (remainder > 0 ? 1 : 0));

  for (let i = 0; i < numberOfChunks; i++) {
    result[i] = array.slice(i * chunkSize, (i + 1) * chunkSize);
  }

  if (remainder > 0) {
    result[numberOfChunks] = array.slice(numberOfChunks * chunkSize);
  }

  return result;
}

/**
 * Sortuje tablicę obiektów na podstawie wartości przypisanej do określonego klucza.
 * Nowa tablica jest zwracana w posortowanej kolejności, przy czym oryginalna tablica pozostaje niezmieniona.
 *
 * @param array - Tablica obiektów typu `T`, która ma zostać posortowana.
 * @param key - Klucz obiektu typu `T`, który zostanie użyty jako podstawa do sortowania.
 *              Klucz musi być właściwością obiektów w tablicy.
 * @returns Nowa tablica obiektów typu `T`, posortowana rosnąco według wartości przypisanej do określonego klucza.
 *
 * @template T - Typ obiektów znajdujących się w tablicy.
 *
 * @example
 * ```typescript
 * interface Person {
 *   name: string;
 *   age: number;
 * }
 *
 * const people: Person[] = [
 *   { name: 'Alice', age: 30 },
 *   { name: 'Bob', age: 25 },
 *   { name: 'Charlie', age: 35 }
 * ];
 *
 * const sortedByAge = sortBy(people, 'age');
 * console.log(sortedByAge);
 * // Output: [
 * //   { name: 'Bob', age: 25 },
 * //   { name: 'Alice', age: 30 },
 * //   { name: 'Charlie', age: 35 }
 * // ]
 * ```
 */
export function sortBy<T>(array: T[], key: keyof T): T[] {
  return [...array].sort((a, b) => {
    if (a[key] > b[key]) return 1;
    if (a[key] < b[key]) return -1;
    return 0;
  });
}

/**
 * Transponuje dwuwymiarową tablicę (macierz) z elementami typu `T`.
 * Transpozycja macierzy polega na zamianie jej wierszy na kolumny i kolumn na wiersze.
 *
 * @param matrix - Dwuwymiarowa tablica (macierz) typu `T`, która ma zostać transponowana.
 *                Każdy wiersz jest reprezentowany jako tablica typu `T[]`, a cała macierz
 *                jako tablica tablic typu `T[][]`.
 * @returns Nowa dwuwymiarowa tablica (macierz) typu `T`, będąca transpozycją przekazanej macierzy.
 *          Kolumny oryginalnej macierzy stają się wierszami, a wiersze stają się kolumnami.
 *
 * @example
 * ```typescript
 * const matrix = [
 *   [1, 2, 3],
 *   [4, 5, 6],
 *   [7, 8, 9]
 * ];
 *
 * const transposedMatrix = toTransposeArray(matrix);
 * console.log(transposedMatrix);
 * // Output: [
 * //   [1, 4, 7],
 * //   [2, 5, 8],
 * //   [3, 6, 9]
 * // ]
 * ```
 */
export function toTransposeArray<T>(matrix: T[][]): T[][] {
  return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
}

export function generateAbsArray(length: number): number[] {
  return Array.from({ length }, (_, i) => Math.abs(i));
}
