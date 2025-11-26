const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./config/passport');

const app = express();

// Middlewares de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.mercadopago.com"]
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
  max: 100 // máximo 100 requests por ventana
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production-hotspot',
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

// Importar y usar rutas API
app.use('/auth', require('./routes/auth'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/mikrotik', require('./routes/mikrotik'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));

// Panel administrativo - CON MANEJO DE ERRORES
try {
  const { adminRouter } = require('../admin/admin');
  app.use('/admin', adminRouter);
  console.log('✅ Panel AdminJS configurado correctamente');
} catch (error) {
  console.error('❌ Error configurando AdminJS:', error.message);
  // Ruta alternativa para admin si falla AdminJS
  app.use('/admin', (req, res) => {
    res.status(500).send(`
      <html>
        <body>
          <h1>Panel Admin Temporalmente No Disponible</h1>
          <p>El panel de administración está en mantenimiento.</p>
          <p>Error: ${error.message}</p>
        </body>
      </html>
    `);
  });
}

// Servir archivos estáticos
app.use(express.static('public'));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(require('path').join(__dirname, '../public/index.html'));
});

// Health check mejorado
app.get('/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
      status: 'OK',
      database: dbStatus,
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// Manejo de errores mejorado
app.use((err, req, res, next) => {
  console.error('❌ Error del servidor:', err.stack);
  
  // Errores de Mongoose
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // Errores de duplicados
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'El registro ya existe'
    });
  }

  // Error de autenticación
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado'
  });
});

module.exports = app;
