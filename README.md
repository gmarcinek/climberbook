# Climberbook

Aplikacja Next.js do prowadzenia dziennika wspinaczkowego. Wszystkie dane UI są obsługiwane przez API PostgreSQL.

## Start

1. `npm install`
2. Uruchom bazę: `docker compose up db -d`.
3. Uruchom migracje: `npm run db:migrate`.
4. Uruchom `npm run dev`.
5. Otwórz `http://localhost:3000`.

`npm run dev` uruchamia Next.js bezpośrednio na komputerze. `.env.local` wskazuje wtedy `POSTGRES_HOST=localhost`, czyli PostgreSQL wystawiony przez lokalny Docker. Produkcja nie używa tego skryptu: kontener uruchamia `node server.js` z własnymi Environment variables oraz Secrets.

Lokalny UI używa API PostgreSQL i bazy Docker na `localhost:5432`. Dane Google OAuth są w `.env`; Google Cloud musi dopuszczać redirect URI `http://localhost:3000/api/auth/callback/google`. Docker Compose używa `.env` oraz hosta `db` wewnątrz swojej sieci, natomiast `.env.local` nadpisuje ten host na `localhost` wyłącznie dla aplikacji uruchomionej bezpośrednio przez `npm run dev`.

`npm run db:migrate`, `npm run db:status` i `npm run db:rollback:last` zawsze dotyczą lokalnego Dockera. Produkcję migruje osobny job wdrożeniowy uruchamiany w Azure z sekretem bazy produkcyjnej; projekt nie udostępnia skryptu, który uruchamia migracje produkcyjne z lokalnego komputera.

## Produkcja: Azure Container Apps

Pliki `.env.*` nie są kopiowane do obrazu Docker. Produkcyjny kontener otrzymuje konfigurację w **Environment variables** Container App. Ustaw co najmniej:

```env
POSTGRES_HOST=<server-name>.postgres.database.azure.com
POSTGRES_PORT=5432
POSTGRES_DB=climberbook
POSTGRES_USER=<admin-login>
POSTGRES_AUTH_MODE=password
POSTGRES_SSLMODE=require
```

Dodaj `POSTGRES_PASSWORD` jako sekret Container App, a następnie przekaż go do kontenera jako zmienną środowiskową o tej nazwie. Nie umieszczaj hasła w obrazie ani w repozytorium.

`CLIMBERBOOK_ENV` nie jest zmienną dostarczaną przez Azure. Produkcja nie wymaga jej do połączenia z bazą; można ją opcjonalnie dodać jako własną zmienną Container App z wartością `production`.

`NEXT_PUBLIC_*` jest wbudowywane podczas `docker build`, nie przy starcie kontenera. Produkcyjny obraz buduje UI korzystający z API PostgreSQL.

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

Eksperymentalny backend działa w tym samym kontenerze co aplikacja Next.js, przez API routes. Jest domyślnie wyłączony i nie może być używany jako źródło danych UI.

W izolowanym środowisku testowym ustaw w `.env`:

```env
ENABLE_POSTGRES_EXPERIMENTAL_API=true
```

Bez tej flagi endpointy PostgreSQL zwracają `404`. Dostępne wyłącznie w testach endpointy to:

- `GET /api/v1/users`, `POST /api/v1/users`
- `GET /api/db/health` sprawdza połączenie z PostgreSQL
- `GET/POST/PATCH/DELETE /api/v1/athletes`
- `GET/POST/PATCH/DELETE /api/v1/trainings`
- `GET/PUT /api/v1/profiles`
- `GET/POST/PATCH/DELETE /api/v1/weight-entries`
- `GET/POST/PATCH/DELETE /api/v1/ascents`
- `GET/POST/PATCH/DELETE /api/v1/sections`
- `GET/POST/PATCH/DELETE /api/v1/facilities`
- `GET/POST/PATCH/DELETE /api/v1/climbs`
- `GET /api/v1/snapshot`
- `POST /api/v1/backups/import`

Po utworzeniu użytkownika przez `POST /api/v1/users`, każdy endpoint danych wymaga nagłówka `X-Climberbook-User-Id` z jego UUID. Ten nagłówek jest wyłącznie mechanizmem izolacji danych w testach. Nie zastępuje uwierzytelniania, sesji ani kontroli dostępu wymaganych w produkcji.

Po ręcznym uruchomieniu testowego środowiska z flagą i zastosowaniu changelogów można sprawdzić pełny przepływ API:

```powershell
$env:EXPERIMENTAL_API_BASE_URL = "http://localhost:3000"
npm run test:postgres:experimental
```

