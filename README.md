# AeroVibe Monorepo

Repositorio con servicios Node.js, workers NATS/Redis y app Flutter.

## Levantar todo con 1 comando

```bash
npm run dev
```

Esto ejecuta:
- Crea `.env` desde `.env.example` en cada servicio si falta.
- Instala dependencias Node y Flutter.
- Levanta NATS/Redis con Docker Compose (root `docker-compose.yml`).
- Arranca gateway + servicios + workers.

## Requisitos

- Node.js 18+
- npm 9+
- Docker Desktop (para NATS/Redis)
- Flutter (solo si vas a correr la app móvil)

## Variables de entorno

Cada servicio usa su propio archivo `.env`:
- `aerovibe-api-gateway/.env`
- `aerovibe-api-service/.env`
- `aerovibe-iam-service/.env`
- `aerovibe-spots-service/.env`
- `aerovibe-users/.env`
- `aerovibe-nats-redis/.env`

Completá los valores en base a los `.env.example` de cada servicio.
Los `.env` no se versionan (ver `.gitignore`).

## Docker Compose (infra)

Si querés levantar solo infraestructura:

```bash
docker compose up -d
```

## Comandos útiles

```bash
npm run dev    # levantar todo
npm run build  # build de todos los servicios (no-op en Node)
npm run test   # tests (no-op en Node, corre flutter test)
```

## Puertos por defecto

- Gateway: `3000`
- IAM: `3001`
- API: `3002`
- Users: `3003`
- Spots: `3004`
- NATS: `4222`
- Redis: `6379`

## Responsabilidades por servicio

- `aerovibe-api-gateway`: proxy y CORS (routing principal).
- `aerovibe-iam-service`: autenticación (register/login/refresh).
- `aerovibe-users`: perfiles, relaciones, avatars.
- `aerovibe-spots-service`: dominio de spots (feed, detail, media, comments, favorites, copilots).
- `aerovibe-api-service`: reservado para endpoints agregados/BFF (sin spots para evitar duplicidad).

## Auth y seguridad

- Política de contraseña (backend): mínimo 8 caracteres, mayúscula, minúscula, número y símbolo.
- Validación HIBP (k‑anonymity) en IAM: bloquea contraseñas filtradas.
  - `HIBP_ENABLED=true` (default)
  - `HIBP_STRICT=false` (si `true`, falla cerrado cuando HIBP no responde)
- Rate limit en `/register`, `/login`, `/refresh`, `/change-password`.
- MFA: opcional para usuarios, **obligatorio para admins** cuando `REQUIRE_MFA_FOR_ADMIN=true`.
- Leaked password protection en Supabase Auth: pendiente (requiere upgrade de plan).
