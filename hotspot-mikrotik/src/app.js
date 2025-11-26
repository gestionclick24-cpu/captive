const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./config/passport');
const path = require('path');

const app = express();

// Middlewares de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://api.mercadopago.com"],
      frameSrc: ["'self'", "https://www.mercadopago.com.ar"]
    }
  }
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    success: false,
    message: 'Demasiadas solicitudes, intenta nuevamente en 15 minutos'
  }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production-hotspot-2024',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 14 * 24 * 60 * 60 // 14 días
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 días
  }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Servir archivos estáticos PRIMERO (para CSS, JS, etc.)
app.use(express.static('public'));

// Importar y usar rutas API
app.use('/auth', require('./routes/auth'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/mikrotik', require('./routes/mikrotik'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));

// Panel administrativo SIMPLE - SIN AdminJS
app.use('/admin', require('../admin/admin-panel'));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check mejorado
app.get('/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Verificar variables críticas
    const envVars = {
      google_oauth: !!process.env.GOOGLE_CLIENT_ID,
      mercadopago: !!process.env.MP_ACCESS_TOKEN,
      mongodb: !!process.env.MONGODB_URI,
      admin: !!process.env.ADMIN_EMAIL
    };
    
    res.json({
      status: 'OK',
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date(),
      services: envVars
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// Info del sistema
app.get('/info', (req, res) => {
  res.json({
    name: 'Hotspot MikroTik System',
    version: '1.0.0',
    description: 'Sistema de hotspot con autenticación Google y MercadoPago',
    endpoints: {
      auth: '/auth',
      api: '/api',
      admin: '/admin',
      health: '/health'
    }
  });
});

// Manejo de errores mejorado
app.use((err, req, res, next) => {
  console.error('❌ Error del servidor:', err.stack);
  
  // Errores de Mongoose
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación de datos',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // Errores de duplicados
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `El ${field} ya existe en el sistema`
    });
  }

  // Error de autenticación JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticación inválido'
    });
  }

  // Error de token expirado
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticación expirado'
    });
  }

  // Error de MercadoPago
  if (err.name === 'MercadoPagoError') {
    return res.status(400).json({
      success: false,
      message: 'Error en el procesamiento de pago'
    });
  }

  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { debug: err.message })
  });
});

// 404 handler mejorado
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Página No Encontrada - Hotspot MikroTik</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0; 
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: white;
            text-align: center;
          }
          .container { 
            background: white; 
            padding: 40px; 
            border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            color: #333;
            max-width: 500px;
            width: 100%;
          }
          h1 { color: #dc3545; margin-bottom: 20px; }
          .btn { 
            background: #667eea; 
            color: white; 
            padding: 12px 24px; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer;
            font-size: 16px;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔍 404 - Página No Encontrada</h1>
          <p>La página que buscas no existe o fue movida.</p>
          <div>
            <a href="/" class="btn">Ir al Inicio</a>
            <a href="/admin" class="btn">Panel Admin</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } else if (req.accepts('json')) {
    res.status(404).json({
      success: false,
      message: 'Endpoint no encontrado',
      path: req.path,
      method: req.method
    });
  } else {
    res.status(404).send('404 - Página no encontrada');
  }
});

module.exports = app;
