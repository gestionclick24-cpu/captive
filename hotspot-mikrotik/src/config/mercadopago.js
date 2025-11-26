const mercadopago = require('mercadopago');

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
  integrator_id: process.env.MP_INTEGRATOR_ID
});

module.exports = mercadopago;