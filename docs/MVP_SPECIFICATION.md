# PoolService Pro - Especificación Técnica MVP

## Plataforma SaaS para Empresas de Servicios de Piscinas

**Versión:** 1.0
**Fecha:** Febrero 2026
**Escala MVP:** 1-5k propiedades
**Objetivo 12 meses:** 20k+ propiedades

---

# PARTE 1: ROADMAP TÉCNICO

## 1.1 Arquitectura del Sistema

### Decisión: Monolito Modular → Microservicios

**Recomendación:** Comenzar con **Monolito Modular** para el MVP.

**Justificación:**
- Menor complejidad operacional inicial
- Desarrollo más rápido (comunicación interna vs APIs)
- Equipo pequeño (7 personas) puede iterar más rápido
- Refactorización a microservicios cuando se necesite escalar (>10k propiedades)
- Costo de infraestructura 60-70% menor

**Plan de evolución:**
- MVP (0-6 meses): Monolito modular
- Fase 2 (6-12 meses): Extraer servicios críticos (Pagos, Notificaciones)
- Fase 3 (12-18 meses): Microservicios completos si el volumen lo justifica

### Diagrama de Arquitectura (Texto)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOAD BALANCER (CloudFlare/AWS ALB)             │
│                                    SSL Termination                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
              ▼                         ▼                         ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│   WEB APP (Next.js)  │  │  MOBILE APP (React   │  │   CLIENT PORTAL      │
│   Admin Dashboard    │  │  Native / Expo)      │  │   (Next.js SSR)      │
│   Puerto: 3000       │  │  iOS + Android       │  │   Puerto: 3002       │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
              │                         │                         │
              └─────────────────────────┼─────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY / BACKEND                              │
│                         Node.js + Express (Puerto 3001)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Auth      │ │  Customers  │ │   Jobs &    │ │  Payments   │           │
│  │   Module    │ │  & Props    │ │   Routes    │ │   Module    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Technician  │ │  Invoices   │ │   Reports   │ │ Integrations│           │
│  │   Module    │ │   Module    │ │   Module    │ │   Module    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
         │              │                    │                    │
         ▼              ▼                    ▼                    ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  PostgreSQL  │ │    Redis     │ │   Bull Queue     │ │   S3 / Spaces    │
│  (Primary DB)│ │   (Cache +   │ │  (Background     │ │  (File Storage)  │
│              │ │   Sessions)  │ │   Jobs)          │ │                  │
└──────────────┘ └──────────────┘ └──────────────────┘ └──────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
          ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
          │     Stripe       │ │    Twilio        │ │   QuickBooks     │
          │   (Payments)     │ │  (SMS/Voice)     │ │   Online API     │
          └──────────────────┘ └──────────────────┘ └──────────────────┘
                    │                     │                     │
          ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
          │    SendGrid      │ │  Google Maps /   │ │   Sentry         │
          │    (Email)       │ │  Mapbox (Routing)│ │  (Monitoring)    │
          └──────────────────┘ └──────────────────┘ └──────────────────┘
```

### Lista de Componentes y Responsabilidades

| Componente | Responsabilidad | Tecnología |
|------------|-----------------|------------|
| Web Admin | Dashboard, gestión completa, reportes | Next.js 14 + TypeScript |
| Mobile App | App técnicos, offline, captura datos | React Native / Expo |
| Client Portal | Vista cliente, reportes, pagos | Next.js (SSR) |
| API Backend | Lógica de negocio, APIs REST | Node.js + Express |
| Auth Module | JWT, OAuth2, roles, permisos | Passport.js + JWT |
| Queue System | Jobs async, notificaciones, sync | Bull + Redis |
| Primary DB | Datos transaccionales | PostgreSQL 15 |
| Cache | Sesiones, datos frecuentes | Redis |
| File Storage | Fotos, documentos, backups | AWS S3 / DO Spaces |
| CDN | Assets estáticos, imágenes | CloudFlare |

---

## 1.2 Stack Tecnológico Recomendado

### Frontend Web

| Aspecto | Recomendación | Justificación | Alternativas |
|---------|---------------|---------------|--------------|
| Framework | **Next.js 14** | SSR, App Router, optimizado para SEO, excelente DX | Remix, Nuxt.js |
| Lenguaje | **TypeScript** | Type safety, mejor mantenibilidad | JavaScript |
| UI Library | **Tailwind CSS + shadcn/ui** | Rápido desarrollo, componentes accesibles | Material UI, Chakra |
| State | **React Query + Zustand** | Cache de servidor + estado local simple | Redux Toolkit |
| Forms | **React Hook Form + Zod** | Validación performante | Formik |
| Charts | **Recharts** | Simple, responsive | Chart.js, D3 |

**Esfuerzo MVP:** 3-4 persona-meses

### Backend

| Aspecto | Recomendación | Justificación | Alternativas |
|---------|---------------|---------------|--------------|
| Runtime | **Node.js 20 LTS** | Mismo lenguaje que frontend, gran ecosistema | Go, Python |
| Framework | **Express.js** | Maduro, flexible, gran comunidad | Fastify, NestJS |
| ORM | **Prisma** | Type-safe, migraciones, excelente DX | TypeORM, Knex |
| Validación | **Zod** | Schema validation compartido con frontend | Joi, Yup |
| Auth | **Passport.js + JWT** | Flexible, múltiples estrategias | Auth0 (más caro) |
| API Docs | **Swagger/OpenAPI** | Documentación automática | - |

**Esfuerzo MVP:** 5-6 persona-meses

### Mobile

| Aspecto | Recomendación | Justificación | Alternativas |
|---------|---------------|---------------|--------------|
| Framework | **React Native + Expo** | Código compartido, OTA updates, menor costo | Flutter, Native |
| State | **Zustand + React Query** | Consistencia con web | Redux |
| Offline | **WatermelonDB** | SQLite wrapper optimizado para sync | Realm |
| Maps | **react-native-maps** | Nativo, buen rendimiento | Mapbox SDK |
| Camera | **expo-camera + expo-image-picker** | Integrado en Expo | - |
| Storage | **expo-secure-store** | Datos sensibles encriptados | - |

**Esfuerzo MVP:** 4-5 persona-meses

### Base de Datos

| Aspecto | Recomendación | Justificación | Alternativas |
|---------|---------------|---------------|--------------|
| Primary DB | **PostgreSQL 15** | ACID, JSON support, extensiones, escalable | MySQL |
| Cache | **Redis 7** | Sesiones, cache, pub/sub, queues | Memcached |
| Search | **PostgreSQL FTS** | Suficiente para MVP, sin infra adicional | Elasticsearch |
| Hosting DB | **Railway / Supabase** | Managed, backups, fácil setup | AWS RDS |

**Esfuerzo MVP:** 1-2 persona-meses (diseño + migraciones)

### Servicios Externos

| Servicio | Proveedor | Justificación | Costo Estimado (5k props) |
|----------|-----------|---------------|---------------------------|
| Pagos | **Stripe** | ACH, Cards, Subscriptions, Connect | 2.9% + $0.30/tx |
| SMS | **Twilio** | Confiable, buen API | ~$200-400/mes |
| Email | **SendGrid** | 100k emails/mes gratis | $0-50/mes |
| Maps | **Google Maps Platform** | Routing, geocoding, familiar | ~$200-500/mes |
| Storage | **AWS S3 / DO Spaces** | Barato, escalable | ~$20-50/mes |
| Hosting | **Railway / Render** | Simple, auto-deploy | ~$50-150/mes |
| Monitoring | **Sentry** | Error tracking, performance | $26/mes |
| Analytics | **Mixpanel Free / PostHog** | Product analytics | $0-50/mes |

---

## 1.3 Esquema de Base de Datos

### Entidades Principales y Relaciones

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    companies    │       │     users       │       │   customers     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │       │ id (PK)         │
│ name            │  │    │ company_id (FK) │◄──────│ company_id (FK) │
│ subscription    │  │    │ email           │       │ first_name      │
│ settings (JSON) │  └───►│ role            │       │ last_name       │
│ created_at      │       │ is_active       │       │ email           │
└─────────────────┘       └─────────────────┘       │ phone           │
                                                     │ billing_address │
                                                     │ autopay_enabled │
                                                     │ stripe_customer │
                                                     └────────┬────────┘
                                                              │
                          ┌───────────────────────────────────┘
                          │
                          ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   properties    │       │   jobs          │       │    visits       │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ property_id(FK) │       │ id (PK)         │
│ customer_id(FK) │       │ id (PK)         │◄──────│ job_id (FK)     │
│ address         │       │ service_type    │       │ technician_id   │
│ city, state     │       │ frequency       │       │ scheduled_date  │
│ lat, lng        │       │ day_of_week     │       │ status          │
│ gate_code       │       │ price           │       │ arrival_time    │
│ access_notes    │       │ is_active       │       │ departure_time  │
│ pool_type       │       │ next_service    │       │ notes           │
│ pool_size_gal   │       └─────────────────┘       │ photos (JSON)   │
│ equipment(JSON) │                                  └────────┬────────┘
└─────────────────┘                                           │
                                                              │
┌─────────────────┐       ┌─────────────────┐                │
│   readings      │       │   checklists    │◄───────────────┘
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ visit_id (FK)   │       │ visit_id (FK)   │
│ ph              │       │ item_name       │
│ chlorine        │       │ completed       │
│ alkalinity      │       │ notes           │
│ temperature     │       └─────────────────┘
│ tds             │
│ salt            │
│ cya             │
└─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    routes       │       │  route_stops    │       │    invoices     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ route_id (FK)   │       │ id (PK)         │
│ technician_id   │       │ id (PK)         │       │ customer_id(FK) │
│ date            │       │ property_id(FK) │       │ invoice_number  │
│ status          │       │ sequence_order  │       │ amount          │
│ optimized_at    │       │ estimated_time  │       │ tax             │
└─────────────────┘       │ actual_arrival  │       │ status          │
                          └─────────────────┘       │ due_date        │
                                                     │ paid_date       │
                                                     │ stripe_invoice  │
                                                     └────────┬────────┘
                                                              │
┌─────────────────┐       ┌─────────────────┐                │
│    payments     │       │  invoice_items  │◄───────────────┘
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ invoice_id (FK) │       │ invoice_id (FK) │
│ amount          │       │ description     │
│ method          │       │ quantity        │
│ status          │       │ unit_price      │
│ stripe_payment  │       │ total           │
│ processed_at    │       └─────────────────┘
└─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│   audit_logs    │       │  notifications  │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ company_id (FK) │       │ user_id (FK)    │
│ user_id (FK)    │       │ type            │
│ action          │       │ channel         │
│ entity_type     │       │ content         │
│ entity_id       │       │ sent_at         │
│ old_values      │       │ status          │
│ new_values      │       └─────────────────┘
│ ip_address      │
│ created_at      │
└─────────────────┘
```

### Índices Recomendados

```sql
-- Performance crítica
CREATE INDEX idx_visits_scheduled_date ON visits(scheduled_date);
CREATE INDEX idx_visits_technician_date ON visits(technician_id, scheduled_date);
CREATE INDEX idx_properties_customer ON properties(customer_id);
CREATE INDEX idx_jobs_property ON jobs(property_id) WHERE is_active = true;
CREATE INDEX idx_invoices_customer_status ON invoices(customer_id, status);
CREATE INDEX idx_route_stops_route ON route_stops(route_id, sequence_order);

-- Multi-tenant isolation
CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_invoices_company ON invoices(company_id);

-- Search
CREATE INDEX idx_customers_search ON customers USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || email));
CREATE INDEX idx_properties_address ON properties USING gin(to_tsvector('english', address || ' ' || city));
```

---

## 1.4 Autenticación y Autorización

### Estrategia de Auth

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. Login (email/password) ──► Validate ──► Issue JWT      │
│                                                              │
│   2. JWT Structure:                                          │
│      {                                                       │
│        "sub": "user_uuid",                                   │
│        "company_id": "company_uuid",                         │
│        "role": "admin|manager|technician",                   │
│        "permissions": ["read:customers", "write:jobs"...],   │
│        "exp": 1234567890                                     │
│      }                                                       │
│                                                              │
│   3. Access Token: 15 min expiry                             │
│   4. Refresh Token: 7 days expiry (stored in httpOnly cookie)│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Roles y Permisos

| Rol | Permisos | Descripción |
|-----|----------|-------------|
| **owner** | `*` (todos) | Dueño de la empresa, acceso total |
| **admin** | CRUD all except billing settings | Administrador, gestión completa |
| **manager** | CRUD customers, properties, jobs, view reports | Supervisor de operaciones |
| **technician** | Read assigned routes, write visits/readings | Técnico de campo |
| **client** | Read own properties, invoices, payments | Cliente final (portal) |

### Matriz de Permisos Detallada

```javascript
const PERMISSIONS = {
  owner: ['*'],
  admin: [
    'customers:*', 'properties:*', 'jobs:*', 'routes:*',
    'invoices:*', 'payments:read', 'reports:*', 'users:*',
    'settings:read'
  ],
  manager: [
    'customers:*', 'properties:*', 'jobs:*', 'routes:*',
    'invoices:read', 'reports:read', 'users:read'
  ],
  technician: [
    'routes:read:own', 'visits:*:own', 'readings:*:own',
    'properties:read:assigned', 'customers:read:assigned'
  ],
  client: [
    'properties:read:own', 'visits:read:own', 'invoices:read:own',
    'payments:create:own', 'readings:read:own'
  ]
};
```

