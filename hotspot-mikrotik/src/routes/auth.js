const express = require('express');
const passport = require('passport');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Google Auth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Generar token JWT para el cliente
    const token = jwt.sign(
      { userId: req.user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    res.redirect(`/auth/success?token=${token}`);
  }
);

// Apple Auth
router.get('/apple',
  passport.authenticate('apple', { scope: ['name', 'email'] })
);

router.post('/apple/callback',
  passport.authenticate('apple', { failureRedirect: '/login' }),
  (req, res) => {
    const token = jwt.sign(
      { userId: req.user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    res.redirect(`/auth/success?token=${token}`);
  }
);

// Success endpoint para el cliente
router.get('/success', (req, res) => {
  const token = req.query.token;
  res.send(`
    <html>
      <body>
        <script>
          window.opener.postMessage({ token: '${token}' }, '*');
          window.close();
        </script>
        <p>Autenticación exitosa! Puedes cerrar esta ventana.</p>
      </body>
    </html>
  `);
});

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

module.exports = router;