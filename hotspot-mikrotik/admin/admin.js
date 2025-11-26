const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const AdminJSMongoose = require('@adminjs/mongoose');
const mongoose = require('mongoose');

// Registrar el adaptador de Mongoose para v5
AdminJS.registerAdapter(AdminJSMongoose);

const User = require('../src/models/User');
const Payment = require('../src/models/Payment');
const Hotspot = require('../src/models/Hotspot');
const Plan = require('../src/models/Plan');

const adminOptions = {
  resources: [
    {
      resource: User,
      options: {
        listProperties: ['name', 'email', 'credits', 'lastLogin', 'createdAt'],
        filterProperties: ['name', 'email', 'createdAt'],
        editProperties: ['name', 'email', 'credits', 'isActive'],
        actions: {
          edit: { isAccessible: true },
          delete: { isAccessible: true },
          new: { isAccessible: false }
        }
      }
    },
    {
      resource: Payment,
      options: {
        listProperties: ['userId', 'amount', 'status', 'paymentDate', 'createdAt'],
        filterProperties: ['status', 'paymentDate', 'createdAt'],
        editProperties: ['status'],
        actions: {
          edit: { isAccessible: true },
          delete: { isAccessible: false },
          new: { isAccessible: false }
        }
      }
    },
    {
      resource: Hotspot,
      options: {
        listProperties: ['name', 'ip', 'location', 'currentUsers', 'maxUsers', 'isActive'],
        filterProperties: ['isActive', 'location'],
        editProperties: ['name', 'ip', 'location', 'username', 'password', 'maxUsers', 'isActive'],
        properties: {
          password: {
            type: 'password'
          }
        }
      }
    },
    {
      resource: Plan,
      options: {
        listProperties: ['name', 'days', 'price', 'isActive'],
        filterProperties: ['isActive'],
        editProperties: ['name', 'description', 'days', 'price', 'speedLimit', 'dataLimit', 'isActive']
      }
    }
  ],
  branding: {
    companyName: 'Hotspot MikroTik Admin',
    logo: false
  },
  rootPath: '/admin'
};

const admin = new AdminJS(adminOptions);

// Configuración de autenticación para AdminJS
const adminRouter = AdminJSExpress.buildAuthenticatedRouter(admin, {
  authenticate: async (email, password) => {
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      return { email: process.env.ADMIN_EMAIL };
    }
    return null;
  },
  cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'fallback-cookie-secret-hotspot-2024',
  maxAge: 24 * 60 * 60 * 1000 // 24 horas
});

module.exports = { admin, adminRouter };
