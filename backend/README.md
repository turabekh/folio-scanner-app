# Scanner API

FastAPI backend service.

## Local development

The service runs inside Docker via the root `docker-compose.yml`. From the repo root:

```bash
docker compose up -d api
docker compose logs -f api
```

API is available at `https://api.localhost`.

## Endpoints

- `GET /health` — service health check
- `GET /` — service info