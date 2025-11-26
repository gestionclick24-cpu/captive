const { AdminJS } = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const AdminJSMongoose = require('@adminjs/mongoose');
const mongoose = require('mongoose');

// Registrar el adaptador de Mongoose CORREGIDO para v7
AdminJSMongoose.Adapter.init(AdminJS);

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
    logo: false,
    theme: {
      colors: {
        primary100: '#1e40af',
        primary80: '#1e40af',
        primary60: '#1e40af',
        primary40: '#1e40af',
        primary20: '#1e40af',
      }
    }
  },
  dashboard: {
    handler: async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const totalUsers = await User.countDocuments();
        const todayPayments = await Payment.aggregate([
          { 
            $match: { 
              status: 'approved',
              createdAt: { $gte: today }
            } 
          },
          { 
            $group: { 
              _id: null, 
              total: { $sum: '$amount' },
              count: { $sum: 1 }
            } 
          }
        ]);
        
        const activeHotspots = await Hotspot.countDocuments({ isActive: true });
        const totalRevenue = await Payment.aggregate([
          { $match: { status: 'approved' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        return {
          totalUsers,
          todayRevenue: todayPayments[0]?.total || 0,
          todayPayments: todayPayments[0]?.count || 0,
          activeHotspots,
          totalRevenue: totalRevenue[0]?.total || 0
        };
      } catch (error) {
        console.error('Error en dashboard handler:', error);
        return {
          totalUsers: 0,
          todayRevenue: 0,
          todayPayments: 0,
          activeHotspots: 0,
          totalRevenue: 0
        };
      }
    }
  }
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
  cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'fallback-cookie-secret-hotspot',
  maxAge: 24 * 60 * 60 * 1000 // 24 horas
});

module.exports = { admin, adminRouter };
