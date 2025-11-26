const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { generateRandomString } = require('../utils/helpers');

class AuthController {
  async handleOAuthCallback(profile, provider) {
    try {
      let user = await User.findOne({
        $or: [
          { [`${provider}Id`]: profile.id },
          { email: profile.email }
        ]
      });

      if (user) {
        // Actualizar último login y provider ID si es necesario
        if (!user[`${provider}Id`]) {
          user[`${provider}Id`] = profile.id;
        }
        user.lastLogin = new Date();
        await user.save();
      } else {
        // Crear nuevo usuario
        user = await User.create({
          [`${provider}Id`]: profile.id,
          email: profile.email,
          name: profile.name || `Usuario ${provider}`,
          lastLogin: new Date()
        });
      }

      // Generar token JWT
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          credits: user.credits
        }
      };
    } catch (error) {
      console.error('Error in OAuth callback:', error);
      return {
        success: false,
        message: 'Error en el proceso de autenticación'
      };
    }
  }

  async validateToken(req, res) {
    try {
      const user = await User.findById(req.user._id)
        .select('-sessions -payments');

      res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          credits: user.credits,
          lastLogin: user.lastLogin
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
  }

  async logout(req, res) {
    try {
      // En una implementación más avanzada, podrías invalidar el token
      // agregándolo a una blacklist en la base de datos
      
      res.json({
        success: true,
        message: 'Sesión cerrada correctamente'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión'
      });
    }
  }
}

module.exports = new AuthController();