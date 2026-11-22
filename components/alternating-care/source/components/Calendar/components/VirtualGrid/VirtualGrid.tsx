import { CalendarMonthType } from '@components/Calendar/Calendar.types';
import { CalendarMonth } from '@components/Calendar/components/CalendarMonth/CalendarMonth';
import { StackGap } from '@components/Stack/Stack';
import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useRef } from 'react';

interface VirtualCalendarProps {
  months: CalendarMonthType[]; // Tablica miesięcy
  gap: StackGap; // Odstęp między elementami
  overscan?: number; // Ilość dodatkowych elementów renderowanych poza widocznym obszarem
}

export const VirtualCalendar: React.FC<VirtualCalendarProps> = ({
  months,
  gap,
  overscan = 12,
}) => {
  const parentRef = useRef<HTMLDivElement | null>(null);

  // Mapa przechowująca dynamiczne wysokości elementów
  const sizeMap = useRef<Record<number, number>>({});

  // Ustawienia wirtualizera
  const rowVirtualizer = useVirtualizer({
    count: months.length, // Liczba miesięcy
    getScrollElement: () => parentRef.current, // Element przewijany
    estimateSize: (index) => sizeMap.current[index] || 400, // Przybliżona wysokość (domyślnie 400px)
    overscan, // Dodatkowe elementy poza widocznym obszarem
  });

  // Funkcja mierząca rzeczywisty rozmiar elementu
  const measureSize = (index: number, element: HTMLDivElement | null) => {
    if (element) {
      const newSize = element.offsetHeight;
      if (sizeMap.current[index] !== newSize) {
        sizeMap.current[index] = newSize; // Zapisanie nowej wysokości
        rowVirtualizer.measure(); // Aktualizacja wirtualizera
      }
    }
  };

  return (
    <div
      ref={parentRef}
      style={{
        height: '95vh', // Wysokość kontenera
        overflowY: 'auto', // Scroll pionowy
        position: 'relative',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`, // Całkowita wysokość wirtualnej listy
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const month = months[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              ref={(el) => measureSize(virtualRow.index, el)} // Mierzenie wysokości elementu
              style={{
                position: 'absolute',
                top: `${virtualRow.start}px`, // Ustawienie elementu
                left: 0,
                width: '100%',
                paddingBottom: `${gap}px`, // Odstęp między elementami
              }}
            >
              <CalendarMonth month={month} gap={gap} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
