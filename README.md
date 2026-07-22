# Climberbook

Aplikacja Next.js do prowadzenia dziennika wspinaczkowego. Docelowym źródłem danych jest PostgreSQL przez backend API; obecny IndexedDB zostaje jako warstwa historyczna/przejściowa do czasu migracji danych i przepięcia UI.

## Start

1. `npm install`
2. `npm run dev`
3. otwórz `http://localhost:3000`

## Docker Compose + PostgreSQL

1. Skopiuj `.env.example` do `.env` i zmień hasło, jeśli chcesz użyć własnego lokalnie.
2. Uruchom bazę: `docker compose up db -d`.
3. Uruchom migracje: `npm run db:migrate`.
4. Uruchom aplikację: `docker compose up app`.
5. Aplikacja będzie dostępna pod `http://localhost:3000`, a PostgreSQL pod `localhost:5432`.

Lokalny compose używa PostgreSQL 18, żeby środowisko było zgodne z późniejszym przeniesieniem na Azure Database for PostgreSQL Flexible Server. Domyślne dane lokalne:

- host z poziomu kontenerów: `db`
- host z komputera: `localhost`
- baza: `climberbook`
- użytkownik: `climberbook_admin`
- SSL: `disable`

PostgreSQL 18 używa wolumenu zamontowanego w `/var/lib/postgresql`, a nie bezpośrednio w katalogu `data`. Jeżeli kontener bazy był już uruchomiony na wcześniejszej konfiguracji i wychodzi z błędem o `unused mount/volume`, usuń pusty lokalny wolumen i uruchom bazę ponownie:

```powershell
docker compose down -v
docker compose up db -d
```

Przy przeniesieniu na Azure ustaw odpowiedniki z `.env.example`: `POSTGRES_HOST` na `<server-name>.postgres.database.azure.com`, port `5432`, `POSTGRES_SSLMODE=require`, nazwę bazy, login administratora i hasło spełniające politykę Azure. Aplikacja sama składa połączenie z tych zmiennych, więc `DATABASE_URL` nie jest wymagany.

Backend działa na razie w tym samym kontenerze co aplikacja Next.js, przez API routes:

- `GET /api/db/health` sprawdza połączenie z PostgreSQL
- `GET /api/v1/athletes`, `POST /api/v1/athletes`
- `GET /api/v1/trainings`, `POST /api/v1/trainings`

Dostęp do bazy obsługuje dwa tryby:

- `POSTGRES_AUTH_MODE=password`: lokalny Docker Compose i klasyczne hasło PostgreSQL
- `POSTGRES_AUTH_MODE=entra`: Azure Database for PostgreSQL Flexible Server z Microsoft Entra ID przez `DefaultAzureCredential`

Tryb `entra` wymaga w Azure włączenia uwierzytelniania Microsoft Entra dla serwera PostgreSQL oraz nadania tożsamości aplikacji uprawnień w bazie. W Container Apps najlepiej użyć managed identity; lokalnie `DefaultAzureCredential` może użyć zalogowanego Azure CLI albo zmiennych service principal.

Schemat bazy jest zarządzany przez Liquibase. Backend nie tworzy tabel automatycznie przy starcie, więc przed użyciem endpointów API uruchom migracje:

```powershell
npm run db:migrate
```

Changelogi są w `db/changelog`. Nowe zmiany dopisuj jako kolejne pliki w `db/changelog/changes` i dołączaj je w `db/changelog/db.changelog-master.yaml`. Dla Azure można użyć tego samego mechanizmu; przy `POSTGRES_AUTH_MODE=entra` migracje uruchamiaj użytkownikiem migracyjnym/adminem albo przekaż token Entra jako hasło dla połączenia JDBC.

## Główne moduły

- treningowy: waga, data, godzina, czas trwania, liczba wstawek, trudności, samopoczucie, lina, baldy, moon, spraywall, kilter, siłownia
- raportowy: historia przejść panel i skała, ręczne dopisywanie wpisów, export do CSV
- analityka: wskaźniki zbiorcze i miejsce pod późniejsze zaawansowane wykresy

## Dane i migracja

- PostgreSQL jest docelowym źródłem prawdy dla backendu, API i przyszłego MCP
- obecny IndexedDB przez `idb` zostaje tylko jako legacy store do historii, eksportu/importu i ewentualnego wsparcia offline
- migracja z IndexedDB do PostgreSQL będzie osobnym etapem po ustabilizowaniu backendu
- plik `WSPINY PANEL.xlsx` jest w repo i może być kolejnym krokiem do importu historycznych danych