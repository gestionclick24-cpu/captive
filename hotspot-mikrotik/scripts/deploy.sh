#!/bin/bash

echo "🚀 Iniciando despliegue del Hotspot MikroTik..."

# Verificar que .env existe
if [ ! -f .env ]; then
    echo "❌ Error: Archivo .env no encontrado"
    echo "📋 Copia .env.example a .env y configura las variables"
    exit 1
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Configurar base de datos
echo "🗄️ Configurando base de datos..."
node scripts/setup.js

# Construir aplicación
echo "🔨 Construyendo aplicación..."
npm run build

echo "✅ Despliegue completado!"
echo "📊 Para acceder al panel admin: https://tudominio.com/admin"
echo "🔑 Credenciales admin:"
echo "   Email: ${ADMIN_EMAIL}"
echo "   Password: ${ADMIN_PASSWORD}"