### OAuth2 / SSO (Fase 2)

- Google OAuth para login simplificado (admin/managers)
- Magic links para clientes (portal)
- SSO con SAML para empresas enterprise (futuro)

---

## 1.5 Estrategia Offline Mobile

### Arquitectura Offline-First

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE OFFLINE STRATEGY                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│   │   UI Layer  │────►│  State Mgmt │────►│  Sync Engine│  │
│   │  (React)    │     │  (Zustand)  │     │             │  │
│   └─────────────┘     └─────────────┘     └──────┬──────┘  │
│                              │                    │         │
│                              ▼                    ▼         │
│                       ┌─────────────┐     ┌─────────────┐  │
│                       │ WatermelonDB│     │  API Client │  │
│                       │  (SQLite)   │◄───►│  (Axios)    │  │
│                       └─────────────┘     └─────────────┘  │
│                                                              │
│   DATOS LOCALES (disponibles offline):                       │
│   ├── Ruta del día (propiedades, clientes, direcciones)     │
│   ├── Últimas 3 visitas por propiedad (historial)           │
│   ├── Checklist templates                                    │
│   ├── Lecturas en cola para sync                            │
│   └── Fotos pendientes de upload (comprimidas)              │
│                                                              │
│   LÍMITES:                                                   │
│   ├── Max 500 propiedades en cache local                    │
│   ├── Max 50MB de fotos pendientes                          │
│   ├── Datos de ruta: 7 días adelante                        │
│   └── Historial: 30 días atrás                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Resolución de Conflictos

```javascript
// Estrategia: Last-Write-Wins con timestamp del servidor
const syncStrategy = {
  // Lecturas: siempre se envían, servidor valida timestamp
  readings: 'APPEND_ONLY',

  // Visitas: merge de campos no conflictivos
  visits: 'FIELD_LEVEL_MERGE',

  // Fotos: siempre se suben, nunca se sobreescriben
  photos: 'APPEND_ONLY',

  // Ruta: servidor es fuente de verdad
  routes: 'SERVER_WINS',

  // Conflicto real: notificar y pedir resolución manual
  onConflict: (local, server) => {
    if (local.updated_at > server.updated_at) {
      return { action: 'KEEP_LOCAL', notify: true };
    }
    return { action: 'ACCEPT_SERVER', notify: true };
  }
};
```

### Cola de Sincronización

```javascript
// Estructura de cola offline
const offlineQueue = {
  pending: [
    {
      id: 'uuid',
      type: 'COMPLETE_VISIT',
      payload: { visit_id, readings, checklist, notes },
      created_at: 'ISO timestamp',
      retries: 0,
      priority: 1 // 1=high, 2=medium, 3=low
    }
  ],

  // Proceso de sync
  syncProcess: {
    trigger: ['NETWORK_AVAILABLE', 'APP_FOREGROUND', 'MANUAL'],
    batchSize: 10,
    retryPolicy: {
      maxRetries: 5,
      backoff: 'EXPONENTIAL', // 1s, 2s, 4s, 8s, 16s
    },
    conflictUI: true // Mostrar modal si hay conflicto
  }
};
```

---

## 1.6 Integraciones Externas

### QuickBooks Online

| Aspecto | Detalle |
|---------|---------|
| **Endpoints** | `/v3/company/{companyId}/customer`, `/invoice`, `/payment` |
| **Frecuencia Sync** | Push inmediato (invoices), Pull cada 6 horas (customers) |
| **Datos sincronizados** | Customers ↔ Clientes, Invoices → QB, Payments ← QB |
| **Auth** | OAuth 2.0, refresh token cada 100 días |
| **Webhook** | `payment.created`, `customer.updated` |

```javascript
// Ejemplo: Crear factura en QuickBooks
const createQBInvoice = async (invoice) => {
  const qbInvoice = {
    CustomerRef: { value: customer.qb_id },
    Line: invoice.items.map(item => ({
      Amount: item.total,
      DetailType: 'SalesItemLineDetail',
      SalesItemLineDetail: {
        ItemRef: { value: item.qb_item_id },
        Qty: item.quantity,
        UnitPrice: item.unit_price
      }
    })),
    DueDate: invoice.due_date
  };

  return await qbClient.createInvoice(qbInvoice);
};
```

### Stripe (Pagos)

| Aspecto | Detalle |
|---------|---------|
| **Productos usados** | Stripe Payments, Stripe Connect (futuro multi-company) |
| **Métodos de pago** | Cards, ACH Direct Debit, Link |
| **Webhooks críticos** | `payment_intent.succeeded`, `payment_intent.failed`, `invoice.paid` |
| **PCI Compliance** | SAQ-A (Stripe.js, nunca tocamos card data) |

```javascript
// AutoPay flow
const processAutoPay = async (invoice) => {
  const customer = await getCustomer(invoice.customer_id);

  if (!customer.autopay_enabled || !customer.stripe_payment_method) {
    return { success: false, reason: 'AUTOPAY_NOT_CONFIGURED' };
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(invoice.total * 100),
    currency: 'usd',
    customer: customer.stripe_customer_id,
    payment_method: customer.stripe_payment_method,
    off_session: true,
    confirm: true,
    metadata: { invoice_id: invoice.id }
  });

  return { success: true, payment_intent: paymentIntent.id };
};
```

### Twilio (SMS)

| Aspecto | Detalle |
|---------|---------|
| **Uso** | Recordatorios de servicio, notificaciones de pago, alertas |
| **Número** | Número dedicado por empresa (futuro) o número compartido |
| **Templates** | Pre-aprobados para mejor entrega |

### Google Maps Platform

| API | Uso | Costo estimado |
|-----|-----|----------------|
| Geocoding | Convertir direcciones a lat/lng | $5/1000 requests |
| Directions | Calcular rutas entre stops | $5-10/1000 requests |
| Distance Matrix | Optimizar orden de paradas | $5/1000 elements |
| Maps JavaScript | Visualización en web | $7/1000 loads |
| Maps SDK Mobile | Visualización en app | $7/1000 loads |

---

## 1.7 CI/CD y Observabilidad

### Pipeline CI/CD

```yaml
# .github/workflows/main.yml (simplificado)
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Railway Staging
        run: railway up --environment staging

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Railway Production
        run: railway up --environment production
```

### Estrategia de Testing

| Tipo | Herramienta | Cobertura MVP |
|------|-------------|---------------|
| Unit Tests | Jest | 70% business logic |
| Integration | Jest + Supertest | APIs críticas |
| E2E | Playwright | 10 flujos principales |
| Mobile | Detox | 5 flujos críticos |

### Observabilidad

```
┌─────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   LOGS                                                       │
│   ├── Winston (structured JSON logs)                        │
│   ├── Railway Logs (agregación básica)                      │
│   └── Sentry (error tracking + breadcrumbs)                 │
│                                                              │
│   METRICS                                                    │
│   ├── Custom metrics (response times, queue depth)          │
│   ├── Railway Metrics (CPU, Memory, Network)                │
│   └── Stripe Dashboard (payment metrics)                    │
│                                                              │
│   ALERTAS                                                    │
│   ├── Sentry (errores > threshold)                          │
│   ├── UptimeRobot (health checks)                           │
│   └── Custom (payment failures, sync errors)                │
│                                                              │
│   TRACING (Fase 2)                                          │
│   └── OpenTelemetry → Jaeger/Tempo                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1.8 Seguridad y Compliance

### Requisitos de Seguridad

| Área | Implementación |
|------|----------------|
| **Datos en tránsito** | TLS 1.3 obligatorio, HSTS |
| **Datos en reposo** | PostgreSQL encryption, S3 SSE-S3 |
| **Autenticación** | bcrypt (cost 12), JWT RS256 |
| **Secretos** | Railway env vars, nunca en código |
| **API Security** | Rate limiting, CORS, helmet.js |
| **Input Validation** | Zod schemas, sanitización SQL |

### PCI DSS (Pagos)

```
┌─────────────────────────────────────────────────────────────┐
│                    PCI DSS COMPLIANCE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   NIVEL: SAQ-A (más simple, Stripe maneja todo)             │
│                                                              │
│   REQUISITOS:                                                │
│   ✓ Nunca almacenar números de tarjeta                      │
│   ✓ Usar Stripe.js / Stripe Elements                        │
│   ✓ Solo comunicación HTTPS                                 │
│   ✓ No acceso a datos de tarjeta en servidor                │
│   ✓ Stripe Payment Methods para cobros recurrentes          │
│                                                              │
│   IMPLEMENTACIÓN:                                            │
│   - Frontend: Stripe Elements para captura                  │
│   - Backend: Solo recibe payment_method_id (token)          │
│   - Almacenamos: stripe_customer_id, last4, brand           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### GDPR/CCPA Consideraciones

| Requisito | Implementación |
|-----------|----------------|
| Derecho a acceso | API endpoint `/api/users/me/data-export` |
| Derecho a eliminación | Soft delete + hard delete tras 30 días |
| Consentimiento | Checkbox explícito en registro |
| Minimización | Solo datos necesarios |
| Notificación de breach | Proceso documentado, <72h |

---

## 1.9 Estimaciones de Esfuerzo y Costos

### Esfuerzo por Componente (MVP)

| Componente | Persona-Meses | Riesgo | Mitigación |
|------------|---------------|--------|------------|
| Auth + Users | 1.0 | Bajo | Usar Passport.js probado |
| Customers/Properties | 1.5 | Bajo | CRUD estándar |
| Jobs + Scheduling | 2.0 | Medio | Lógica de recurrencia compleja |
| Routes + Optimization | 2.5 | Alto | Integración Maps, algoritmo |
| Mobile App (core) | 4.0 | Alto | Offline sync es complejo |
| Visits + Readings | 1.5 | Bajo | Formularios móviles |
| Invoices + Payments | 3.0 | Alto | Stripe integration, edge cases |
| QuickBooks Sync | 1.5 | Medio | API cambiante, OAuth |
| Notifications | 1.0 | Bajo | Twilio/SendGrid son simples |
| Admin Dashboard | 2.0 | Bajo | CRUD + charts |
| Reports | 1.5 | Bajo | Queries SQL |
| Client Portal | 1.5 | Bajo | Read-only + payments |
| **TOTAL** | **23.0** | - | - |

### Costo Operativo Mensual (5k propiedades)

| Servicio | Estimado Bajo | Estimado Alto |
|----------|---------------|---------------|
| Railway (Backend + DB) | $50 | $150 |
| Railway (Frontend) | $20 | $50 |
| PostgreSQL (managed) | $25 | $75 |
| Redis | $15 | $30 |
| AWS S3 (storage) | $20 | $50 |
| Stripe fees (2.9% + $0.30) | Variable | Variable |
| Twilio SMS | $150 | $400 |
| SendGrid | $0 | $50 |
| Google Maps | $200 | $500 |
| Sentry | $26 | $26 |
| Domain + SSL | $15 | $15 |
| **TOTAL (sin Stripe fees)** | **$521** | **$1,346** |

### Riesgos Técnicos Principales

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Sync offline falla | Media | Alto | Testing exhaustivo, fallbacks UI |
| Stripe integration issues | Baja | Alto | Sandbox testing, retry logic |
| Maps API costos exceden | Media | Medio | Caching, batch requests, límites |
| QuickBooks API cambios | Media | Medio | Abstraction layer, versioning |
| Performance con 20k props | Media | Alto | Índices, paginación, cache |
| Mobile app store rejection | Baja | Alto | Seguir guidelines, beta testing |

---

# PARTE 2: WIREFRAMES Y FLUJOS UX

