const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Payment = require('../models/Payment');

// Obtener perfil de usuario
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-sessions') // Excluir sesiones por ahora para optimizar
      .populate('payments');

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Obtener historial de pagos
router.get('/payments', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .populate('planId')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      payments: payments.map(payment => ({
        id: payment._id,
        plan: payment.planId?.name || 'Plan no disponible',
        amount: payment.amount,
        status: payment.status,
        paymentDate: payment.paymentDate,
        createdAt: payment.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Obtener historial de sesiones
router.get('/sessions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(req.user._id)
      .populate({
        path: 'sessions.hotspot',
        select: 'name location'
      })
      .select('sessions');

    const sessions = user.sessions
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      .slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      sessions: sessions.map(session => ({
        id: session._id,
        hotspot: session.hotspot?.name || 'Hotspot desconocido',
        location: session.hotspot?.location || 'Ubicación no disponible',
        startTime: session.startTime,
        endTime: session.endTime,
        dataUsed: session.dataUsed,
        ipAddress: session.ipAddress
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: user.sessions.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Actualizar perfil de usuario
router.put('/profile', auth, async (req, res) => {
  try {
    const { name } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name },
      { new: true, runValidators: true }
    ).select('-sessions -payments');

    res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Verificar créditos disponibles
router.get('/credits', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('credits');

    res.json({
      success: true,
      credits: user.credits
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;