const express = require('express');
const router = express.Router();
const mikrotikManager = require('../utils/mikrotikManager');
const Hotspot = require('../models/Hotspot');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Conectar usuario a hotspot
router.post('/connect', auth, async (req, res) => {
  try {
    const { hotspotId, planId } = req.body;
    const user = req.user;

    // Verificar que el usuario tenga créditos
    if (user.credits <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No tienes créditos suficientes'
      });
    }

    const hotspot = await Hotspot.findById(hotspotId);
    if (!hotspot || !hotspot.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Hotspot no disponible'
      });
    }

    // Generar credenciales temporales
    const username = `user_${user._id}_${Date.now()}`;
    const password = Math.random().toString(36).slice(-8);

    // Agregar usuario al MikroTik
    await mikrotikManager.addHotspotUser(
      hotspotId, 
      username, 
      password, 
      'default', 
      '1d' // 1 día de acceso
    );

    // Restar crédito al usuario
    user.credits -= 1;
    await user.save();

    // Registrar sesión
    user.sessions.push({
      hotspot: hotspotId,
      startTime: new Date(),
      ipAddress: req.ip
    });
    await user.save();

    res.json({
      success: true,
      credentials: {
        username,
        password
      },
      hotspot: {
        name: hotspot.name,
        ip: hotspot.ip
      },
      remainingCredits: user.credits
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Obtener hotspots disponibles
router.get('/hotspots', auth, async (req, res) => {
  try {
    const hotspots = await Hotspot.find({ isActive: true })
      .select('name location currentUsers maxUsers');
    
    res.json({
      success: true,
      hotspots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Sincronizar estado de hotspot (admin)
router.post('/sync/:hotspotId', auth, async (req, res) => {
  try {
    const userCount = await mikrotikManager.syncHotspotUsers(req.params.hotspotId);
    
    res.json({
      success: true,
      userCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;