## 2.1 Mapa de Navegación General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NAVIGATION MAP                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ADMIN WEB APP                                                              │
│   ├── /login                                                                 │
│   ├── /dashboard (Home)                                                      │
│   │   ├── KPIs, alertas, actividad reciente                                 │
│   │   └── Quick actions                                                      │
│   ├── /customers                                                             │
│   │   ├── Lista + búsqueda + filtros                                        │
│   │   ├── /customers/new                                                     │
│   │   └── /customers/:id (detalle + propiedades)                            │
│   ├── /properties                                                            │
│   │   ├── Lista + mapa                                                       │
│   │   └── /properties/:id (detalle + historial)                             │
│   ├── /schedule                                                              │
│   │   ├── Calendario (día/semana/mes)                                       │
│   │   ├── /schedule/routes/:date (vista de rutas)                           │
│   │   └── Drag & drop reordering                                            │
│   ├── /technicians                                                           │
│   │   ├── Lista de técnicos                                                 │
│   │   └── /technicians/:id (rendimiento)                                    │
│   ├── /invoices                                                              │
│   │   ├── Lista + filtros (status, fecha)                                   │
│   │   ├── /invoices/new                                                      │
│   │   └── /invoices/:id (detalle + acciones)                                │
│   ├── /reports                                                               │
│   │   ├── Revenue, servicios, químicos                                      │
│   │   └── Exportar PDF/CSV                                                  │
│   └── /settings                                                              │
│       ├── Company profile                                                    │
│       ├── Users & permissions                                                │
│       ├── Integrations (QB, Stripe)                                         │
│       ├── Notifications                                                      │
│       └── Billing                                                            │
│                                                                              │
│   MOBILE APP (TECHNICIAN)                                                    │
│   ├── Login                                                                  │
│   ├── Today's Route (default screen)                                        │
│   │   ├── Lista de stops ordenados                                          │
│   │   ├── Mapa con ruta                                                     │
│   │   └── Navigate to next                                                   │
│   ├── Property Detail                                                        │
│   │   ├── Info del cliente                                                  │
│   │   ├── Gate code, notas                                                  │
│   │   └── Historial reciente                                                │
│   ├── Service Screen (durante visita)                                       │
│   │   ├── Checklist                                                          │
│   │   ├── Lecturas químicas                                                 │
│   │   ├── Fotos                                                              │
│   │   ├── Notas                                                              │
│   │   └── Complete visit                                                     │
│   └── Profile / Settings                                                     │
│                                                                              │
│   CLIENT PORTAL                                                              │
│   ├── /portal/login (magic link)                                            │
│   ├── /portal/dashboard                                                      │
│   │   ├── Próximo servicio                                                  │
│   │   ├── Últimas lecturas                                                  │
│   │   └── Balance pendiente                                                  │
│   ├── /portal/services                                                       │
│   │   └── Historial de visitas                                              │
│   ├── /portal/invoices                                                       │
│   │   ├── Lista de facturas                                                 │
│   │   └── Pagar ahora                                                        │
│   └── /portal/settings                                                       │
│       └── Payment methods, AutoPay                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2.2 Wireframes Textuales por Pantalla

### Pantalla 1: Admin Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [Logo] PoolService Pro    [🔔 3] [👤 John Smith ▼]                      │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────┬───────────────────────────────────────────────────────────────┤
│ SIDEBAR     │ MAIN CONTENT                                                  │
│             │                                                                │
│ [🏠] Dashboard│ ┌─────────────────────────────────────────────────────────┐ │
│ [👥] Customers│ │ QUICK STATS (4 cards en fila)                           │ │
│ [🏊] Properties│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │ │
│ [📅] Schedule│ │ │ Services │ │ Revenue  │ │ Pending  │ │ Active   │    │ │
│ [🧑‍🔧] Technicians│ │ │ Today    │ │ This     │ │ Invoices │ │ Customers│    │ │
│ [💳] Invoices│ │ │          │ │ Month    │ │          │ │          │    │ │
│ [📊] Reports│ │ │   24     │ │ $12,450  │ │    8     │ │   156    │    │ │
│ [⚙️] Settings│ │ │ ↑12%     │ │ ↑8%      │ │ ↓2       │ │ ↑3       │    │ │
│             │ │ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │ │
│             │ └─────────────────────────────────────────────────────────┘ │
│             │                                                                │
│             │ ┌─────────────────────────┐ ┌─────────────────────────────┐ │
│             │ │ TODAY'S ROUTES          │ │ RECENT ACTIVITY             │ │
│             │ │                         │ │                             │ │
│             │ │ Mike S. - 8 stops       │ │ • Invoice #1042 paid $150  │ │
│             │ │ [■■■■■□□□] 62%          │ │   2 min ago                │ │
│             │ │                         │ │                             │ │
│             │ │ Sarah L. - 6 stops      │ │ • New customer: Pool Plus  │ │
│             │ │ [■■■□□□□□] 33%          │ │   15 min ago               │ │
│             │ │                         │ │                             │ │
│             │ │ [View All Routes →]     │ │ • Service completed #2847  │ │
│             │ │                         │ │   32 min ago               │ │
│             │ └─────────────────────────┘ │                             │ │
│             │                             │ [View All →]                │ │
│             │ ┌─────────────────────────┐ └─────────────────────────────┘ │
│             │ │ ALERTS (3)              │                                │
│             │ │                         │                                │
│             │ │ ⚠️ Payment failed - ABC Corp                             │
│             │ │ ⚠️ Low chlorine - 123 Main St                           │
│             │ │ ⚠️ Overdue invoice - Smith                              │
│             │ │                         │                                │
│             │ │ [Dismiss All] [View →]  │                                │
│             │ └─────────────────────────┘                                │
└─────────────┴───────────────────────────────────────────────────────────────┘

ESTADOS:
- Empty: "No hay actividad reciente" con ilustración
- Loading: Skeleton loaders en cada card
- Error: Banner rojo "Error cargando datos. [Reintentar]"

INTERACCIONES:
- Click en stat card → navega a sección correspondiente
- Click en alerta → abre detalle/acción
- Sidebar colapsable en mobile (hamburger menu)
```

### Pantalla 2: Gestión de Clientes/Propiedades

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER: [← Back] Customers                        [+ New Customer]          │
├─────────────────────────────────────────────────────────────────────────────┤
│ FILTERS BAR                                                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [🔍 Search customers...                    ] [Status ▼] [Sort ▼]       │ │
│ │                                               All/Active/  Name/       │ │
│ │                                               Inactive    Date/Balance │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ CUSTOMER LIST                                                                │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ [Avatar] John Smith                              [●] Active         │ │ │
│ │ │          john@email.com | (555) 123-4567                           │ │ │
│ │ │          2 properties | Balance: $0.00                              │ │ │
│ │ │          Last service: Jan 15, 2026                                 │ │ │
│ │ │                                                    [Edit] [View →]  │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ [Avatar] Mary Johnson                            [●] Active         │ │ │
│ │ │          mary.j@email.com | (555) 987-6543       [AutoPay ✓]       │ │ │
│ │ │          1 property | Balance: $150.00 (overdue)                   │ │ │
│ │ │          Last service: Jan 10, 2026                                 │ │ │
│ │ │                                                    [Edit] [View →]  │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │ [Load More] or [1] [2] [3] ... [10]                                    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

CUSTOMER DETAIL VIEW (/customers/:id)
┌─────────────────────────────────────────────────────────────────────────────┐
│ [← Customers] John Smith                    [Edit] [🗑️ Delete] [⋮ More]    │
├─────────────────────────────────────────────────────────────────────────────┤
│ TABS: [Overview] [Properties (2)] [Services] [Invoices] [Notes]             │
├─────────────────────────────────────────────────────────────────────────────┤
│ OVERVIEW TAB                                                                 │
│ ┌────────────────────────────┐ ┌────────────────────────────────────────┐  │
│ │ CONTACT INFO               │ │ BILLING INFO                            │  │
│ │                            │ │                                          │  │
│ │ Email: john@email.com      │ │ Balance: $0.00                          │  │
│ │ Phone: (555) 123-4567      │ │ AutoPay: Enabled ✓                      │  │
│ │ Address: 123 Main St       │ │ Card: •••• 4242                         │  │
│ │          Austin, TX 78701  │ │ [Manage Payment Methods]                │  │
│ │                            │ │                                          │  │
│ │ [Edit Contact Info]        │ │ Monthly Rate: $150.00                   │  │
│ └────────────────────────────┘ └────────────────────────────────────────┘  │
│                                                                              │
│ PROPERTIES                                      [+ Add Property]            │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [🏠] 123 Main St, Austin TX          Weekly - Monday                    │ │
│ │      Pool: 15,000 gal | Gate: #1234  Last: Jan 15, 2026                │ │
│ │                                                         [View Details]  │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ [🏠] 456 Oak Ave, Austin TX          Bi-weekly - Wednesday             │ │
│ │      Pool: 22,000 gal | Gate: None   Last: Jan 8, 2026                 │ │
│ │                                                         [View Details]  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

ESTADOS VACÍOS:
- No customers: "No customers yet. [+ Add your first customer]"
- No properties: "This customer has no properties. [+ Add Property]"
- Search no results: "No customers match your search. Try different keywords."

VALIDACIONES:
- Email: formato válido, único por empresa
- Phone: formato US válido
- Required: name, email OR phone
```

### Pantalla 3: Calendario/Programación de Rutas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER: Schedule                      [Today] [< Week >] [Month ▼]          │
├─────────────────────────────────────────────────────────────────────────────┤
│ SUBHEADER: January 20-26, 2026                                              │
│ Technicians: [All ▼]  [Mike S.] [Sarah L.] [+ Add Filter]                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ CALENDAR VIEW (Week)                                                        │
│ ┌─────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬──────┐ │
│ │     │  Mon 20 │ Tue 21  │ Wed 22  │ Thu 23  │ Fri 24  │ Sat 25  │ Sun  │ │
│ ├─────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼──────┤ │
│ │Mike │ 8 stops │ 7 stops │ 9 stops │ 6 stops │ 8 stops │   --    │  --  │ │
│ │ S.  │ ████    │ ███     │ █████   │ ██      │ ████    │         │      │ │
│ │     │ $1,200  │ $1,050  │ $1,350  │ $900    │ $1,200  │         │      │ │
│ ├─────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼──────┤ │
│ │Sarah│ 6 stops │ 8 stops │ 5 stops │ 7 stops │ 6 stops │   --    │  --  │ │
│ │ L.  │ ███     │ ████    │ ██      │ ███     │ ███     │         │      │ │
│ │     │ $900    │ $1,200  │ $750    │ $1,050  │ $900    │         │      │ │
│ └─────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴──────┘ │
│                                                                              │
│ Click on any day to view/edit route details                                 │
└─────────────────────────────────────────────────────────────────────────────┘

ROUTE DETAIL VIEW (Click on day)
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER: Mike S. - Monday, Jan 20           [Optimize Route] [+ Add Stop]   │
├────────────────────────────────────┬────────────────────────────────────────┤
│ STOP LIST (Drag to reorder)        │ MAP VIEW                               │
│                                    │                                        │
│ [≡] 1. Smith Residence      8:00am │   ┌────────────────────────────────┐  │
│     123 Main St                    │   │         [Map showing           │  │
│     Est: 45 min | $150             │   │          optimized route       │  │
│     [Navigate] [Skip] [Details]    │   │          with numbered         │  │
│                                    │   │          markers]              │  │
│ [≡] 2. Johnson Pool         9:00am │   │                                │  │
│     456 Oak Ave                    │   │    1 ──── 2 ──── 3             │  │
│     Est: 30 min | $120             │   │                  │             │  │
│     [Navigate] [Skip] [Details]    │   │    6 ◄─── 5 ◄─── 4             │  │
│                                    │   │                                │  │
│ [≡] 3. ABC Corp Pool       10:00am │   │  Total: 42 miles               │  │
│     789 Business Park              │   │  Est. time: 5h 30m             │  │
│     Est: 60 min | $200             │   │                                │  │
│     [Navigate] [Skip] [Details]    │   └────────────────────────────────┘  │
│                                    │                                        │
│ ... (draggable list continues)     │  [Save Order] [Reset to Optimized]   │
│                                    │                                        │
│ SUMMARY:                           │                                        │
│ 8 stops | Est. 5h 30m | $1,200    │                                        │
└────────────────────────────────────┴────────────────────────────────────────┘

INTERACCIONES CRÍTICAS:

1. DRAG & DROP REORDER:
   - Arrastrar stop cambia orden visual inmediatamente
   - Mapa actualiza ruta en tiempo real
   - "ETA" se recalcula para cada stop
   - Toast: "Route updated. [Undo]"

2. CONFLICTOS DE PROGRAMACIÓN:
   - Si se arrastra stop que excede horario:
     Warning: "⚠️ This change will extend the route past 5:00 PM"
     Options: [Continue Anyway] [Cancel]

   - Si técnico tiene día bloqueado:
     Error: "Mike is not available on this day."
     Options: [Assign to different tech] [Cancel]

3. OPTIMIZE ROUTE BUTTON:
   - Llama a Google Maps Optimization API
   - Loading state: "Optimizing route..." (spinner)
   - Success: Muestra nuevo orden con comparación
     "New route saves 12 miles (28 min). [Apply] [Keep Current]"
   - Error: "Could not optimize. [Try Again] [Manual Order]"
```

### Pantalla 4: App Móvil Técnico (Servicio)

```
MOBILE: TODAY'S ROUTE (Home Screen)
┌─────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓ 9:41 AM ▓▓▓▓▓▓▓▓▓▓ │  (Status bar)
├─────────────────────────────────┤
│                                 │
│  Good morning, Mike! ☀️         │
│  Monday, January 20            │
│                                 │
│  ┌─────────────────────────────┐│
│  │ TODAY'S PROGRESS            ││
│  │ [████████░░░░░░░░] 4/8      ││
│  │ 4 completed • 4 remaining   ││
│  └─────────────────────────────┘│
│                                 │
│  ⚡ NEXT STOP                   │
│  ┌─────────────────────────────┐│
│  │ 5. Johnson Residence        ││
│  │    456 Oak Ave, Austin      ││
│  │                             ││
│  │    🚗 12 min away           ││
│  │    ⏱️ Est: 30 min            ││
│  │    Gate: #4521              ││
│  │                             ││
│  │  [  🗺️ Navigate  ]  [ Start ]││
│  └─────────────────────────────┘│
│                                 │
│  📋 REMAINING STOPS             │
│  ┌─────────────────────────────┐│
│  │ 6. Smith Pool     10:30 AM  ││
│  │ 7. ABC Corp       11:15 AM  ││
│  │ 8. Park Place     12:00 PM  ││
│  │              [View All →]   ││
│  └─────────────────────────────┘│
│                                 │
│  [Offline Mode: 2 pending sync] │
│                                 │
├─────────────────────────────────┤
│ [🏠 Route] [📋 History] [👤 Me] │  (Tab bar)
└─────────────────────────────────┘

