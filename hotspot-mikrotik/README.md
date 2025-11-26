🌐 Hotspot MikroTik v7 - Sistema Completo
Sistema profesional de hotspot WiFi con autenticación social (Google/Apple), integración con MercadoPago Argentina y panel administrativo avanzado.

✨ Características Principales
🔐 Autenticación Social
Google OAuth 2.0 - Login con cuentas de Google

Apple Sign In - Autenticación con Apple ID

Sesiones seguras con JWT y Passport.js

💳 Sistema de Pagos
MercadoPago Argentina - Pagos seguros y automáticos

Múltiples planes - Configurables desde el panel admin

Notificaciones automáticas - Webhooks para confirmación de pagos

📡 Integración MikroTik
RouterOS v7 - Compatibilidad total

Múltiples hotspots - Gestión centralizada

Sincronización en tiempo real - Estado de usuarios y conexiones

API segura - Comunicación encriptada

📊 Panel Administrativo
Dashboard en tiempo real - Estadísticas de ingresos y uso

Gestión de hotspots - Agregar, editar y monitorear

Reportes avanzados - Por día, semana, mes y períodos personalizados

Exportación de datos - JSON, CSV para análisis

🔒 Seguridad
HTTPS obligatorio - Certificado SSL automático

Rate limiting - Protección contra abuso

Validación de datos - Sanitización de entradas

CORS configurado - Orígenes controlados

🚀 Instalación Rápida
Prerrequisitos
Node.js 16+

MongoDB Atlas o local

Cuenta MercadoPago Argentina

Credenciales OAuth de Google/Apple

1. Clonar y Configurar
bash
# Clonar el proyecto
git clone <repository-url>
cd hotspot-mikrotik

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
2. Configurar Variables de Entorno (.env)
env
# Configuración General
NODE_ENV=production
PORT=3000
BASE_URL=https://tudominio.com
CLIENT_URL=https://tudominio.com
JWT_SECRET=tu_jwt_secret_super_seguro_32_caracteres_minimo
SESSION_SECRET=tu_session_secret_super_seguro

# Base de Datos MongoDB
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/hotspot

# Panel Administrativo
ADMIN_EMAIL=admin@tudominio.com
ADMIN_PASSWORD=password_seguro_admin
ADMIN_COOKIE_SECRET=tu_cookie_secret_admin

# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# Apple OAuth (Opcional)
APPLE_CLIENT_ID=tu_apple_service_id
APPLE_TEAM_ID=tu_apple_team_id
APPLE_KEY_ID=tu_apple_key_id
APPLE_PRIVATE_KEY=tu_apple_private_key

# MercadoPago Argentina
MP_ACCESS_TOKEN=TEST-123456789012345-012345-abc123def456
MP_INTEGRATOR_ID=OP123456789
3. Configuración Inicial
bash
# Ejecutar setup inicial (crea planes y datos de ejemplo)
npm run setup

# Iniciar servidor en desarrollo
npm run dev

# Iniciar en producción
npm start
📋 Configuración de Servicios
🔐 Google OAuth
Ve a Google Cloud Console

Crea un nuevo proyecto o selecciona uno existente

Ve a "APIs y Servicios" > "Credenciales"

Crea credenciales OAuth 2.0 para aplicación web

Agrega URLs de autorización:

https://tudominio.com/auth/google/callback

🍎 Apple Sign In (Opcional)
Ve a Apple Developer

Crea un Identificador de Servicios

Configura las URLs de retorno

Genera y descarga la clave privada

💳 MercadoPago Argentina
Regístrate en MercadoPago Developers

Crea una aplicación y obtén las credenciales

Configura las URLs de notificación:

https://tudominio.com/api/payments/notification

Configura las URLs de retorno en preferencias

📡 Configuración MikroTik
1. Habilitar API en MikroTik
bash
# Conectarse al RouterOS
/system package update install
/ip service enable api-ssl
/user add name=hotspotapi password=claveSegura123 group=full
2. Configurar Hotspot
bash
# Configuración básica de hotspot
/ip hotspot setup
# Seleccionar interfaz, pool de IPs, etc.

