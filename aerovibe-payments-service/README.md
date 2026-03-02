# AeroVibe Payments Service

Microservicio de pagos y suscripciones de AeroVibe.

## Providers soportados

- `mercadopago_cl` (web Chile)
- `mercadopago_ar` (web Argentina)
- `stripe` (compatibilidad / fallback)
- `internal_promo`

## Funcionalidad implementada

- Checkout de suscripción web con Mercado Pago por país (`CL`/`AR`).
- Cálculo dinámico de precio local: `USD base x usd_rate`.
- Bloqueo de suscripción web para países distintos de Chile y Argentina.
- Webhooks:
  - Stripe (`/payments/webhook` y `/payments/webhook/stripe`)
  - Mercado Pago Chile (`/payments/webhook/mercadopago_cl`)
  - Mercado Pago Argentina (`/payments/webhook/mercadopago_ar`)
- Idempotencia de webhooks por `event_id + provider`.
- Persistencia de estado de suscripción en Supabase (`user_subscriptions`).
- Configuración de tasas USD por admin (`exchange_rates`).
- Emisión de eventos NATS:
  - `subscription.activated`
  - `subscription.canceled`
  - `subscription.expired`
  - `subscription.failed`

## Estructura

```
src/index.js
src/controllers/
src/middleware/
src/routes/
src/services/
src/lib/
sql/
```

## Variables de entorno

Ver `.env.example`.

Claves principales:

- `ENABLE_MP_CHILE`, `ENABLE_MP_ARG`, `ENABLE_STRIPE`
- `MP_CHILE_ACCESS_TOKEN`, `MP_ARG_ACCESS_TOKEN`
- `MP_CHILE_WEBHOOK_SECRET`, `MP_ARG_WEBHOOK_SECRET` (opcionales)
- `PRO_MONTHLY_USD`, `PRO_YEARLY_USD`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `NATS_URL`

## Base de datos (Supabase)

Ejecutar en orden:

- `sql/001_create_payments_tables.sql`
- `sql/002_add_mercadopago_and_pricing.sql`

## Endpoints

### `POST /payments/subscription/checkout`

Auth requerida.

Body:

```json
{
  "plan": "monthly"
}
```

`plan` admite: `monthly`, `annual`.

Respuesta:

```json
{
  "ok": true,
  "provider": "mercadopago_cl",
  "country": "CL",
  "plan": "monthly",
  "currency": "CLP",
  "amount_usd": 4.99,
  "amount_local": 4740,
  "usd_rate": 950,
  "url": "https://www.mercadopago..."
}
```

Errores relevantes:

- `PROFILE_COUNTRY_REQUIRED`
- `SUBSCRIPTION_NOT_AVAILABLE_IN_COUNTRY`
- `SUBSCRIPTION_MANAGED_BY_OTHER_PROVIDER`
- `EXCHANGE_RATE_NOT_CONFIGURED`

### `GET /payments/subscription/status`

Auth requerida. Retorna estado normalizado de la suscripción actual.

### `POST /payments/subscription/portal`

Auth requerida. Solo para `stripe` (compatibilidad).

### `GET /payments/admin/pricing`

Auth requerida (`admin|moderator|superadmin`). Devuelve tasas actuales y precios calculados.

### `POST /payments/admin/pricing/update`

Auth requerida (`admin|moderator|superadmin`).

Body:

```json
{
  "clRate": 950,
  "arRate": 1200
}
```

Respuesta:

```json
{
  "ok": true,
  "base_prices_usd": {
    "monthly": 4.99,
    "annual": 49.99
  },
  "countries": [
    {
      "country": "CL",
      "usd_rate": 950,
      "monthly_local": 4740,
      "annual_local": 47491
    },
    {
      "country": "AR",
      "usd_rate": 1200,
      "monthly_local": 5988,
      "annual_local": 59988
    }
  ]
}
```

### Webhooks

- `POST /payments/webhook/stripe`
- `POST /payments/webhook/mercadopago_cl`
- `POST /payments/webhook/mercadopago_ar`

## Ejecutar local

```bash
npm ci
npm run dev
```

## Docker

```bash
docker build -t aerovibe-payments-service .
docker run --env-file .env -p 3006:3006 aerovibe-payments-service
```
