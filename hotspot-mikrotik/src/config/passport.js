const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
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

// Solo Google OAuth - Simple y confiable
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

module.exports = passport;