MOBILE: SERVICE SCREEN (Durante visita)
┌─────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓ 9:45 AM ▓▓▓▓▓▓▓▓▓▓ │
├─────────────────────────────────┤
│ [← Route]  Johnson Residence   │
│            ⏱️ Started 9:42 AM   │
├─────────────────────────────────┤
│ TABS: [Checklist] [Readings] [Photos] [Notes] │
├─────────────────────────────────┤
│                                 │
│ CHECKLIST                       │
│ ┌─────────────────────────────┐ │
│ │ [✓] Skim surface            │ │
│ │ [✓] Brush walls             │ │
│ │ [✓] Vacuum floor            │ │
│ │ [ ] Empty baskets           │ │
│ │ [ ] Check pump              │ │
│ │ [ ] Add chemicals           │ │
│ │ [ ] Test water              │ │
│ │ [ ] Backwash filter         │ │
│ └─────────────────────────────┘ │
│                                 │
│ Progress: 3/8 items             │
│                                 │
├─────────────────────────────────┤
│                                 │
│ [    📸 Add Photo    ]          │
│                                 │
│ [ 🏁 Complete Service ]         │
│    (disabled until checklist    │
│     minimum complete)           │
│                                 │
└─────────────────────────────────┘

MOBILE: READINGS TAB
┌─────────────────────────────────┐
│ TABS: [Checklist] [*Readings*] [Photos] [Notes] │
├─────────────────────────────────┤
│                                 │
│ CHEMICAL READINGS               │
│                                 │
│ pH Level          [  7.4  ] ✓  │
│ Ideal: 7.2 - 7.6               │
│                                 │
│ Free Chlorine     [  2.5  ] ✓  │
│ Ideal: 1.0 - 3.0 ppm           │
│                                 │
│ Alkalinity        [  95   ] ✓  │
│ Ideal: 80 - 120 ppm            │
│                                 │
│ CYA               [  45   ] ✓  │
│ Ideal: 30 - 50 ppm             │
│                                 │
│ Salt              [ 3200  ] ✓  │
│ Ideal: 2700 - 3400 ppm         │
│                                 │
│ Temperature       [  78°F ]    │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 💡 RECOMMENDATIONS          │ │
│ │                             │ │
│ │ All readings within range!  │ │
│ │ No chemical adjustments     │ │
│ │ needed today.               │ │
│ └─────────────────────────────┘ │
│                                 │
│ Last reading: Jan 13 (7 days)  │
│                                 │
└─────────────────────────────────┘

MOBILE: COMPLETE SERVICE MODAL
┌─────────────────────────────────┐
│                                 │
│   ┌─────────────────────────┐   │
│   │                         │   │
│   │  ✓ Complete Service?    │   │
│   │                         │   │
│   │  Time: 32 minutes       │   │
│   │  Checklist: 8/8         │   │
│   │  Photos: 2              │   │
│   │  Readings: Logged ✓     │   │
│   │                         │   │
│   │  Service notes:         │   │
│   │  ┌───────────────────┐  │   │
│   │  │ Filter cleaned,   │  │   │
│   │  │ added 2lbs shock  │  │   │
│   │  │                   │  │   │
│   │  └───────────────────┘  │   │
│   │                         │   │
│   │  [ Cancel ]  [Complete] │   │
│   │                         │   │
│   └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘

OFFLINE BEHAVIOR:
┌─────────────────────────────────┐
│ [🔴 Offline]                    │
│                                 │
│ ⚠️ Working offline              │
│                                 │
│ Your data is saved locally      │
│ and will sync when connection   │
│ is restored.                    │
│                                 │
│ Pending sync: 2 visits          │
│ Photos queued: 5                │
│                                 │
│ Last sync: 9:30 AM              │
│                                 │
│ [  Try Sync Now  ]              │
└─────────────────────────────────┘

ESTADOS Y MICROCOPY:

Loading: "Loading your route..."
Error sync: "Couldn't sync. Will retry automatically."
Complete success: "Service completed! ✓ Next stop: [Property Name]"
Photo upload: "Photo saved. Will upload when online."
GPS error: "Can't get location. Check GPS settings."
```

### Pantalla 5: Facturación/Pagos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER: Invoices                     [+ New Invoice] [Generate Monthly ▼]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ FILTERS                                                                      │
│ [🔍 Search...] [Status: All ▼] [Date: This Month ▼] [Customer ▼]           │
├─────────────────────────────────────────────────────────────────────────────┤
│ STATS ROW                                                                    │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │ Total        │ │ Paid         │ │ Pending      │ │ Overdue      │        │
│ │ $24,500      │ │ $18,200      │ │ $4,800       │ │ $1,500       │        │
│ │ 45 invoices  │ │ 32 invoices  │ │ 10 invoices  │ │ 3 invoices   │        │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────────────────────────────┤
│ INVOICE LIST                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [□] INV-2026-0045    John Smith           $150.00    ● Paid            │ │
│ │     Jan 15, 2026     Monthly Service      Paid: Jan 16                 │ │
│ │                                            [View] [PDF] [⋮]            │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ [□] INV-2026-0044    Mary Johnson         $275.00    ○ Pending         │ │
│ │     Jan 12, 2026     Monthly + Repair     Due: Jan 27                  │ │
│ │                                            [Send Reminder] [View] [⋮]  │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ [□] INV-2026-0038    ABC Corporation      $450.00    ⚠️ Overdue        │ │
│ │     Jan 5, 2026      Monthly Service      Due: Jan 20 (7 days ago)     │ │
│ │                                            [Charge Now] [View] [⋮]     │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Selected: 0  [Batch Actions ▼]                                              │
└─────────────────────────────────────────────────────────────────────────────┘

INVOICE DETAIL
┌─────────────────────────────────────────────────────────────────────────────┐
│ [← Invoices]  INV-2026-0044              [Edit] [Send] [Record Payment]    │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────┐  ┌────────────────────────────────────────┐ │
│ │ STATUS: ○ Pending          │  │ CUSTOMER                               │ │
│ │ Due in 12 days             │  │ Mary Johnson                           │ │
│ │                            │  │ mary.j@email.com                       │ │
│ │ Amount: $275.00            │  │ 456 Oak Ave, Austin TX                 │ │
│ └────────────────────────────┘  └────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ LINE ITEMS                                                                   │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Description                        Qty    Unit Price    Total           │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ Monthly Pool Service (January)      1     $150.00       $150.00        │ │
│ │ Pump Repair - Labor                 2hr   $50.00        $100.00        │ │
│ │ Replacement Part - Seal             1     $25.00        $25.00         │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │                                          Subtotal:      $275.00        │ │
│ │                                          Tax (0%):      $0.00          │ │
│ │                                          TOTAL:         $275.00        │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ ACTIVITY LOG                                                                 │
│ • Jan 12, 2026 10:30 AM - Invoice created by Admin                         │
│ • Jan 12, 2026 10:31 AM - Email sent to customer                           │
│ • Jan 15, 2026 - Email reminder sent (auto)                                │
└─────────────────────────────────────────────────────────────────────────────┘

AUTOPAY PROCESS FLOW:
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTOPAY CONSENT (Client Portal)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Enable AutoPay                                                            │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │ ✓ I authorize [Company Name] to automatically charge my saved       │  │
│   │   payment method for recurring services according to my service     │  │
│   │   agreement.                                                         │  │
│   │                                                                      │  │
│   │ • Charges will be processed on the invoice due date                 │  │
│   │ • You will receive an email receipt for each charge                 │  │
│   │ • You can cancel AutoPay at any time from this portal               │  │
│   │                                                                      │  │
│   │ Payment Method: Visa ending in 4242                                 │  │
│   │ [Change Payment Method]                                              │  │
│   │                                                                      │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   [ Cancel ]                              [ Enable AutoPay ]                │
│                                                                              │
│   By clicking "Enable AutoPay" you agree to our Terms of Service            │
│   and authorize the charges described above.                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

PAYMENT FAILED NOTIFICATION:
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚠️ Payment Failed                                                           │
│                                                                              │
│ Hi Mary,                                                                    │
│                                                                              │
│ We were unable to process the payment of $275.00 for invoice               │
│ INV-2026-0044.                                                              │
│                                                                              │
│ Reason: Card declined - Insufficient funds                                  │
│                                                                              │
│ Please update your payment method to avoid service interruption.            │
│                                                                              │
│ [ Update Payment Method ]                                                   │
│                                                                              │
│ We will automatically retry in 3 days. If you have questions,              │
│ contact us at support@poolservice.com                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

RETRY LOGIC:
- 1st failure: Retry in 3 days + email notification
- 2nd failure: Retry in 3 days + email + SMS notification
- 3rd failure: Mark as overdue + email + SMS + admin alert
- After 3 failures: Disable AutoPay, require manual intervention
```

### Pantalla 6: Portal del Cliente

```
CLIENT PORTAL: DASHBOARD
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER: [Logo] PoolService Pro              [👤 John Smith ▼] [Logout]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Welcome back, John!                                                       │
│                                                                              │
│   ┌─────────────────────────────┐  ┌─────────────────────────────────────┐ │
│   │ NEXT SERVICE                │  │ ACCOUNT BALANCE                     │ │
│   │                             │  │                                      │ │
│   │ 📅 Monday, January 27       │  │ $0.00                               │ │
│   │    8:00 AM - 9:00 AM        │  │ ✓ All paid up!                      │ │
│   │                             │  │                                      │ │
│   │ 🏠 123 Main St              │  │ AutoPay: Enabled                    │ │
│   │    Technician: Mike S.      │  │ Next charge: Feb 1 ($150.00)        │ │
│   │                             │  │                                      │ │
│   │ [View Full Schedule]        │  │ [Manage Payments]                   │ │
│   └─────────────────────────────┘  └─────────────────────────────────────┘ │
│                                                                              │
│   LATEST SERVICE REPORT                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │ January 20, 2026 - 123 Main St                      Completed ✓     │  │
│   │                                                                      │  │
│   │ READINGS                         SERVICES PERFORMED                  │  │
│   │ pH: 7.4 ✓                       ✓ Surface skimmed                   │  │
│   │ Chlorine: 2.5 ppm ✓             ✓ Walls brushed                     │  │
│   │ Alkalinity: 95 ppm ✓            ✓ Filter cleaned                    │  │
│   │ CYA: 45 ppm ✓                   ✓ Chemicals balanced                │  │
│   │                                                                      │  │
│   │ Technician notes: "Pool in great condition. Added 1lb shock as      │  │
│   │ preventive treatment before expected rain this week."               │  │
│   │                                                                      │  │
│   │ [View Photos (2)]  [View Full Report]  [Download PDF]               │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────────┐    │
│   │ 📋 Service History│ │ 💳 Invoices       │ │ ⚙️ My Settings       │    │
│   │ View all past     │ │ View & pay        │ │ Payment methods,     │    │
│   │ services          │ │ invoices          │ │ notifications        │    │
│   │ [View →]          │ │ [View →]          │ │ [View →]             │    │
│   └───────────────────┘ └───────────────────┘ └───────────────────────┘    │
│                                                                              │
│   Need help? Contact us: (555) 123-4567 | support@poolservice.com          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

CLIENT PORTAL: SERVICE HISTORY
┌─────────────────────────────────────────────────────────────────────────────┐
│ [← Dashboard]  Service History                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Property: [123 Main St ▼]     Date Range: [Last 3 months ▼]                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌─ January 2026 ────────────────────────────────────────────────────────┐  │
│ │                                                                        │  │
│ │  Jan 20  ✓ Completed   Mike S.    pH 7.4 | Cl 2.5    [View Report]   │  │
│ │  Jan 13  ✓ Completed   Mike S.    pH 7.2 | Cl 2.8    [View Report]   │  │
│ │  Jan 6   ✓ Completed   Sarah L.   pH 7.5 | Cl 2.2    [View Report]   │  │
│ │                                                                        │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│ ┌─ December 2025 ───────────────────────────────────────────────────────┐  │
│ │                                                                        │  │
│ │  Dec 30  ✓ Completed   Mike S.    pH 7.3 | Cl 2.6    [View Report]   │  │
│ │  Dec 23  ✓ Completed   Mike S.    pH 7.4 | Cl 2.4    [View Report]   │  │
│ │  ...                                                                   │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│ WATER QUALITY TREND (Last 90 days)                                         │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │  pH ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │  7.6│                                                                  │ │
│ │  7.4│    ●───●───●───●───●───●───●───●───●───●───●───●              │ │
│ │  7.2│                                                                  │ │
│ │     └──────────────────────────────────────────────────────────────   │ │
│ │       Nov        Dec            Jan                                    │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2.3 User Stories Priorizadas (MVP)

| # | Rol | Story | Prioridad | Sprint |
|---|-----|-------|-----------|--------|
| 1 | Admin | Como admin, quiero crear clientes y propiedades para comenzar a programar servicios | P0 | S1-S2 |
| 2 | Admin | Como admin, quiero crear trabajos recurrentes (semanal/quincenal/mensual) que generen visitas automáticamente | P0 | S2-S3 |
| 3 | Técnico | Como técnico, quiero ver mi ruta del día con direcciones y poder navegar a cada parada | P0 | S3-S4 |
| 4 | Técnico | Como técnico, quiero registrar lecturas químicas y completar checklist durante la visita | P0 | S4-S5 |
| 5 | Técnico | Como técnico, quiero tomar fotos del trabajo realizado y que se suban automáticamente | P0 | S4-S5 |
| 6 | Admin | Como admin, quiero generar facturas mensuales automáticamente basadas en servicios | P0 | S6-S7 |
| 7 | Admin | Como admin, quiero cobrar facturas con tarjeta/ACH y ver estado de pagos | P0 | S6-S7 |
| 8 | Cliente | Como cliente, quiero ver reportes de servicio y lecturas de mi piscina | P1 | S8 |
| 9 | Cliente | Como cliente, quiero habilitar AutoPay para que me cobren automáticamente | P1 | S8 |
| 10 | Admin | Como admin, quiero reordenar las paradas de una ruta arrastrando en el mapa | P1 | S5-S6 |
| 11 | Admin | Como admin, quiero ver reportes de revenue por mes/cliente/técnico | P1 | S9 |
| 12 | Admin | Como admin, quiero sincronizar facturas y pagos con QuickBooks | P2 | S10 |
| 13 | Técnico | Como técnico, quiero poder trabajar offline y sincronizar cuando tenga conexión | P1 | S7-S8 |
| 14 | Admin | Como admin, quiero optimizar rutas automáticamente para reducir tiempo de viaje | P2 | S9-S10 |

---

## 2.4 Prioridades de Accesibilidad y Rendimiento

### Accesibilidad (a11y)

| Área | Implementación |
|------|----------------|
| Contraste | Ratio mínimo 4.5:1 (WCAG AA) |
| Touch targets | Mínimo 44x44px en mobile |
| Keyboard nav | Tab order lógico, focus visible |
| Screen readers | ARIA labels en iconos, estados |
| Forms | Labels asociados, error messages claros |
| Loading states | Anunciados a screen readers |

### Rendimiento Mobile

| Área | Target |
|------|--------|
| First paint | < 2s en 3G |
| Bundle size | < 500KB initial JS |
| Images | WebP, lazy load, max 200KB |
| Offline cache | Service worker para assets críticos |
| Battery | Limitar GPS polling, batch syncs |
| Memory | Max 100MB cache local |

---

# PARTE 3: ESPECIFICACIONES FUNCIONALES

## 3.1 Requisitos Funcionales por Módulo

### Módulo: Autenticación y Usuarios

#### FR-AUTH-001: Login con Email/Password
- **Descripción:** Usuario puede iniciar sesión con email y contraseña
- **Prioridad:** P0
- **Validaciones:**
  - Email formato válido
  - Password mínimo 8 caracteres
  - Máximo 5 intentos fallidos → bloqueo 15 min
- **Criterios de Aceptación:**
```gherkin
Given un usuario registrado con email "john@test.com"
When ingresa email "john@test.com" y password correcto
Then recibe JWT token y es redirigido a /dashboard

