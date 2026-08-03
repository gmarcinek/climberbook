W skrócie

1. spradzź tsx czy sie kompilije no emit i posprzątaj jego output
2. zbuduj image
3. sprawdz tagi ostanie
4. wypchnij na acr.
5. otaguj latest i nowa wersje
6. wypchnij na acr.
7. sprawdz czy poszło
8. sprawdź czy baza ma migracje do zrobienia zmigruj
9. deploy
10. wywal z acr stare images

````md
# Climberbook: build i deploy obrazu do Azure

Instrukcja dla Bash / Git Bash.

## Konfiguracja

```bash
VERSION="0.2.7"

LOCAL_IMAGE="climberbook-app"
ACR="acrgmarcinek"
ACR_HOST="acrgmarcinek.azurecr.io"
IMAGE="climberbook"

RESOURCE_GROUP="rm_gmarcinek"
APP_SERVICE="climberbook"
```
````

Przy każdym wdrożeniu zmień tylko `VERSION`.

## 1. Sprawdź TypeScript i TSX

Przed zbudowaniem obrazu uruchom jawne sprawdzenie typów. Nie kontynuuj
wdrożenia, jeżeli polecenie zwróci błąd:

```bash
npx tsc --noEmit
```

## 2. Zbuduj obraz lokalnie

Uruchom w głównym katalogu projektu, obok `Dockerfile`:

```bash
docker build \
  -t "$LOCAL_IMAGE:latest" \
  .
```

Sprawdź obraz:

```bash
docker image ls | grep -i climberbook
```

## 3. Oznacz obraz tagami

Tag konkretnej wersji:

```bash
docker tag \
  "$LOCAL_IMAGE:latest" \
  "$ACR_HOST/$IMAGE:$VERSION"
```

Tag `latest`:

```bash
docker tag \
  "$LOCAL_IMAGE:latest" \
  "$ACR_HOST/$IMAGE:latest"
```

Sprawdź tagi:

```bash
docker image ls | grep -i climberbook
```

## 4. Zaloguj się do Azure Container Registry

```bash
az login
```

Jeżeli jesteś już zalogowany, wystarczy:

```bash
az acr login --name "$ACR"
```

## 5. Wypchnij obrazy do ACR

```bash
docker push "$ACR_HOST/$IMAGE:$VERSION"
docker push "$ACR_HOST/$IMAGE:latest"
```

Sprawdź wersje znajdujące się w ACR:

```bash
az acr repository show-tags \
  --name "$ACR" \
  --repository "$IMAGE" \
  --orderby time_desc \
  --output table
```

## 6. Zmigruj produkcyjną bazę danych

Wykonaj migrację **przed** przełączeniem App Service na nowy obraz. Liquibase
musi uruchamiać się z Azure albo z hosta dopuszczonego przez firewall serwera
PostgreSQL. Nie używaj lokalnego `.env` ani lokalnej bazy Docker.

Najpierw sprawdź oczekujące zmiany:

```bash
docker compose --env-file .env.azure run --no-deps --rm liquibase status --verbose
```

Następnie zastosuj migracje:

```bash
docker compose --env-file .env.azure run --no-deps --rm liquibase update
```

Po migracji status nie powinien wskazywać zmian oczekujących:

```bash
docker compose --env-file .env.azure run --no-deps --rm liquibase status --verbose
```

Jeżeli tymczasowo dodasz adres do firewalla Azure PostgreSQL, usuń tę regułę po
zakończeniu migracji. Hasła pozostają w `.env.azure` lub w sekretach Azure i
nie mogą trafić do obrazu ani do logów wdrożenia.

## 7. Ustaw nową wersję w App Service

```bash
az webapp config container set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE" \
  --container-image-name "$ACR_HOST/$IMAGE:$VERSION" \
  --container-registry-url "https://$ACR_HOST"
```

App Service jest przypinany do konkretnej wersji, na przykład `0.1.2`. Tag `latest` jest pomocniczy.

Jeżeli App Service używa skonfigurowanej tożsamości zarządzanej z rolą `AcrPull`, Azure CLI może wyświetlić ostrzeżenie o braku poświadczeń ACR. Nie blokuje to wdrożenia; potwierdź pobranie obrazu przez kontrolę wersji i endpoint zdrowia.

## 8. Uruchom aplikację ponownie

```bash
az webapp restart \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE"
```

## 9. Sprawdź wdrożoną wersję

```bash
az webapp config show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE" \
  --query linuxFxVersion \
  --output tsv
```

Oczekiwany wynik:

```text
DOCKER|acrgmarcinek.azurecr.io/climberbook:0.2.7
```

Kontrola zdrowia aplikacji:

```bash
APP_HOST="$(az webapp show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE" \
  --query defaultHostName \
  --output tsv)"

curl --fail --silent --show-error \
  "https://$APP_HOST/api/health"
```

Logi aplikacji:

```bash
az webapp log tail \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE"
```

## Pełny proces

```bash
VERSION="0.2.7"

LOCAL_IMAGE="climberbook-app"
ACR="acrgmarcinek"
ACR_HOST="acrgmarcinek.azurecr.io"
IMAGE="climberbook"

RESOURCE_GROUP="rm_gmarcinek"
APP_SERVICE="climberbook"

npx tsc --noEmit

docker build \
  -t "$LOCAL_IMAGE:latest" \
  .

docker tag \
  "$LOCAL_IMAGE:latest" \
  "$ACR_HOST/$IMAGE:$VERSION"

docker tag \
  "$LOCAL_IMAGE:latest" \
  "$ACR_HOST/$IMAGE:latest"

az acr login --name "$ACR"

docker push "$ACR_HOST/$IMAGE:$VERSION"
docker push "$ACR_HOST/$IMAGE:latest"

docker compose --env-file .env.azure run --no-deps --rm liquibase status --verbose
docker compose --env-file .env.azure run --no-deps --rm liquibase update
docker compose --env-file .env.azure run --no-deps --rm liquibase status --verbose

az webapp config container set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE" \
  --container-image-name "$ACR_HOST/$IMAGE:$VERSION" \
  --container-registry-url "https://$ACR_HOST"

az webapp restart \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE"

az webapp config show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE" \
  --query linuxFxVersion \
  --output tsv

APP_HOST="$(az webapp show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE" \
  --query defaultHostName \
  --output tsv)"

curl --fail --silent --show-error \
  "https://$APP_HOST/api/health"
```

## Rollback

Aby wrócić do poprzedniej wersji, wskaż wcześniejszy tag:

```bash
VERSION="0.2.6"

az webapp config container set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE" \
  --container-image-name "$ACR_HOST/$IMAGE:$VERSION" \
  --container-registry-url "https://$ACR_HOST"

az webapp restart \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE"
```

## Konfiguracja jednorazowa

App Service ma już:

- włączoną systemową tożsamość zarządzaną,
- rolę `AcrPull` na rejestrze `acrgmarcinek`,
- włączone `acrUseManagedIdentityCreds`.

Tych ustawień nie trzeba powtarzać przy kolejnych wdrożeniach.

```

```
