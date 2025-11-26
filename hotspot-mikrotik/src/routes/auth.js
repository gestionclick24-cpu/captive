const express = require('express');
const passport = require('passport');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Google Auth - Simple y confiable
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/?error=auth_failed',
    failureMessage: true 
  }),
  (req, res) => {
    try {
      const token = jwt.sign(
        { userId: req.user._id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '7d' }
      );
      console.log(`✅ Google auth exitosa para usuario: ${req.user.email}`);
      res.redirect(`/auth/success?token=${token}&user=${encodeURIComponent(req.user.name)}`);
    } catch (error) {
      console.error('❌ Error en Google callback:', error);
      res.redirect('/?error=auth_failed');
    }
  }
);

// Success endpoint para el cliente
router.get('/success', (req, res) => {
  const token = req.query.token;
  const userName = req.query.user;
  
  if (!token) {
    return res.redirect('/?error=no_token');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Autenticación Exitosa</title>
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
        }
        .container { 
          background: white; 
          padding: 40px; 
          border-radius: 15px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          text-align: center;
          color: #333;
          max-width: 400px;
          width: 100%;
        }
        .success-icon { 
          font-size: 48px; 
          margin-bottom: 20px;
          color: #28a745;
        }
        h1 { color: #28a745; margin-bottom: 20px; }
        p { margin-bottom: 20px; line-height: 1.6; }
        .btn { 
          background: #28a745; 
          color: white; 
          padding: 12px 24px; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer;
          font-size: 16px;
          text-decoration: none;
          display: inline-block;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">✅</div>
        <h1>¡Autenticación Exitosa!</h1>
        <p>Hola <strong>${userName || 'Usuario'}</strong>, tu autenticación se completó correctamente.</p>
        <p>Puedes cerrar esta ventana y regresar a la aplicación.</p>
        <button class="btn" onclick="closeWindow()">Cerrar Ventana</button>
      </div>
      <script>
        function closeWindow() {
          window.close();
        }
        
        // Enviar mensaje a la ventana padre si existe
        if (window.opener && window.opener !== window) {
          window.opener.postMessage({ 
            type: 'auth_success', 
            token: '${token}',
            user: '${userName || 'Usuario'}'
          }, '*');
        }
        
        // Cerrar automáticamente después de 3 segundos
        setTimeout(() => {
          if (window.opener && window.opener !== window) {
            window.close();
          }
        }, 3000);
      </script>
    </body>
    </html>
  `);
});

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/?message=logged_out');
  });
});

// Verificar token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-sessions -payments');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits
      }
    });
  } catch (error) {
    console.error('❌ Error verificando token:', error);
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
});

// Health check para auth
router.get('/health', (req, res) => {
  res.json({
    success: true,
    google: !!process.env.GOOGLE_CLIENT_ID,
    apple: false,
    timestamp: new Date()
  });
});

module.exports = router;
