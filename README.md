# Climberbook

Aplikacja Next.js z lokalną bazą IndexedDB do prowadzenia dziennika wspinaczkowego.

## Start

1. `npm install`
2. `npm run dev`
3. otwórz `http://localhost:3000`

## Główne moduły

- treningowy: waga, data, godzina, czas trwania, liczba wstawek, trudności, samopoczucie, lina, baldy, moon, spraywall, kilter, siłownia
- raportowy: historia przejść panel i skała, ręczne dopisywanie wpisów, export do CSV
- analityka: wskaźniki zbiorcze i miejsce pod późniejsze zaawansowane wykresy

## Dane lokalne

- dane zapisują się w przeglądarce przez `idb` i IndexedDB
- aplikacja ma osobne store dla treningów i historii przejść
- plik `WSPINY PANEL.xlsx` jest w repo i może być kolejnym krokiem do importu historycznych danych