Given un usuario con credenciales incorrectas
When intenta login 5 veces con password incorrecto
Then recibe error "Account locked. Try again in 15 minutes."
```

#### FR-AUTH-002: Roles y Permisos
- **Descripción:** Sistema soporta roles owner/admin/manager/technician/client
- **Prioridad:** P0
- **Reglas de negocio:**
  - Owner puede todo incluyendo billing
  - Admin puede todo excepto cambiar billing/subscription
  - Manager puede gestionar clientes, rutas, ver reportes
  - Technician solo ve sus rutas y completa visitas
- **Criterios de Aceptación:**
```gherkin
Given un usuario con rol "technician"
When intenta acceder a /admin/invoices
Then recibe error 403 y es redirigido a /unauthorized

Given un usuario con rol "admin"
When accede a /admin/settings/billing
Then recibe error 403 "Only owner can access billing settings"
```

#### FR-AUTH-003: Password Reset
- **Descripción:** Usuario puede resetear password via email
- **Prioridad:** P1
- **Flujo:**
  1. Usuario solicita reset con email
  2. Sistema envía email con link único (expira en 1h)
  3. Usuario crea nueva password
- **Criterios de Aceptación:**
```gherkin
Given un email "john@test.com" existente en el sistema
When solicita password reset
Then recibe email con link dentro de 2 minutos
And el link expira después de 1 hora
```

---

### Módulo: Clientes y Propiedades

#### FR-CUST-001: Crear Cliente
- **Descripción:** Admin puede crear nuevo cliente con información de contacto
- **Prioridad:** P0
- **Campos requeridos:** nombre, (email O teléfono)
- **Campos opcionales:** dirección billing, notas, tags
- **Validaciones:**
  - Email único por empresa
  - Teléfono formato US válido
- **Criterios de Aceptación:**
```gherkin
Given un admin en la pantalla de clientes
When hace click en "New Customer"
And completa nombre "John Smith" y email "john@test.com"
And hace click en "Save"
Then el cliente es creado
And aparece en la lista de clientes
And recibe mensaje "Customer created successfully"

Given un email "existing@test.com" ya existe
When intenta crear cliente con mismo email
Then recibe error "Email already in use"
```

#### FR-CUST-002: Crear Propiedad
- **Descripción:** Asociar una propiedad (dirección de servicio) a un cliente
- **Prioridad:** P0
- **Campos requeridos:** dirección, ciudad, estado, zip
- **Campos opcionales:** gate_code, access_notes, pool_type, pool_size, equipment
- **Criterios de Aceptación:**
```gherkin
Given un cliente existente "John Smith"
When admin agrega propiedad con dirección "123 Main St"
Then la propiedad es geocodificada automáticamente (lat/lng)
And aparece en el mapa de propiedades
And está disponible para programar servicios

Given una dirección inválida "asdfasdf"
When intenta crear propiedad
Then recibe error "Could not validate address. Please check and try again."
```

#### FR-CUST-003: Gate Codes (Seguridad)
- **Descripción:** Almacenar códigos de acceso de forma segura
- **Prioridad:** P1
- **Reglas:**
  - Gate codes encriptados en BD
  - Solo visibles para técnicos asignados
  - Audit log cuando se accede al código
- **Criterios de Aceptación:**
```gherkin
Given una propiedad con gate code "1234"
When un técnico asignado ve la propiedad en su ruta
Then puede ver el gate code
And se registra en audit log "Gate code viewed by [technician]"

Given un técnico NO asignado a una propiedad
When intenta ver detalles de esa propiedad
Then recibe error 403 "Not authorized to view this property"
```

---

### Módulo: Programación y Trabajos Recurrentes

#### FR-SCHED-001: Crear Trabajo Recurrente
- **Descripción:** Programar servicio recurrente para una propiedad
- **Prioridad:** P0
- **Frecuencias:** weekly, biweekly, monthly, custom
- **Campos:** propiedad, frecuencia, día_semana, técnico_asignado, precio
- **Criterios de Aceptación:**
```gherkin
Given una propiedad "123 Main St"
When admin crea trabajo recurrente con:
  | frequency | weekly |
  | day       | Monday |
  | price     | 150.00 |
  | technician| Mike S.|
Then se generan visitas automáticamente para las próximas 8 semanas
And aparecen en el calendario de Mike S.

Given un trabajo recurrente existente
When admin cambia técnico de "Mike S." a "Sarah L."
Then las visitas FUTURAS se asignan a Sarah
And las visitas pasadas mantienen a Mike
```

#### FR-SCHED-002: Generar Visitas Automáticas
- **Descripción:** Sistema genera visitas basadas en trabajos recurrentes
- **Prioridad:** P0
- **Reglas:**
  - Generar visitas rolling 8 semanas adelante
  - Job cada domingo a medianoche
  - Si día cae en feriado, mantener (admin puede ajustar)
- **Criterios de Aceptación:**
```gherkin
Given un trabajo weekly para Mondays
When el sistema ejecuta generación dominical
Then existen visitas para los próximos 8 Mondays
And no hay visitas duplicadas

Given un trabajo biweekly empezando el 1 de Enero
When se genera para Febrero
Then hay visitas el 1 Ene, 15 Ene, 29 Ene, 12 Feb
```

#### FR-SCHED-003: Conflictos de Programación
- **Descripción:** Detectar y alertar conflictos de horario
- **Prioridad:** P1
- **Conflictos detectados:**
  - Técnico con más de 10 paradas en un día
  - Tiempo estimado > 9 horas
  - Dos visitas al mismo tiempo
- **Criterios de Aceptación:**
```gherkin
Given Mike tiene 9 paradas el Lunes
When admin asigna parada #10 al Lunes de Mike
Then recibe warning "Mike already has 9 stops. Add anyway?"
And puede confirmar o cancelar

Given una estimación de 10 horas para la ruta
When admin guarda la ruta
Then recibe warning "Route exceeds 9 hours (10h estimated)"
```

---

### Módulo: Rutas y Optimización

#### FR-ROUTE-001: Vista de Ruta Diaria
- **Descripción:** Ver todas las paradas de un técnico para un día
- **Prioridad:** P0
- **Incluye:** lista ordenada, mapa con ruta, tiempos estimados
- **Criterios de Aceptación:**
```gherkin
Given Mike tiene 8 paradas el Lunes 20 de Enero
When admin navega a /schedule/routes/2026-01-20?tech=mike
Then ve lista de 8 paradas en orden
And mapa muestra ruta con marcadores numerados
And muestra tiempo total estimado y millas

Given no hay paradas para el día seleccionado
When admin ve la ruta
Then muestra mensaje "No stops scheduled for this day"
```

#### FR-ROUTE-002: Reordenar Paradas (Drag & Drop)
- **Descripción:** Admin puede cambiar orden de paradas arrastrando
- **Prioridad:** P1
- **Comportamiento:**
  - Drag item en lista cambia orden
  - Mapa actualiza ruta en tiempo real
  - ETAs se recalculan
- **Criterios de Aceptación:**
```gherkin
Given una ruta con paradas [A, B, C, D]
When admin arrastra C a la posición 1
Then el orden cambia a [C, A, B, D]
And el mapa muestra nueva ruta
And los tiempos estimados se actualizan
And se muestra toast "Route updated. [Undo]"
```

#### FR-ROUTE-003: Optimización Automática
- **Descripción:** Optimizar orden de paradas para minimizar tiempo de viaje
- **Prioridad:** P2
- **Implementación:** Google Routes API Optimization
- **Criterios de Aceptación:**
```gherkin
Given una ruta no optimizada de 50 millas
When admin hace click en "Optimize Route"
Then sistema calcula ruta óptima (puede tomar 2-5 segundos)
And muestra comparación "New route saves 12 miles (28 min)"
And admin puede [Apply] o [Keep Current]

Given API de Google falla
When intenta optimizar
Then muestra error "Optimization unavailable. Try again later."
And la ruta actual se mantiene
```

---

### Módulo: App Móvil Técnico

#### FR-TECH-001: Ver Ruta del Día
- **Descripción:** Técnico ve sus paradas asignadas para hoy
- **Prioridad:** P0
- **Incluye:** lista de paradas, progreso, siguiente parada, navegación
- **Criterios de Aceptación:**
```gherkin
Given Mike tiene 8 paradas hoy
When abre la app
Then ve "Today's Route" con 8 paradas ordenadas
And ve progreso "0/8 completed"
And la primera parada está destacada como "Next"

Given Mike completó 4 de 8 paradas
When ve su ruta
Then el progreso muestra "4/8 completed"
And la parada 5 está destacada como "Next"
```

#### FR-TECH-002: Iniciar Servicio
- **Descripción:** Técnico marca llegada a la propiedad
- **Prioridad:** P0
- **Comportamiento:**
  - Registra hora de llegada
  - Opcional: captura ubicación GPS
  - Muestra checklist y formulario de lecturas
- **Criterios de Aceptación:**
```gherkin
Given Mike está en la propiedad "123 Main St"
When hace tap en "Start Service"
Then se registra arrival_time con timestamp actual
And se muestra pantalla de servicio con checklist
And timer comienza a correr
```

#### FR-TECH-003: Registrar Lecturas Químicas
- **Descripción:** Técnico ingresa lecturas de químicos del agua
- **Prioridad:** P0
- **Campos:** pH, chlorine, alkalinity, CYA, salt, temperature
- **Validaciones:** rangos válidos por campo
- **Criterios de Aceptación:**
```gherkin
Given Mike está en pantalla de servicio
When ingresa pH = 7.4, Chlorine = 2.5
Then los campos muestran indicador verde (en rango)
And valores se guardan localmente

