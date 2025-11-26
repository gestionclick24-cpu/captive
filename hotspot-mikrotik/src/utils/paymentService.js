const mercadopago = require('../config/mercadopago');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Plan = require('../models/Plan');

class PaymentService {
  async createPaymentPreference(userId, planId, hotspotId) {
    try {
      const user = await User.findById(userId);
      const plan = await Plan.findById(planId);
      
      if (!user || !plan) {
        throw new Error('Usuario o plan no encontrado');
      }

      // Crear payment en la base de datos
      const payment = await Payment.create({
        userId: user._id,
        planId: plan._id,
        amount: plan.price,
        status: 'pending'
      });

      // Crear preferencia en MercadoPago
      const preference = {
        items: [
          {
            id: plan._id.toString(),
            title: `Plan ${plan.name} - ${plan.days} días`,
            description: plan.description || `Acceso a internet por ${plan.days} días`,
            quantity: 1,
            currency_id: 'ARS',
            unit_price: plan.price
          }
        ],
        payer: {
          name: user.name,
          email: user.email
        },
        external_reference: payment._id.toString(),
        notification_url: `${process.env.BASE_URL}/api/payments/notification`,
        back_urls: {
          success: `${process.env.CLIENT_URL}/payment/success`,
          failure: `${process.env.CLIENT_URL}/payment/error`,
          pending: `${process.env.CLIENT_URL}/payment/pending`
        },
        auto_return: 'approved',
        payment_methods: {
          excluded_payment_types: [
            { id: 'atm' }
          ],
          installments: 1
        }
      };

      const response = await mercadopago.preferences.create(preference);
      
      // Actualizar payment con preferenceId
      payment.preferenceId = response.body.id;
      await payment.save();

      return {
        preferenceId: response.body.id,
        initPoint: response.body.init_point,
        sandboxInitPoint: response.body.sandbox_init_point
      };
    } catch (error) {
      console.error('Error creating payment preference:', error);
      throw error;
    }
  }

  async handlePaymentNotification(query) {
    try {
      if (query.type === 'payment') {
        const paymentId = query['data.id'];
        
        const paymentInfo = await mercadopago.payment.get(paymentId);
        const paymentData = paymentInfo.body;
        
        const payment = await Payment.findById(paymentData.external_reference);
        
        if (payment && payment.status === 'pending') {
          payment.status = paymentData.status === 'approved' ? 'approved' : 'rejected';
          payment.mercadoPagoId = paymentData.id;
          payment.paymentMethod = paymentData.payment_method_id;
          payment.paymentDate = new Date();
          await payment.save();

          if (payment.status === 'approved') {
            // Activar créditos para el usuario
            const user = await User.findById(payment.userId);
            const plan = await Plan.findById(payment.planId);
            
            user.credits += plan.days;
            await user.save();
          }
        }
      }
    } catch (error) {
      console.error('Error processing payment notification:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();