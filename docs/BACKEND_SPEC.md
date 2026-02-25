# Especificación de backend - AeroVibe

Resumen de endpoints, tablas y lógica necesaria para implementar en el API service.

---

## 1. Programación de baja de cuenta (user_profiles)

**Campos añadidos** (ver migración `20260218150000_user_deletion_scheduling.sql`):
- `is_scheduled_for_deletion` (bool)
- `deletion_requested_at` (timestamptz)
- `scheduled_deletion_at` (timestamptz)

**Endpoints:**
- `POST /api/users/schedule-deletion` – Ya existe (`scheduleAccountDeletion`). Debe actualizar estos campos en `user_profiles`.

**Dashboard admin:**
- Incluir en métricas el conteo de `admin_users_scheduled_deletion_count` (usuarios pendientes de borrado).
- Notificación/banner cuando `count > 0`.

**Cron job diario:**
- Supabase no permite borrar desde SQL. Opciones:
  1. **Edge Function + pg_cron**: Cron llama a una Edge Function que:
     - Ejecuta `SELECT * FROM get_users_scheduled_for_deletion()`
     - Para cada UUID, llama `supabase.auth.admin.deleteUser(id)`
  2. **Cron externo** (Vercel, GitHub Actions): Llama a un endpoint protegido (service_role) que hace lo mismo.

---

## 2. Subscriptions (suscripciones in-app)

**Tabla** `public.subscriptions`:
- `user_id`, `platform` (ios | android | web), `product_id`, `status`, `expires_at`, `original_transaction_id`

**Endpoint:**
- `POST /api/subscriptions/validate`
  - Body: `{ platform, product_id, receipt (Apple) | purchase_token (Google), original_transaction_id? }`
  - Detectar plataforma: `User-Agent` o campo `platform`.
  - **iOS**: Validar receipt contra Apple App Store Server API.
  - **Android**: Validar purchase_token contra Google Play Developer API.
  - Crear/actualizar fila en `subscriptions`.
  - Respuesta: `{ ok, status, expires_at }`

**RLS:** Inserts/updates solo vía service_role (endpoint protegido).

---

## 3. Support tickets (contacto desde la app)

**Tabla** `public.support_tickets`:
- `user_id`, `subject`, `message`, `status`, `created_at`

**Endpoint:**
- `POST /api/support/ticket` (requiere auth)
  - Body: `{ subject, message }`
  - Crea `support_tickets` con `user_id = auth.uid()`.

El formulario de ajustes debe llamar a este endpoint en lugar de (o además de) `support/contact` para usuarios logueados, insertando en `support_tickets` en vez de `support_requests`.

---

## 4. User blocks (bloqueo entre usuarios)

**Tabla** `public.user_blocks`:
- `blocker_id`, `blocked_id`

**Endpoints:**
- `POST /api/users/:userId/block` – Inserta en `user_blocks`.
- `DELETE /api/users/:userId/block` – Elimina de `user_blocks` (desbloquear).

Filtrar contenido de usuarios bloqueados en listados de spots, comentarios, etc.

---

## 5. Auto-ocultar contenido reportado 3 veces

**Lógica en DB** (trigger en `user_reports`):
- Al insertar/actualizar un reporte, si `(reported_type, reported_id)` tiene 3+ reportes distintos → `suspended_at = now()` en `spots` o `spot_comments`.

Implementado en migración `20260218153000_auto_hide_reported_content.sql`.

El API debe excluir `spots` y `spot_comments` con `suspended_at IS NOT NULL` en consultas públicas.

---

## 6. Admin dashboard – notificación de usuarios pendientes de borrado

- Query `admin_users_scheduled_deletion_count` (vista `public.admin_users_scheduled_deletion_count`).
- Mostrar banner/contador: “X usuarios programados para eliminación”.
