require('dotenv').config();
const app = require('./src/app');
const mongoose = require('mongoose');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Conectar a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotspot', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

connectDB();

// Configurar SSL para producción
if (process.env.NODE_ENV === 'production' && fs.existsSync('./ssl/key.pem')) {
  const sslOptions = {
    key: fs.readFileSync('./ssl/key.pem'),
    cert: fs.readFileSync('./ssl/cert.pem')
  };
  
  https.createServer(sslOptions, app).listen(443, () => {
    console.log('🚀 Servidor HTTPS ejecutándose en puerto 443');
  });
  
  // Redirigir HTTP a HTTPS
  require('http').createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
  }).listen(80);
  
  console.log('🔒 Servidor HTTP redirigiendo a HTTPS en puerto 80');
} else {
  // Servidor HTTP para desarrollo
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`📊 Panel admin: http://localhost:${PORT}/admin`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Manejo graceful de shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Apagando servidor...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Apagando servidor...');
  await mongoose.connection.close();
  process.exit(0);
});