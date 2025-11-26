const express = require('express');
const router = express.Router();
const paymentService = require('../utils/paymentService');
const auth = require('../middleware/auth');

// Crear pago
router.post('/create', auth, async (req, res) => {
  try {
    const { planId, hotspotId } = req.body;
    
    const paymentData = await paymentService.createPaymentPreference(
      req.user._id, 
      planId, 
      hotspotId
    );
    
    res.json({
      success: true,
      ...paymentData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Notificación de MercadoPago
router.post('/notification', async (req, res) => {
  try {
    await paymentService.handlePaymentNotification(req.query);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error in payment notification:', error);
    res.status(500).send('Error');
  }
});

// Verificar estado de pago
router.get('/status/:paymentId', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId)
      .populate('planId')
      .populate('userId');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;