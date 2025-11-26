const User = require('../models/User');
const Payment = require('../models/Payment');
const Hotspot = require('../models/Hotspot');
const Plan = require('../models/Plan');
const mikrotikManager = require('../utils/mikrotikManager');

class AdminController {
  async getDashboardStats(req, res) {
    try {
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Ejecutar todas las consultas en paralelo para mejor performance
      const [
        todayStats,
        weekStats,
        monthStats,
        totalUsers,
        totalHotspots,
        activeHotspots,
        totalPayments,
        recentPayments,
        userRegistrations
      ] = await Promise.all([
        // Estadísticas de hoy
        Payment.aggregate([
          {
            $match: {
              status: 'approved',
              createdAt: { $gte: startOfToday }
            }
          },
          {
            $group: {
              _id: null,
              revenue: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]),

        // Estadísticas de la semana
        Payment.aggregate([
          {
            $match: {
              status: 'approved',
              createdAt: { $gte: startOfWeek }
            }
          },
          {
            $group: {
              _id: null,
              revenue: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]),

        // Estadísticas del mes
        Payment.aggregate([
          {
            $match: {
              status: 'approved',
              createdAt: { $gte: startOfMonth }
            }
          },
          {
            $group: {
              _id: null,
              revenue: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]),

        // Totales
        User.countDocuments(),
        Hotspot.countDocuments(),
        Hotspot.countDocuments({ isActive: true }),
        Payment.countDocuments({ status: 'approved' }),

        // Pagos recientes
        Payment.find({ status: 'approved' })
          .populate('userId', 'name email')
          .populate('planId', 'name')
          .sort({ createdAt: -1 })
          .limit(10),

        // Registros de usuarios (últimos 30 días)
        User.aggregate([
          {
            $match: {
              createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
              },
              count: { $sum: 1 }
            }
          },
          {
            $sort: { _id: 1 }
          }
        ])
      ]);

      // Ingresos de los últimos 7 días
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      const revenueLast7Days = await Payment.aggregate([
        {
          $match: {
            status: 'approved',
            createdAt: { $gte: last7Days }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            revenue: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      res.json({
        success: true,
        stats: {
          today: {
            revenue: todayStats[0]?.revenue || 0,
            payments: todayStats[0]?.count || 0
          },
          week: {
            revenue: weekStats[0]?.revenue || 0,
            payments: weekStats[0]?.count || 0
          },
          month: {
            revenue: monthStats[0]?.revenue || 0,
            payments: monthStats[0]?.count || 0
          },
          general: {
            totalUsers,
            totalHotspots,
            activeHotspots,
            totalPayments
          },
          recentPayments: recentPayments.map(payment => ({
            id: payment._id,
            user: payment.userId.name,
            plan: payment.planId.name,
            amount: payment.amount,
            date: payment.createdAt
          })),
          userRegistrations,
          revenueLast7Days
        }
      });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas del dashboard.'
      });
    }
  }

  async syncAllHotspots(req, res) {
    try {
      const hotspots = await Hotspot.find({ isActive: true });
      const results = [];

      for (const hotspot of hotspots) {
        try {
          const userCount = await mikrotikManager.syncHotspotUsers(hotspot._id);
          results.push({
            hotspotId: hotspot._id,
            hotspotName: hotspot.name,
            success: true,
            userCount,
            syncedAt: new Date()
          });
        } catch (error) {
          results.push({
            hotspotId: hotspot._id,
            hotspotName: hotspot.name,
            success: false,
            error: error.message,
            syncedAt: new Date()
          });
        }
      }

      res.json({
        success: true,
        message: `Sincronización completada para ${hotspots.length} hotspots.`,
        results
      });
    } catch (error) {
      console.error('Error syncing all hotspots:', error);
      res.status(500).json({
        success: false,
        message: 'Error al sincronizar los hotspots.'
      });
    }
  }

  async createPlan(req, res) {
    try {
      const { name, description, days, price, speedLimit, dataLimit } = req.body;

      const plan = await Plan.create({
        name,
        description,
        days: parseInt(days),
        price: parseFloat(price),
        speedLimit: speedLimit || 'unlimited',
        dataLimit: dataLimit || 0,
        isActive: true
      });

      res.json({
        success: true,
        message: 'Plan creado correctamente.',
        plan
      });
    } catch (error) {
      console.error('Error creating plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear el plan.'
      });
    }
  }

  async updatePlan(req, res) {
    try {
      const { planId } = req.params;
      const updates = req.body;

      const plan = await Plan.findByIdAndUpdate(
        planId,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan no encontrado.'
        });
      }

      res.json({
        success: true,
        message: 'Plan actualizado correctamente.',
        plan
      });
    } catch (error) {
      console.error('Error updating plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el plan.'
      });
    }
  }

  async getSystemHealth(req, res) {
    try {
      const hotspots = await Hotspot.find({ isActive: true });
      const healthStatus = [];

      for (const hotspot of hotspots) {
        try {
          await mikrotikManager.getConnection(hotspot._id);
          healthStatus.push({
            hotspotId: hotspot._id,
            hotspotName: hotspot.name,
            status: 'online',
            message: 'Conexión exitosa'
          });
        } catch (error) {
          healthStatus.push({
            hotspotId: hotspot._id,
            hotspotName: hotspot.name,
            status: 'offline',
            message: error.message
          });
        }
      }

      // Verificar base de datos
      const dbStatus = 'online'; // Si llegamos aquí, la DB está online

      res.json({
        success: true,
        health: {
          database: dbStatus,
          hotspots: healthStatus,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error checking system health:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar el estado del sistema.'
      });
    }
  }
}

module.exports = new AdminController();