Test tworzy własne dane testowe, sprawdza pełny snapshot oraz izolację między dwoma użytkownikami, a na końcu usuwa rekordy domenowe. Utworzone konta `app_users` pozostają w testowej bazie.

Dostęp do bazy obsługuje dwa tryby:

- `POSTGRES_AUTH_MODE=password`: lokalny Docker Compose i klasyczne hasło PostgreSQL
- `POSTGRES_AUTH_MODE=entra`: Azure Database for PostgreSQL Flexible Server z Microsoft Entra ID przez `DefaultAzureCredential`

Tryb `entra` wymaga w Azure włączenia uwierzytelniania Microsoft Entra dla serwera PostgreSQL oraz nadania tożsamości aplikacji uprawnień w bazie. W Container Apps najlepiej użyć managed identity; lokalnie `DefaultAzureCredential` może użyć zalogowanego Azure CLI albo zmiennych service principal.

Schemat bazy jest zarządzany przez Liquibase. Backend nie tworzy tabel automatycznie przy starcie, więc przed użyciem endpointów API uruchom migracje:

```powershell
npm run db:migrate
```

## Entra ID i MCP

Endpoint MCP jest dostępny przez Streamable HTTP pod `POST /api/mcp`. Wymaga access tokenu Entra w nagłówku `Authorization: Bearer <token>` i delegowanego zakresu `climberbook.access`. Metadane OAuth dla klientów MCP są dostępne pod `/.well-known/oauth-protected-resource`.

W ustawieniach aplikacji Azure App Service ustaw następujące zmienne środowiskowe, używając wartości z rejestracji **Climberbook MCP API**:

```env
ENTRA_TENANT_ID=<Directory-tenant-ID>
ENTRA_API_CLIENT_ID=<Application-client-ID-API>
ENTRA_REQUIRED_SCOPE=climberbook.access
```

Domyślny issuer jest przeznaczony dla Microsoft Entra ID: `https://login.microsoftonline.com/<tenant-id>/v2.0`. Dla tenant'a External ID ustaw dodatkowo `ENTRA_ISSUER` na issuer podany w jego dokumencie OpenID Connect oraz `ENTRA_OPENID_CONFIGURATION_URL` na pełny adres tego dokumentu. API pobiera z niego `jwks_uri` do weryfikacji podpisu tokenu.

MCP udostępnia obecnie tylko narzędzie odczytu `get_climbing_snapshot`. Token jest mapowany na istniejące konto Climberbook przez `auth_identities`. Dla ręcznie utworzonego użytkownika dodaj jednorazowo powiązanie w bazie:

```sql
insert into auth_identities (id, user_id, provider, provider_subject, email_at_login)
values (
	gen_random_uuid(),
	'<UUID-z-app_users>',
	'entra:<Directory-tenant-ID>',
	'<oid-z-access-tokenu>',
	'<adres-email-uzytkownika>'
);
```

`oid` odczytaj z access tokenu dla API. Nie mapuj kont po adresie e-mail, ponieważ może się on zmienić.

Changelogi są w `db/changelog`. Nowe zmiany dopisuj jako kolejne pliki w `db/changelog/changes` i dołączaj je w `db/changelog/db.changelog-master.yaml`. Dla Azure można użyć tego samego mechanizmu; przy `POSTGRES_AUTH_MODE=entra` migracje uruchamiaj użytkownikiem migracyjnym/adminem albo przekaż token Entra jako hasło dla połączenia JDBC.

## Główne moduły

- treningowy: waga, data, godzina, czas trwania, liczba wstawek, trudności, samopoczucie, lina, baldy, moon, spraywall, kilter, siłownia
- raportowy: historia przejść panel i skała, ręczne dopisywanie wpisów, export do CSV
- analityka: wskaźniki zbiorcze i miejsce pod późniejsze zaawansowane wykresy

## Dane i migracja

- UI zapisuje dane wyłącznie przez API PostgreSQL.
- PostgreSQL jest wspólnym źródłem danych dla lokalnego Dockera i produkcji.
- Eksperymentalne tabele zawierają `app_users` oraz właściciela zawodników, sekcji i obiektów. Treningi, profile, wagi, przejścia i katalog wspinaczek są filtrowane przez właściciela zawodnika.
- Nie importuj produkcyjnych danych ani nie przełączaj `ClimberbookProvider` na PostgreSQL przed dodaniem brakujących encji użytkownika, pełnych ścieżek zapisu oraz testów integracyjnych.
- plik `WSPINY PANEL.xlsx` jest w repo i może być kolejnym krokiem do importu historycznych danych
