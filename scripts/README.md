# Scripts AeroVibe

## Scripts activos (en uso)

| Script | Uso |
|--------|-----|
| **restart-backend-web.sh** | Reinicia backend + web (libera puertos y lanza `dev.sh`). El que usás para levantar todo sin la app. |
| **dev.sh** | Levanta NATS/Redis, workers, notificaciones, web, gateway y microservicios. Opción `--no-web` para solo backend. |
| **bootstrap.sh** | Crea .env desde .env.example donde falte e instala dependencias (Node + Flutter). Lo llama `dev.sh`. |
| **release/vm-sync-main.sh** | Deploy/sincronización a la VM de producción (main). |
| **release/vm-sync-qa.sh** | Deploy/sincronización a la VM de QA. |

Desde la raíz del repo:
- `./scripts/restart-backend-web.sh` — reiniciar backend y web.
- `./scripts/dev.sh` — desarrollo completo (o `npm run dev`).
- `./scripts/dev.sh --no-web` — solo backend.
- `npm run bootstrap` — solo preparar deps y .env.

## Scripts archivados (scripts/archive/)

No se usan en el flujo diario; quedan por si en algún momento los necesitás:

- **build.sh** — build de todos los servicios + Flutter APK debug.
- **test.sh** — tests de todos los servicios + Flutter.
- **dev-no-nats.sh** — dev sin NATS/Redis (usa solo servicios Node + web + Flutter).
- **smoke-notifications.sh** — smoke test del flujo de notificaciones/recuperación.
- **unblock-admin.js** — utilidad para desbloquear admin (delega a api-service).
- **archive/release/push-local-to-develop.sh** — push a rama develop (repos).
- **archive/release/promote-develop-to-main.sh** — promover develop a main.

Para ejecutar alguno archivado: `./scripts/archive/<nombre>` o `./scripts/archive/release/<nombre>`.