Given Mike ingresa pH = 8.5 (fuera de rango)
Then el campo muestra indicador rojo
And tooltip explica "pH should be 7.2-7.6"
And aún puede guardar el valor
```

#### FR-TECH-004: Tomar Fotos
- **Descripción:** Técnico puede tomar fotos durante el servicio
- **Prioridad:** P0
- **Comportamiento:**
  - Fotos comprimidas antes de guardar
  - Se suben en background cuando hay conexión
  - Límite: 10 fotos por visita
- **Criterios de Aceptación:**
```gherkin
Given Mike está en pantalla de servicio
When toma una foto
Then la foto se comprime a max 500KB
And se guarda localmente
And se muestra thumbnail en la visita
And comienza upload en background si hay conexión

Given ya hay 10 fotos en la visita
When intenta tomar otra
Then recibe mensaje "Maximum 10 photos per visit"
```

#### FR-TECH-005: Completar Servicio
- **Descripción:** Técnico marca el servicio como completado
- **Prioridad:** P0
- **Requisitos:** mínimo 50% del checklist completado
- **Comportamiento:**
  - Registra departure_time
  - Calcula duración
  - Envía datos al servidor (o cola offline)
- **Criterios de Aceptación:**
```gherkin
Given Mike completó checklist y lecturas
When hace tap en "Complete Service"
Then se muestra modal de confirmación con resumen
When confirma
Then se registra departure_time
And la visita cambia a status "completed"
And avanza a siguiente parada

Given menos de 50% del checklist está completado
When intenta completar servicio
Then recibe warning "Complete at least 4 of 8 checklist items"
And puede forzar completar con nota explicativa
```

#### FR-TECH-006: Modo Offline
- **Descripción:** App funciona sin conexión a internet
- **Prioridad:** P1
- **Datos disponibles offline:**
  - Ruta del día (cacheada al inicio)
  - Últimas 3 visitas por propiedad
  - Templates de checklist
- **Datos en cola offline:**
  - Visitas completadas
  - Fotos (hasta 50MB)
  - Lecturas
- **Criterios de Aceptación:**
```gherkin
Given Mike pierde conexión durante servicio
When completa el servicio
Then los datos se guardan en cola local
And ve indicador "Offline - 1 pending sync"
And puede continuar con siguiente parada

Given Mike recupera conexión
When hay datos en cola
Then automáticamente sincroniza en background
And ve indicador "Syncing..."
And luego "All synced ✓"

Given hay conflicto (datos cambiaron en servidor)
When sincroniza
Then se notifica a admin para revisión manual
And datos locales se mantienen hasta resolver
```

---

### Módulo: Facturación y Pagos

#### FR-INV-001: Generar Factura Manual
- **Descripción:** Admin crea factura para un cliente
- **Prioridad:** P0
- **Campos:** cliente, line items (descripción, cantidad, precio), due_date
- **Criterios de Aceptación:**
```gherkin
Given admin en pantalla de facturas
When crea factura para "John Smith" con:
  | item                    | qty | price  |
  | Monthly Service         | 1   | 150.00 |
  | Pump Repair            | 1   | 100.00 |
And establece due_date en 15 días
Then se crea factura INV-2026-XXXX
And total muestra $250.00
And status es "pending"
```

#### FR-INV-002: Generación Automática Mensual
- **Descripción:** Sistema genera facturas al inicio del mes
- **Prioridad:** P0
- **Reglas:**
  - Corre el día 1 de cada mes a las 6am
  - Agrupa servicios del mes anterior por cliente
  - Solo clientes con servicios completados
- **Criterios de Aceptación:**
```gherkin
Given John tiene 4 servicios completados en Enero ($150 c/u)
When sistema ejecuta generación el 1 de Febrero
Then se crea factura por $600 para John
And incluye detalle de las 4 visitas
And se envía email automáticamente

Given John ya tiene factura pendiente de Enero
When se genera Febrero
Then se crea NUEVA factura para Febrero
And la de Enero permanece pendiente
```

#### FR-INV-003: Cobrar con Tarjeta
- **Descripción:** Procesar pago con tarjeta de crédito/débito
- **Prioridad:** P0
- **Implementación:** Stripe Payment Intents
- **Criterios de Aceptación:**
```gherkin
Given factura pendiente de $150 para John
And John tiene tarjeta guardada ending in 4242
When admin hace click en "Charge Now"
Then se crea PaymentIntent en Stripe
And se procesa el cobro
And status cambia a "paid"
And se envía recibo por email

Given tarjeta es declinada
When intenta cobrar
Then muestra error "Card declined: Insufficient funds"
And status permanece "pending"
And se registra intento fallido en log
```

#### FR-INV-004: Cobrar con ACH
- **Descripción:** Procesar pago con transferencia bancaria (ACH)
- **Prioridad:** P1
- **Comportamiento:** ACH toma 3-5 días en confirmar
- **Criterios de Aceptación:**
```gherkin
Given factura pendiente y cliente con cuenta bancaria verificada
When admin cobra via ACH
Then status cambia a "processing"
And se muestra "Payment processing (3-5 business days)"

Given webhook de Stripe indica ACH exitoso
When sistema recibe webhook
Then status cambia a "paid"
And se envía recibo por email
```

#### FR-INV-005: AutoPay
- **Descripción:** Cobro automático en due date para clientes habilitados
- **Prioridad:** P1
- **Reglas:**
  - Requiere consentimiento explícito del cliente
  - Se ejecuta a las 9am del due date
  - Usa método de pago guardado
- **Criterios de Aceptación:**
```gherkin
Given John tiene AutoPay habilitado con tarjeta 4242
And factura con due_date hoy
When sistema ejecuta AutoPay a las 9am
Then se cobra $150 a la tarjeta
And status cambia a "paid"
And John recibe email "Payment processed: $150"

Given el cobro falla
When sistema ejecuta AutoPay
Then se agenda retry en 3 días
And John recibe email "Payment failed - we'll retry"
And admin recibe alerta
```

#### FR-INV-006: Reintentos de Pago
- **Descripción:** Lógica de reintentos para pagos fallidos
- **Prioridad:** P1
- **Política:**
  - 1er fallo: reintentar en 3 días
  - 2do fallo: reintentar en 3 días + SMS
  - 3er fallo: marcar overdue + deshabilitar AutoPay
- **Criterios de Aceptación:**
```gherkin
Given pago falló por primera vez
When pasan 3 días
Then sistema reintenta automáticamente
And envía email de notificación

Given tercer intento falla
When sistema procesa
Then factura se marca "overdue"
And AutoPay se deshabilita para este cliente
And admin recibe alerta "Autopay disabled for John Smith"
```

---

### Módulo: Integraciones

#### FR-INT-001: QuickBooks - Sync Clientes
- **Descripción:** Sincronizar clientes con QuickBooks Online
- **Prioridad:** P2
- **Dirección:** Bidireccional (PoolService → QB y QB → PoolService)
- **Frecuencia:** Push inmediato al crear, pull cada 6 horas
- **Criterios de Aceptación:**
```gherkin
Given conexión OAuth activa con QuickBooks
When admin crea cliente "John Smith"
Then se crea Customer en QuickBooks automáticamente
And se guarda qb_customer_id en PoolService

Given cliente actualizado en QuickBooks
When se ejecuta sync cada 6 horas
Then cambios se reflejan en PoolService
And se registra en audit log
```

#### FR-INT-002: QuickBooks - Sync Facturas
- **Descripción:** Enviar facturas a QuickBooks
- **Prioridad:** P2
- **Dirección:** PoolService → QB (push only)
- **Criterios de Aceptación:**
```gherkin
Given factura creada en PoolService
When estado cambia a "sent" o "paid"
Then se crea/actualiza Invoice en QuickBooks
And qb_invoice_id se guarda

Given pago registrado en PoolService
When se sincroniza
Then Payment se crea en QuickBooks asociado al Invoice
```

---

### Módulo: Reportes y Analytics

#### FR-REP-001: Dashboard KPIs
- **Descripción:** Métricas clave en dashboard principal
- **Prioridad:** P1
- **Métricas:**
  - Servicios hoy/semana/mes
  - Revenue mes actual vs anterior
  - Facturas pendientes/overdue
  - Clientes activos
- **Criterios de Aceptación:**
```gherkin
Given datos del mes actual
When admin ve dashboard
Then ve cards con:
  | Metric           | Value  |
  | Services Today   | 24     |
  | Revenue MTD      | $12,450|
  | Pending Invoices | 8      |
  | Active Customers | 156    |
And cada card muestra comparación con período anterior
```

#### FR-REP-002: Reporte de Revenue
- **Descripción:** Reporte detallado de ingresos
- **Prioridad:** P1
- **Filtros:** rango de fechas, cliente, técnico
- **Agrupaciones:** por día/semana/mes, por cliente, por servicio
- **Criterios de Aceptación:**
```gherkin
Given admin en pantalla de reportes
When selecciona "Revenue Report" para Enero 2026
Then ve breakdown por semana
And totales por categoría de servicio
And puede exportar a CSV o PDF
```

---

## 3.2 Requisitos No Funcionales

### NFR-001: Performance
| Métrica | Target |
|---------|--------|
| API response time (p95) | < 500ms |
| Page load time | < 3s |
| Mobile app startup | < 2s |
| Database queries | < 100ms promedio |
| Concurrent users | 500+ sin degradación |

### NFR-002: Availability
| Métrica | Target |
|---------|--------|
| Uptime | 99.5% mensual |
| Planned maintenance | < 4h/mes, notificado 48h antes |
| Recovery time (RTO) | < 1h |
| Data loss tolerance (RPO) | < 1h |

### NFR-003: Security
| Requisito | Implementación |
|-----------|----------------|
| Data encryption at rest | PostgreSQL encryption |
| Data encryption in transit | TLS 1.3 |
| Password storage | bcrypt, cost 12 |
| Session management | JWT 15min + refresh 7d |
| PCI compliance | SAQ-A (Stripe handles card data) |

### NFR-004: Scalability
| Escenario | Capacidad |
|-----------|-----------|
| MVP (6 meses) | 5,000 propiedades |
| Año 1 | 20,000 propiedades |
| Año 2 | 50,000 propiedades |

---

## 3.3 Contratos de API (Endpoints Principales)

### Autenticación

#### POST /api/auth/login
```json
// Request
{
  "email": "john@test.com",
  "password": "securepassword123"
}

// Response 200
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2...",
  "user": {
    "id": "uuid",
    "email": "john@test.com",
    "firstName": "John",
    "lastName": "Smith",
    "role": "admin",
    "companyId": "uuid",
    "companyName": "Pool Service Co"
  }
}

// Response 401
{
  "success": false,
  "error": "Invalid credentials"
}

// Response 429
{
  "success": false,
  "error": "Too many attempts. Try again in 15 minutes."
}
```

### Clientes

#### POST /api/customers
```json
// Request
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john@test.com",
  "phone": "5551234567",
  "billingAddress": {
    "street": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zip": "78701"
  },
  "notes": "Prefers morning appointments"
}

// Response 201
{
  "success": true,
  "customer": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@test.com",
    "phone": "5551234567",
    "billingAddress": {...},
    "notes": "Prefers morning appointments",
    "balance": 0,
    "autopayEnabled": false,
    "createdAt": "2026-01-20T10:30:00Z"
  }
}

// Response 400
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "email": "Email already in use"
  }
}
```

#### GET /api/customers
```json
// Query params: ?search=john&status=active&page=1&limit=20

