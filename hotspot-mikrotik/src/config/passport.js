const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
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
      return done(null, user);
    }

    user = await User.create({
      googleId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      lastLogin: new Date()
    });

    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));

// Apple OAuth Strategy (configuración básica)
if (process.env.APPLE_CLIENT_ID) {
  passport.use(new AppleStrategy({
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKeyString: process.env.APPLE_PRIVATE_KEY,
    callbackURL: "/auth/apple/callback",
    scope: ['name', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ 
        $or: [
          { appleId: profile.id },
          { email: profile.email }
        ]
      });

      if (user) {
        if (!user.appleId) {
          user.appleId = profile.id;
          await user.save();
        }
        return done(null, user);
      }

      user = await User.create({
        appleId: profile.id,
        email: profile.email,
        name: profile.name ? `${profile.name.firstName} ${profile.name.lastName}` : 'Usuario Apple',
        lastLogin: new Date()
      });

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
}

module.exports = passport;