# Perfil de usuario por defecto
/ip hotspot user profile add name=default rate-limit=10M/10M

# Agregar servidor en el panel admin con:
# IP: 192.168.88.1
# Usuario: hotspotapi  
# Password: claveSegura123
# Puerto: 8729 (SSL recomendado)
🏗️ Estructura del Proyecto
text
hotspot-mikrotik/
├── src/
│   ├── config/          # Configuraciones
│   ├── models/          # Modelos de MongoDB
│   ├── routes/          # Rutas de la API
│   ├── controllers/     # Lógica de negocio
│   ├── middleware/      # Middlewares personalizados
│   ├── utils/           # Utilidades y servicios
│   └── public/          # Frontend estático
├── admin/               # Panel administrativo
├── scripts/             # Scripts de deployment
└── config/              # Archivos de configuración
🎯 Uso del Sistema
Para Usuarios Finales
Conectarse al WiFi → Redirige al portal cautivo

Iniciar sesión → Con Google o Apple

Seleccionar plan → Ver planes disponibles

Pagar con MercadoPago → Proceso seguro

Obtener acceso → Credenciales automáticas

Para Administradores
Acceder al panel → /admin con credenciales

Gestionar hotspots → Agregar/editar routers

Ver estadísticas → Dashboard en tiempo real

Configurar planes → Precios y características

Exportar reportes → Datos para análisis

📊 API Endpoints Principales
Autenticación
GET /auth/google - Iniciar con Google

GET /auth/apple - Iniciar con Apple

GET /auth/logout - Cerrar sesión

Pagos
POST /api/payments/create - Crear preferencia de pago

POST /api/payments/notification - Webhook MercadoPago

GET /api/payments/status/:id - Estado de pago

Hotspot
GET /api/mikrotik/hotspots - Listar hotspots disponibles

POST /api/mikrotik/connect - Conectar usuario

GET /api/mikrotik/status/:id - Estado del hotspot

Admin
GET /api/admin/stats - Estadísticas del dashboard

POST /api/admin/reports - Reportes personalizados

POST /api/admin/hotspots/sync-all - Sincronizar todos

🚀 Deployment
Opción 1: Render.com (Recomendado)
Conectar repositorio GitHub

Configurar variables de entorno

Deploy automático

Opción 2: Vercel
bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
Opción 3: Servidor Propio
bash
# Configurar SSL con Let's Encrypt
certbot --nginx -d tudominio.com

# Configurar reverse proxy Nginx
# Archivo: /etc/nginx/sites-available/tudominio.com
🔧 Comandos Útiles
bash
# Desarrollo
npm run dev          # Servidor con nodemon
npm run setup        # Configuración inicial

# Producción  
npm start           # Iniciar servidor
npm run build       # Build para producción

# Base de datos
npm run db:backup   # Backup de datos
npm run db:restore  # Restaurar backup
📈 Monitoreo y Mantenimiento
Logs del Sistema
bash
# Ver logs en tiempo real
tail -f logs/application.log

# Monitorear errores
grep "ERROR" logs/application.log
Backup Automático
Configurar cron job para backup de MongoDB:

bash
0 2 * * * /usr/bin/mongodump --uri="MONGODB_URI" --out=/backups/hotspot-$(date +%Y%m%d)
Health Checks
GET /health - Estado del servidor

Panel admin → System Health

🛠️ Solución de Problemas
Error: Conexión MikroTik
bash
# Verificar conectividad
telnet IP_MIKROTIK 8728

# Verificar credenciales
/ip service print
/user print
Error: MercadoPago
Verificar MP_ACCESS_TOKEN

Configurar URLs de notificación

Verificar logs de webhooks

Error: OAuth
Verificar URLs de callback

Verificar scopes de la aplicación

Revisar consola de Google Cloud

📝 Licencia
Este es un software propietario. Todos los derechos reservados.

🤝 Soporte
Soporte Técnico:

Email: soporte@tudominio.com

Documentación: docs.tudominio.com

Issues: GitHub Issues

Recursos:

Documentación MikroTik

MercadoPago Developers

Google OAuth