// Response 200
{
  "success": true,
  "customers": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

### Propiedades

#### POST /api/properties
```json
// Request
{
  "customerId": "uuid",
  "address": "123 Main St",
  "city": "Austin",
  "state": "TX",
  "zip": "78701",
  "gateCode": "1234",
  "accessNotes": "Side gate, dog in backyard",
  "poolType": "inground",
  "poolSizeGallons": 15000,
  "equipment": {
    "pump": "Pentair IntelliFlo",
    "filter": "Cartridge",
    "heater": "Gas"
  }
}

// Response 201
{
  "success": true,
  "property": {
    "id": "uuid",
    "customerId": "uuid",
    "address": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zip": "78701",
    "lat": 30.2672,
    "lng": -97.7431,
    "gateCode": "****", // Masked unless authorized
    "poolType": "inground",
    "poolSizeGallons": 15000,
    "equipment": {...},
    "createdAt": "2026-01-20T10:30:00Z"
  }
}
```

### Trabajos Recurrentes

#### POST /api/jobs
```json
// Request
{
  "propertyId": "uuid",
  "serviceType": "weekly_maintenance",
  "frequency": "weekly",
  "dayOfWeek": 1, // Monday
  "technicianId": "uuid",
  "price": 150.00,
  "checklist": ["skim", "brush", "vacuum", "chemicals", "test_water"],
  "startDate": "2026-01-20"
}

// Response 201
{
  "success": true,
  "job": {
    "id": "uuid",
    "propertyId": "uuid",
    "serviceType": "weekly_maintenance",
    "frequency": "weekly",
    "dayOfWeek": 1,
    "technicianId": "uuid",
    "price": 150.00,
    "nextService": "2026-01-20",
    "isActive": true,
    "createdAt": "2026-01-15T10:30:00Z"
  },
  "visitsGenerated": 8
}
```

### Rutas

#### GET /api/routes/:date
```json
// Query params: ?technicianId=uuid

// Response 200
{
  "success": true,
  "route": {
    "id": "uuid",
    "date": "2026-01-20",
    "technicianId": "uuid",
    "technicianName": "Mike Smith",
    "status": "in_progress",
    "stops": [
      {
        "id": "uuid",
        "sequenceOrder": 1,
        "propertyId": "uuid",
        "address": "123 Main St, Austin TX",
        "customerName": "John Smith",
        "estimatedArrival": "08:00",
        "estimatedDuration": 45,
        "status": "completed",
        "visitId": "uuid"
      },
      {
        "id": "uuid",
        "sequenceOrder": 2,
        "propertyId": "uuid",
        "address": "456 Oak Ave, Austin TX",
        "customerName": "Mary Johnson",
        "estimatedArrival": "09:00",
        "estimatedDuration": 30,
        "status": "pending",
        "visitId": "uuid"
      }
    ],
    "totalStops": 8,
    "completedStops": 1,
    "totalMiles": 42,
    "estimatedHours": 5.5
  }
}
```

#### PUT /api/routes/:id/reorder
```json
// Request
{
  "stopOrder": ["stop-uuid-3", "stop-uuid-1", "stop-uuid-2", "stop-uuid-4"]
}

// Response 200
{
  "success": true,
  "route": {
    "id": "uuid",
    "stops": [...], // Updated order
    "totalMiles": 38, // Recalculated
    "estimatedHours": 5.2
  }
}
```

### Visitas

#### PUT /api/visits/:id/complete
```json
// Request
{
  "arrivalTime": "2026-01-20T08:05:00Z",
  "departureTime": "2026-01-20T08:47:00Z",
  "checklist": {
    "skim": true,
    "brush": true,
    "vacuum": true,
    "empty_baskets": true,
    "check_pump": true,
    "add_chemicals": true,
    "test_water": true,
    "backwash": false
  },
  "readings": {
    "ph": 7.4,
    "chlorine": 2.5,
    "alkalinity": 95,
    "cya": 45,
    "salt": 3200,
    "temperature": 78
  },
  "notes": "Added 2lbs shock, filter pressure normal",
  "photos": ["base64...", "base64..."] // Or pre-uploaded URLs
}

// Response 200
{
  "success": true,
  "visit": {
    "id": "uuid",
    "status": "completed",
    "duration": 42, // minutes
    "checklist": {...},
    "readings": {...},
    "photos": ["https://s3.../photo1.jpg", "..."],
    "completedAt": "2026-01-20T08:47:00Z"
  },
  "nextStop": {
    "id": "uuid",
    "address": "456 Oak Ave",
    "estimatedArrival": "09:00"
  }
}
```

### Facturas

#### POST /api/invoices
```json
// Request
{
  "customerId": "uuid",
  "items": [
    {
      "description": "Monthly Pool Service - January",
      "quantity": 1,
      "unitPrice": 150.00
    },
    {
      "description": "Pump Repair - Labor",
      "quantity": 2,
      "unitPrice": 50.00
    }
  ],
  "dueDate": "2026-02-01",
  "notes": "Thank you for your business!"
}

// Response 201
{
  "success": true,
  "invoice": {
    "id": "uuid",
    "invoiceNumber": "INV-2026-0045",
    "customerId": "uuid",
    "customerName": "John Smith",
    "items": [...],
    "subtotal": 250.00,
    "tax": 0,
    "total": 250.00,
    "status": "draft",
    "dueDate": "2026-02-01",
    "createdAt": "2026-01-20T10:30:00Z"
  }
}
```

#### POST /api/invoices/:id/charge
```json
// Request
{
  "paymentMethodId": "pm_xxx" // Stripe payment method
}

// Response 200
{
  "success": true,
  "payment": {
    "id": "uuid",
    "invoiceId": "uuid",
    "amount": 250.00,
    "status": "succeeded",
    "method": "card",
    "last4": "4242",
    "processedAt": "2026-01-20T10:35:00Z"
  },
  "invoice": {
    "id": "uuid",
    "status": "paid",
    "paidAt": "2026-01-20T10:35:00Z"
  }
}

// Response 402 (Payment Failed)
{
  "success": false,
  "error": "Payment failed",
  "details": {
    "code": "card_declined",
    "message": "Your card was declined.",
    "declineCode": "insufficient_funds"
  }
}
```

### Webhooks

#### POST /api/webhooks/stripe
```json
// Stripe sends (payment_intent.succeeded)
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_xxx",
      "amount": 25000,
      "metadata": {
        "invoice_id": "uuid"
      }
    }
  }
}

// Our processing:
// 1. Verify webhook signature
// 2. Find invoice by metadata.invoice_id
// 3. Update invoice status to "paid"
// 4. Create payment record
// 5. Send receipt email
// 6. Return 200 OK
```

---

# PARTE 4: PLAN DE SPRINTS Y ESTIMACIÓN DE COSTOS

## 4.1 Equipo Propuesto

| Rol | Cantidad | Dedicación | Rango Salarial/mes |
|-----|----------|------------|---------------------|
| Product Manager | 1 | 100% | $7,000 - $12,000 |
| UI/UX Designer | 1 | 100% | $5,000 - $9,000 |
| Backend Developer (Senior) | 1 | 100% | $9,000 - $15,000 |
| Backend Developer (Mid) | 1 | 100% | $6,000 - $9,000 |
| Frontend Developer (Mid) | 1 | 100% | $6,000 - $9,000 |
| Mobile Developer (Mid-Senior) | 1 | 100% | $7,000 - $12,000 |
| QA Engineer | 1 | 100% | $5,000 - $8,000 |
| **TOTAL (7 personas)** | 7 | - | **$45,000 - $74,000/mes** |

## 4.2 Cronograma de Sprints (6 meses = 12 sprints)

### Fase 1: Foundation (Sprints 1-3)

#### Sprint 1: Setup & Auth
**Duración:** 2 semanas
**Objetivo:** Infraestructura base y autenticación

| Entregable | Responsable | Dependencias |
|------------|-------------|--------------|
| Setup repositorio monorepo | Backend Sr | - |
| CI/CD pipeline básico (GitHub Actions) | Backend Sr | Repo |
| Base de datos PostgreSQL + migrations iniciales | Backend Sr | Repo |
| API boilerplate (Express + Prisma) | Backend Sr | DB |
| Auth: login/logout/refresh token | Backend Mid | API |
| Frontend boilerplate (Next.js + Tailwind) | Frontend | - |
| UI: Login page | Frontend + Designer | Design |
| Design system inicial (colores, tipografía, componentes base) | Designer | - |

**Hito:** Usuarios pueden hacer login en web app

---

#### Sprint 2: Customers & Properties
**Duración:** 2 semanas
**Objetivo:** CRUD de clientes y propiedades

| Entregable | Responsable | Dependencias |
|------------|-------------|--------------|
| API: CRUD Customers | Backend Mid | Auth |
| API: CRUD Properties + geocoding | Backend Sr | Customers |
| UI: Lista de clientes + búsqueda | Frontend | API |
| UI: Formulario crear/editar cliente | Frontend | API |
| UI: Detalle de cliente con propiedades | Frontend | API |
| UI: Formulario de propiedad | Frontend | API |
| Diseño: Pantallas de clientes/propiedades | Designer | - |
| QA: Test cases clientes | QA | - |

**Hito:** Admin puede crear clientes y propiedades

---

#### Sprint 3: Jobs & Scheduling
**Duración:** 2 semanas
**Objetivo:** Trabajos recurrentes y generación de visitas

| Entregable | Responsable | Dependencias |
|------------|-------------|--------------|
| API: CRUD Jobs (recurring) | Backend Sr | Properties |
| API: Visit generation logic | Backend Sr | Jobs |
| API: Cron job para generar visitas | Backend Sr | Visits |
| DB: Tablas visits, route_stops | Backend Mid | - |
| UI: Calendario básico (vista semana) | Frontend | API |
| UI: Crear trabajo recurrente | Frontend | API |
| UI: Vista de visitas por día | Frontend | API |
| Diseño: Calendario y scheduling | Designer | - |
| QA: Test recurrencia | QA | API |

**Hito:** Admin puede programar servicios recurrentes

---

### Fase 2: Mobile Core (Sprints 4-6)

#### Sprint 4: Mobile App Foundation
**Duración:** 2 semanas
**Objetivo:** App móvil básica con ruta del día

| Entregable | Responsable | Dependencias |
|------------|-------------|--------------|
| Mobile: Setup Expo + React Native | Mobile | - |
| Mobile: Auth flow (login) | Mobile | API Auth |
| Mobile: Home screen (Today's Route) | Mobile | API Routes |
| API: GET /routes/:date (optimizado para mobile) | Backend Mid | Routes |
| Mobile: Lista de paradas | Mobile | API |
| Mobile: Navegación a Maps app | Mobile | - |
| UI/UX: Diseño mobile completo | Designer | - |
| QA: Test en iOS/Android | QA | App |

**Hito:** Técnico puede ver su ruta del día en el móvil

---

#### Sprint 5: Service Completion
**Duración:** 2 semanas
**Objetivo:** Técnico puede completar servicios

| Entregable | Responsable | Dependencias |
|------------|-------------|--------------|
| Mobile: Pantalla de servicio (checklist) | Mobile | Route |
| Mobile: Formulario de lecturas | Mobile | Service |
| Mobile: Captura de fotos | Mobile | Service |
| Mobile: Completar servicio | Mobile | API |
| API: PUT /visits/:id/complete | Backend Mid | Visits |
| API: Upload fotos a S3 | Backend Sr | S3 setup |
| UI Web: Ver visitas completadas | Frontend | API |
| QA: Test flujo completo mobile | QA | App |

**Hito:** Técnico puede completar servicio con lecturas y fotos

---

#### Sprint 6: Routes & Map View
**Duración:** 2 semanas
**Objetivo:** Vista de rutas con mapa y reordenamiento

| Entregable | Responsable | Dependencias |
|------------|-------------|--------------|
| API: Route optimization (Google Routes) | Backend Sr | Maps API |
| UI: Mapa con ruta y marcadores | Frontend | Maps JS |
| UI: Drag & drop reordenar paradas | Frontend | API |
| API: PUT /routes/:id/reorder | Backend Mid | Routes |
| Mobile: Mapa en app | Mobile | Maps SDK |
| UI: Recálculo de ETAs en tiempo real | Frontend | API |
| QA: Test reordenamiento | QA | UI |

**Hito:** Admin puede ver y reordenar rutas en mapa

---

### Fase 3: Billing (Sprints 7-8)

#### Sprint 7: Invoicing
**Duración:** 2 semanas
**Objetivo:** Sistema de facturación

| Entregable | Responsable | Dependencias |
|------------|-------------|--------------|
| API: CRUD Invoices | Backend Sr | Customers |
| API: Invoice generation (monthly auto) | Backend Sr | Jobs, Visits |
| API: PDF generation | Backend Mid | Invoices |
| UI: Lista de facturas | Frontend | API |
| UI: Crear/editar factura | Frontend | API |
| UI: Vista de factura + PDF | Frontend | API |
| Email: Template de factura | Designer | - |
| QA: Test generación automática | QA | API |

**Hito:** Sistema genera facturas automáticamente

---

#### Sprint 8: Payments & AutoPay
**Duración:** 2 semanas
**Objetivo:** Procesamiento de pagos con Stripe

| Entregable | Responsable | Dependencias |
|------------|-------------|--------------|
| Stripe: Integración Payment Intents | Backend Sr | Stripe account |
| Stripe: Customer + Payment Methods | Backend Sr | Stripe |
| API: POST /invoices/:id/charge | Backend Sr | Stripe |
| API: Webhooks (payment success/fail) | Backend Sr | Stripe |
| UI: Agregar método de pago | Frontend | Stripe.js |
| UI: Cobrar factura | Frontend | API |
| AutoPay: Consentimiento + scheduled charges | Backend Sr | Stripe |
| Retry logic para pagos fallidos | Backend Sr | Payments |
| QA: Test pagos (sandbox) | QA | Stripe test |

**Hito:** Admin puede cobrar facturas con tarjeta y ACH

---

### Fase 4: Offline & Client Portal (Sprints 9-10)

#### Sprint 9: Offline Mode
**Duración:** 2 semanas
**Objetivo:** App móvil funciona sin conexión

| Entregable | Responsable | Dependencias |
|------------|-------------|--------------|
| Mobile: WatermelonDB setup | Mobile | - |
| Mobile: Cache de ruta del día | Mobile | DB local |
| Mobile: Cola de sync offline | Mobile | DB local |
| Mobile: UI indicadores offline | Mobile | Sync |
| API: Endpoints de sync con timestamps | Backend Mid | - |
| Conflict resolution logic | Backend Sr + Mobile | Sync |
| QA: Test escenarios offline | QA | App |

**Hito:** Técnico puede completar servicios sin internet

---

#### Sprint 10: Client Portal
**Duración:** 2 semanas
**Objetivo:** Portal para clientes finales

| Entregable | Responsable | Dependencias |
|------------|-------------|--------------|
| Portal: Auth (magic link) | Backend Mid | Email |
| Portal: Dashboard cliente | Frontend | API |
| Portal: Historial de servicios | Frontend | API |
| Portal: Ver facturas | Frontend | API |
| Portal: Pagar factura | Frontend | Stripe |
| Portal: Habilitar AutoPay | Frontend | Stripe |
| Portal: Configuración (payment methods) | Frontend | API |
| Diseño: Portal cliente | Designer | - |
| QA: Test portal completo | QA | Portal |

**Hito:** Clientes pueden ver servicios y pagar online

---

### Fase 5: Integrations & Polish (Sprints 11-12)

#### Sprint 11: QuickBooks & Reports
**Duración:** 2 semanas
**Objetivo:** Integración QuickBooks y reportes

| Entregable | Responsable | Dependencias |
|------------|-------------|--------------|
| QuickBooks: OAuth flow | Backend Sr | QB app |
| QuickBooks: Sync customers | Backend Sr | QB API |
| QuickBooks: Sync invoices | Backend Sr | QB API |
| QuickBooks: Sync payments | Backend Sr | QB API |
| UI: QuickBooks connection settings | Frontend | API |
| Reports: Revenue report | Backend Mid + Frontend | - |
| Reports: Service report | Backend Mid + Frontend | - |
| Reports: Export CSV/PDF | Backend Mid | - |
| QA: Test sync QB | QA | QB sandbox |

**Hito:** Datos sincronizan con QuickBooks

---

#### Sprint 12: Polish & Launch Prep
**Duración:** 2 semanas
**Objetivo:** Pulir, bugs, preparar lanzamiento

| Entregable | Responsable | Dependencias |
|------------|-------------|--------------|
| Bug fixes de todo el sistema | Todo el equipo | Bug list |
| Performance optimization | Backend Sr | - |
| Mobile: Submit a App Store/Play Store | Mobile | App complete |
| Documentación API (Swagger) | Backend Mid | - |
| Onboarding flow para nuevos usuarios | Frontend + Designer | - |
| Monitoring setup (Sentry, UptimeRobot) | Backend Sr | - |
| Security audit básico | Backend Sr | - |
| QA: Regression testing completo | QA | All features |
| PM: User acceptance testing | PM | All |

**Hito:** MVP listo para beta launch

---

## 4.3 Diagrama de Dependencias

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DEPENDENCY TIMELINE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Sprint:  1    2    3    4    5    6    7    8    9    10   11   12          │
│          │    │    │    │    │    │    │    │    │    │    │    │           │
│ AUTH ────┼────┤                                                              │
│          │    │                                                              │
│ CUSTOMERS────┼────┤                                                          │
│               │    │                                                          │
│ PROPERTIES────┼────┤                                                          │
│               │    │                                                          │
│ JOBS ─────────┼────┼────┤                                                     │
│               │    │    │                                                     │
│ VISITS ───────┼────┼────┤                                                     │
│                    │    │                                                     │
│ MOBILE APP ────────┼────┼────┼────┼────┤                                     │
│                    │    │    │    │    │                                     │
│ ROUTES ────────────┼────┼────┼────┤    │                                     │
│                              │    │    │                                     │
│ INVOICES ────────────────────┼────┤    │                                     │
│                              │    │    │                                     │
│ PAYMENTS ────────────────────┼────┼────┤                                     │
│                                   │    │                                     │
│ OFFLINE ──────────────────────────┼────┼────┤                                │
│                                        │    │                                │
│ CLIENT PORTAL ─────────────────────────┼────┤                                │
│                                             │                                │
│ QUICKBOOKS ─────────────────────────────────┼────┤                           │
│                                                  │                           │
│ REPORTS ────────────────────────────────────┼────┤                           │
│                                                  │                           │
│ POLISH ─────────────────────────────────────────┼────┤                       │
│                                                       │                       │
└─────────────────────────────────────────────────────────────────────────────┘

CRITICAL PATH: Auth → Customers → Jobs → Visits → Mobile → Payments
```

---

## 4.4 Estimación de Costos de Desarrollo

### Costo de Salarios (6 meses)

| Rol | Bajo/mes | Alto/mes | 6 meses (bajo) | 6 meses (alto) |
|-----|----------|----------|----------------|----------------|
| Product Manager | $7,000 | $12,000 | $42,000 | $72,000 |
| Designer | $5,000 | $9,000 | $30,000 | $54,000 |
| Backend Sr | $9,000 | $15,000 | $54,000 | $90,000 |
| Backend Mid | $6,000 | $9,000 | $36,000 | $54,000 |
| Frontend | $6,000 | $9,000 | $36,000 | $54,000 |
| Mobile | $7,000 | $12,000 | $42,000 | $72,000 |
| QA | $5,000 | $8,000 | $30,000 | $48,000 |
| **SUBTOTAL** | - | - | **$270,000** | **$444,000** |
| Buffer 20% | - | - | $54,000 | $88,800 |
| **TOTAL DESARROLLO** | - | - | **$324,000** | **$532,800** |

### Otros Costos de Desarrollo

| Concepto | Estimado |
|----------|----------|
| Licencias software (Figma, etc) | $2,000 |
| Cuentas de desarrollo (Apple, Google) | $200 |
| Servicios terceros (sandbox/dev) | $500 |
| Hardware/equipos (si necesario) | Variable |
| **TOTAL OTROS** | **~$2,700** |

### Resumen Costo Desarrollo MVP

| Escenario | Total |
|-----------|-------|
| **Mínimo** | $326,700 |
| **Máximo** | $535,500 |
| **Promedio estimado** | **~$430,000** |

---

## 4.5 Costos Operativos (Primer Año)

### Infraestructura (mensual, para 5k propiedades)

| Servicio | Mes 1-6 (bajo volumen) | Mes 7-12 (crecimiento) |
|----------|------------------------|------------------------|
| Railway (Backend) | $50 | $100 |
| Railway (Frontend) | $20 | $40 |
| PostgreSQL (managed) | $25 | $50 |
| Redis | $15 | $25 |
| S3 Storage | $10 | $30 |
| **Subtotal Infra** | **$120/mes** | **$245/mes** |

### Servicios Externos (mensual)

| Servicio | Mes 1-6 | Mes 7-12 |
|----------|---------|----------|
| Twilio SMS | $100 | $300 |
| SendGrid Email | $0 (free tier) | $30 |
| Google Maps APIs | $100 | $400 |
| Sentry | $26 | $26 |
| Domain + SSL | $15 | $15 |
| **Subtotal Servicios** | **$241/mes** | **$771/mes** |

### Fees Variables

| Concepto | Cálculo |
|----------|---------|
| Stripe fees | 2.9% + $0.30 por transacción |
| Si revenue $50k/mes | ~$1,500/mes en fees |
| Si revenue $100k/mes | ~$3,000/mes en fees |

### Resumen Costos Operativos Año 1

| Período | Mensual | Acumulado |
|---------|---------|-----------|
| Meses 1-6 (bajo) | ~$361 | $2,166 |
| Meses 7-12 (crecimiento) | ~$1,016 | $6,096 |
| **TOTAL AÑO 1 (sin Stripe fees)** | - | **~$8,262** |
| **TOTAL AÑO 1 (con fees estimados)** | - | **~$30,000 - $50,000** |

---

## 4.6 Riesgos que Pueden Aumentar Costos

| Riesgo | Probabilidad | Impacto en Costo | Mitigación |
|--------|--------------|------------------|------------|
| Offline sync más complejo de lo esperado | Media | +$20-40k | Comenzar simple, iterar |
| Stripe integration edge cases | Baja | +$10-15k | Testing exhaustivo en sandbox |
| App store rejection (Apple) | Baja | +1-2 semanas, $5-10k | Seguir guidelines al pie |
| Cambios de scope | Alta | +20-30% | Scope freeze después de Sprint 3 |
| Rotación de personal | Media | +$15-30k | Documentación, knowledge sharing |
| Problemas de performance | Baja | +$10k | Monitoring temprano, optimizar |

---

## 4.7 Recomendaciones para Reducir Costo 50%

Si el presupuesto es ~$200-250k en lugar de ~$400k:

### Opción A: Equipo Reducido
- Eliminar 1 backend developer (usar solo senior)
- Diseñador freelance part-time en lugar de full-time
- QA compartido o outsourced
- **Ahorro:** ~40% en salarios

### Opción B: Scope Reducido (MVP Más Lean)

**Quitar del MVP (posponer a v1.1):**
1. ❌ QuickBooks integration → Manual export CSV
2. ❌ Offline mode avanzado → Solo cache read, no writes offline
3. ❌ Route optimization automática → Solo reorder manual
4. ❌ Client portal completo → Solo vista de facturas (no pago online)
5. ❌ Multiple payment methods → Solo tarjeta (no ACH)
6. ❌ Reportes avanzados → Solo dashboard básico

**Mantener en MVP:**
1. ✅ Auth + roles básicos
2. ✅ Clientes + propiedades
3. ✅ Jobs recurrentes + calendario
4. ✅ Mobile app básica (ruta + completar servicio)
5. ✅ Facturación manual + cobro con tarjeta
6. ✅ Notificaciones email básicas

**Resultado:** MVP en 4 meses con equipo de 5 personas
**Costo estimado:** $180,000 - $220,000

### Opción C: Híbrido
- Equipo core de 4-5 personas
- Scope reducido (opción B)
- Usar más servicios managed/no-code donde sea posible
- **Costo estimado:** $150,000 - $200,000

---

## 4.8 Timeline Visual (12 Sprints)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MVP TIMELINE (6 MONTHS)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ MES 1         MES 2         MES 3         MES 4         MES 5         MES 6 │
│ ├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤     │
│ │  S1  │  S2  │  S3  │  S4  │  S5  │  S6  │  S7  │  S8  │  S9  │ S10 │S11│S12│
│ │      │      │      │      │      │      │      │      │      │     │   │   │
│ │ AUTH │CUSTOM│ JOBS │MOBILE│SERV. │ROUTES│INVOIC│PAYMNT│OFFLN │PORTL│ QB│POL│
│ │      │ +PROP│SCHED │ CORE │COMPL │ +MAP │      │      │      │     │RPT│ISH│
│ │      │      │      │      │      │      │      │      │      │     │   │   │
│ ├──────┴──────┴──────┼──────┴──────┴──────┼──────┴──────┼──────┴─────┴───┴───┤
│ │    FOUNDATION      │    MOBILE CORE     │   BILLING   │ POLISH & LAUNCH   │
│ │    (6 weeks)       │    (6 weeks)       │  (4 weeks)  │    (8 weeks)      │
│ └────────────────────┴────────────────────┴─────────────┴───────────────────┘
│                                                                              │
│ HITOS:                                                                       │
│ ★ Semana 6: Admin puede crear clientes, propiedades, programar servicios   │
│ ★ Semana 10: Técnico puede completar servicios en mobile                    │
│ ★ Semana 14: Sistema de facturación y pagos funcionando                     │
│ ★ Semana 20: Cliente puede ver servicios y pagar online                     │
│ ★ Semana 24: MVP listo para beta launch                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4.9 Checklist Pre-Launch

### Técnico
- [ ] Todas las features MVP funcionando
- [ ] Tests unitarios >70% cobertura
- [ ] Tests e2e para flujos críticos
- [ ] Performance testing completado
- [ ] Security audit básico pasado
- [ ] Backup y recovery probados
- [ ] Monitoring y alertas configurados

### Legal/Compliance
- [ ] Terms of Service redactados
- [ ] Privacy Policy redactada
- [ ] PCI compliance (SAQ-A) completado
- [ ] Acuerdo de procesamiento de datos (Stripe)

### Operacional
- [ ] Proceso de soporte definido
- [ ] Documentación de usuario básica
- [ ] Plan de onboarding para primeros clientes
- [ ] Métricas de éxito definidas

### Go-to-Market
- [ ] Pricing definido
- [ ] Landing page lista
- [ ] 5-10 beta customers comprometidos
- [ ] Plan de feedback loop con betas

---

# ANEXO: Resumen Ejecutivo

## Costos Totales Estimados

| Concepto | Mínimo | Máximo | Promedio |
|----------|--------|--------|----------|
| Desarrollo MVP (6 meses) | $326,700 | $535,500 | $430,000 |
| Operación Año 1 | $30,000 | $50,000 | $40,000 |
| **TOTAL HASTA LANZAMIENTO + AÑO 1** | **$356,700** | **$585,500** | **$470,000** |

## Métricas Clave

| Métrica | Target MVP | Target Año 1 |
|---------|------------|--------------|
| Propiedades | 1,000 | 5,000 |
| Empresas clientes | 10 | 50 |
| MRR | $5,000 | $25,000+ |
| Técnicos activos | 30 | 150 |

## Próximos Pasos

1. **Semana 1-2:** Validar scope con stakeholders
2. **Semana 2-3:** Contratar/asignar equipo
3. **Semana 3-4:** Setup de infraestructura y tooling
4. **Semana 4+:** Comenzar Sprint 1

---

*Documento generado: Febrero 2026*
*Versión: 1.0*
