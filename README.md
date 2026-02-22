# Aguadulce Track

Sistema SaaS para gestión de empresas de mantenimiento de piscinas.

## Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm o yarn

## Instalación Rápida

### Windows

1. Ejecuta el script de configuración:
```batch
scripts\setup.bat
```

2. Configura la base de datos en `backend\.env`

3. Inicializa la base de datos:
```batch
scripts\init-database.bat
```

4. Inicia el servidor de desarrollo:
```batch
scripts\start-dev.bat
```

### Manual

1. Instala dependencias:
```bash
npm run install:all
```

2. Configura las variables de entorno:
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.local.example frontend/.env.local
```

3. Inicializa la base de datos:
```bash
npm run db:init
```

4. Inicia el servidor de desarrollo:
```bash
npm run dev
```

## URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## Credenciales Demo

- **Admin**: admin@demo.com / Admin123!
- **Técnico**: tecnico@demo.com / Tech123!

## Estructura del Proyecto

```
aguadulce-track/
├── backend/                 # API Express.js
│   ├── src/
│   │   ├── config/         # Configuración
│   │   ├── middleware/     # Middlewares
│   │   ├── routes/         # Rutas API
│   │   └── app.js          # Entrada principal
│   └── scripts/            # Scripts de BD
├── frontend/               # Next.js App
│   ├── src/
│   │   ├── app/           # Páginas (App Router)
│   │   ├── components/    # Componentes React
│   │   ├── contexts/      # Contextos React
│   │   └── lib/           # Utilidades
├── database/              # SQL de inicialización
├── scripts/               # Scripts de ayuda
└── docker-compose.yml     # Docker Compose
```

## Funcionalidades

### Admin Dashboard
- Vista general de métricas
- Gestión de clientes y piscinas
- Control de inventario
- Programación de servicios
- Reportes y analíticas
- Sistema de alertas

### App Técnico (Mobile)
- Lista de servicios del día
- Checklist de servicio
- Registro de lecturas de agua
- Uso de químicos
- Captura de fotos
- Firma del cliente
- Geolocalización

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de empresa
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/refresh` - Refrescar token
- `GET /api/auth/me` - Usuario actual

### Clientes
- `GET /api/clients` - Listar clientes
- `POST /api/clients` - Crear cliente
- `PUT /api/clients/:id` - Actualizar cliente
- `DELETE /api/clients/:id` - Eliminar cliente

### Piscinas
- `GET /api/pools` - Listar piscinas
- `GET /api/pools/today` - Piscinas del día
- `POST /api/pools` - Crear piscina
- `PUT /api/pools/:id` - Actualizar piscina

### Servicios
- `GET /api/services` - Listar servicios
- `POST /api/services/:id/start` - Iniciar servicio
- `POST /api/services/:id/complete` - Completar servicio

### Inventario
- `GET /api/inventory` - Ver inventario
- `POST /api/inventory/:id/add` - Agregar stock

### Reportes
- `GET /api/reports/services` - Reporte de servicios
- `GET /api/reports/services/pdf` - Exportar PDF
- `GET /api/reports/services/excel` - Exportar Excel

## Docker

Para ejecutar con Docker:

```bash
docker-compose up -d
```

## Licencia

Propietario. Todos los derechos reservados.
