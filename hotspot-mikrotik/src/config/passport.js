const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// IMPORTACIÓN CORRECTA PARA PASSPORT-APPLE
let AppleStrategy;
try {
  AppleStrategy = require('passport-apple').Strategy;
} catch (error) {
  console.log('⚠️  passport-apple no disponible:', error.message);
  AppleStrategy = null;
}

const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback",
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔐 Google OAuth profile recibido');
    
    let user = await User.findOne({ 
      $or: [
        { googleId: profile.id },
        { email: profile.emails[0].value }
      ]
    });

    if (user) {
      if (!user.googleId) {
        user.googleId = profile.id;
        await user.save();
      }
      user.lastLogin = new Date();
      await user.save();
      console.log(`✅ Usuario existente actualizado: ${user.email}`);
      return done(null, user);
    }

    user = await User.create({
      googleId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      lastLogin: new Date()
    });

    console.log(`✅ Nuevo usuario creado: ${user.email}`);
    done(null, user);
  } catch (error) {
    console.error('❌ Error en Google OAuth:', error);
    done(error, null);
  }
}));

// Apple OAuth Strategy - CONFIGURACIÓN CORRECTA
if (AppleStrategy && process.env.APPLE_CLIENT_ID) {
  console.log('🍎 Configurando Apple OAuth Strategy');
  
  passport.use(new AppleStrategy({
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKeyString: process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    callbackURL: "/auth/apple/callback",
    scope: ['name', 'email'],
    passReqToCallback: false
  }, async (accessToken, refreshToken, idToken, profile, done) => {
    try {
      console.log('🍎 Apple OAuth profile recibido:', profile);
      
      // Decodificar el idToken para obtener el email
      let email = profile.email;
      if (!email && idToken) {
        try {
          const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
          email = payload.email;
          console.log('📧 Email obtenido del idToken:', email);
        } catch (e) {
          console.error('❌ Error decoding Apple idToken:', e);
        }
      }

      if (!email) {
        return done(new Error('No se pudo obtener el email de Apple'), null);
      }

      let user = await User.findOne({ 
        $or: [
          { appleId: profile.id },
          { email: email }
        ]
      });

      if (user) {
        if (!user.appleId) {
          user.appleId = profile.id;
          await user.save();
        }
        user.lastLogin = new Date();
        await user.save();
        console.log(`✅ Usuario Apple existente actualizado: ${user.email}`);
        return done(null, user);
      }

      // Crear nombre desde los datos de Apple
      let name = 'Usuario Apple';
      if (profile.name) {
        const firstName = profile.name.firstName || '';
        const lastName = profile.name.lastName || '';
        name = `${firstName} ${lastName}`.trim() || 'Usuario Apple';
      }

      user = await User.create({
        appleId: profile.id,
        email: email,
        name: name,
        lastLogin: new Date()
      });

      console.log(`✅ Nuevo usuario Apple creado: ${user.email}`);
      done(null, user);
    } catch (error) {
      console.error('❌ Error en Apple OAuth:', error);
      done(error, null);
    }
  }));
} else {
  console.log('⚠️  Apple OAuth no configurado. Verifica APPLE_CLIENT_ID y dependencias.');
}

module.exports = passport;
