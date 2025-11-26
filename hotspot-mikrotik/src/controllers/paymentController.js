const Payment = require('../models/Payment');
const User = require('../models/User');
const Plan = require('../models/Plan');
const paymentService = require('../utils/paymentService');

class PaymentController {
  async createPayment(req, res) {
    try {
      const { planId, hotspotId } = req.body;
      const userId = req.user._id;

      const result = await paymentService.createPaymentPreference(
        userId, 
        planId, 
        hotspotId
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async handleNotification(req, res) {
    try {
      await paymentService.handlePaymentNotification(req.query);
      res.status(200).send('OK');
    } catch (error) {
      console.error('Error in payment notification:', error);
      res.status(500).send('Error');
    }
  }

  async getPaymentStatus(req, res) {
    try {
      const payment = await Payment.findById(req.params.paymentId)
        .populate('planId')
        .populate('userId', 'name email');

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      // Verificar que el usuario tenga permisos para ver este pago
      if (payment.userId._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este pago'
        });
      }

      res.json({
        success: true,
        payment: {
          id: payment._id,
          plan: payment.planId.name,
          amount: payment.amount,
          status: payment.status,
          paymentDate: payment.paymentDate,
          createdAt: payment.createdAt,
          user: {
            name: payment.userId.name,
            email: payment.userId.email
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getUserPayments(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const payments = await Payment.find({ userId: req.user._id })
        .populate('planId')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Payment.countDocuments({ userId: req.user._id });

      res.json({
        success: true,
        payments: payments.map(payment => ({
          id: payment._id,
          plan: payment.planId.name,
          amount: payment.amount,
          status: payment.status,
          paymentDate: payment.paymentDate,
          createdAt: payment.createdAt
        })),
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new PaymentController();