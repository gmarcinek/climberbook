````md
# Climberbook: build i deploy obrazu do Azure

Instrukcja dla Bash / Git Bash.

## Konfiguracja

```bash
VERSION="0.1.2"

LOCAL_IMAGE="climberbook-app"
ACR="acrgmarcinek"
ACR_HOST="acrgmarcinek.azurecr.io"
IMAGE="climberbook"

RESOURCE_GROUP="rm_gmarcinek"
APP_SERVICE="climberbook"
````

Przy każdym wdrożeniu zmień tylko `VERSION`.

## 1. Zbuduj obraz lokalnie

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

## 2. Oznacz obraz tagami

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

## 3. Zaloguj się do Azure Container Registry

```bash
az login
```

Jeżeli jesteś już zalogowany, wystarczy:

```bash
az acr login --name "$ACR"
```

## 4. Wypchnij obrazy do ACR

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

## 5. Ustaw nową wersję w App Service

```bash
az webapp config container set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE" \
  --container-image-name "$ACR_HOST/$IMAGE:$VERSION" \
  --container-registry-url "https://$ACR_HOST"
```

App Service jest przypinany do konkretnej wersji, na przykład `0.1.2`. Tag `latest` jest pomocniczy.

## 6. Uruchom aplikację ponownie

```bash
az webapp restart \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE"
```

## 7. Sprawdź wdrożoną wersję

```bash
az webapp config show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE" \
  --query linuxFxVersion \
  --output tsv
```

Oczekiwany wynik:

```text
DOCKER|acrgmarcinek.azurecr.io/climberbook:0.1.2
```

Logi aplikacji:

```bash
az webapp log tail \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE"
```

## Pełny proces

```bash
VERSION="0.1.2"

LOCAL_IMAGE="climberbook-app"
ACR="acrgmarcinek"
ACR_HOST="acrgmarcinek.azurecr.io"
IMAGE="climberbook"

RESOURCE_GROUP="rm_gmarcinek"
APP_SERVICE="climberbook"

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
```

## Rollback

Aby wrócić do poprzedniej wersji, wskaż wcześniejszy tag:

```bash
VERSION="0.1.1"

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

* włączoną systemową tożsamość zarządzaną,
* rolę `AcrPull` na rejestrze `acrgmarcinek`,
* włączone `acrUseManagedIdentityCreds`.

Tych ustawień nie trzeba powtarzać przy kolejnych wdrożeniach.

```
```
