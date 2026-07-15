"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type SelectedDatesContextValue = {
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
};

const SelectedDatesContext = createContext<SelectedDatesContextValue | null>(
  null,
);

export function SelectedDatesProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  return (
    <SelectedDatesContext.Provider value={{ selectedDate, setSelectedDate }}>
      {children}
    </SelectedDatesContext.Provider>
  );
}

export function useSelectedDates() {
  const context = useContext(SelectedDatesContext);

  if (!context) {
    throw new Error(
      "useSelectedDates must be used within SelectedDatesProvider.",
    );
  }

  return context;
}
