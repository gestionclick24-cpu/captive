const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Hotspot = require('../models/Hotspot');
const Plan = require('../models/Plan');
const mikrotikManager = require('../utils/mikrotikManager');

// Estadísticas generales
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Ingresos por período
    const todayRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'approved',
          createdAt: { $gte: startOfToday }
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

    const weekRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'approved',
          createdAt: { $gte: startOfWeek }
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

    const monthRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'approved',
          createdAt: { $gte: startOfMonth }
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

    // Estadísticas generales
    const totalUsers = await User.countDocuments();
    const totalHotspots = await Hotspot.countDocuments();
    const activeHotspots = await Hotspot.countDocuments({ isActive: true });
    const totalPayments = await Payment.countDocuments({ status: 'approved' });

    // Ingresos por día (últimos 7 días)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const dailyRevenue = await Payment.aggregate([
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
          total: { $sum: '$amount' },
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
          revenue: todayRevenue[0]?.total || 0,
          payments: todayRevenue[0]?.count || 0
        },
        week: {
          revenue: weekRevenue[0]?.total || 0,
          payments: weekRevenue[0]?.count || 0
        },
        month: {
          revenue: monthRevenue[0]?.total || 0,
          payments: monthRevenue[0]?.count || 0
        },
        general: {
          totalUsers,
          totalHotspots,
          activeHotspots,
          totalPayments
        },
        dailyRevenue
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Reportes personalizados
router.post('/reports', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate, reportType } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Fechas de inicio y fin son requeridas'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    let reportData;

    switch (reportType) {
      case 'revenue':
        reportData = await Payment.aggregate([
          {
            $match: {
              status: 'approved',
              createdAt: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
              },
              total: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          },
          {
            $sort: { _id: 1 }
          }
        ]);
        break;

      case 'users':
        reportData = await User.aggregate([
          {
            $match: {
              createdAt: { $gte: start, $lte: end }
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
        ]);
        break;

      case 'hotspot-usage':
        reportData = await User.aggregate([
          {
            $unwind: '$sessions'
          },
          {
            $match: {
              'sessions.startTime': { $gte: start, $lte: end }
            }
          },
          {
            $lookup: {
              from: 'hotspots',
              localField: 'sessions.hotspot',
              foreignField: '_id',
              as: 'hotspotInfo'
            }
          },
          {
            $group: {
              _id: { $arrayElemAt: ['$hotspotInfo.name', 0] },
              sessions: { $sum: 1 },
              totalData: { $sum: '$sessions.dataUsed' }
            }
          }
        ]);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Tipo de reporte no válido'
        });
    }

    res.json({
      success: true,
      report: {
        type: reportType,
        startDate: start,
        endDate: end,
        data: reportData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Sincronizar todos los hotspots
router.post('/hotspots/sync-all', adminAuth, async (req, res) => {
  try {
    const hotspots = await Hotspot.find({ isActive: true });
    const results = [];

    for (const hotspot of hotspots) {
      try {
        const userCount = await mikrotikManager.syncHotspotUsers(hotspot._id);
        results.push({
          hotspot: hotspot.name,
          success: true,
          userCount
        });
      } catch (error) {
        results.push({
          hotspot: hotspot.name,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Exportar datos
router.get('/export/:type', adminAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;

    let data;
    let filename;

    const filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    switch (type) {
      case 'payments':
        data = await Payment.find(filter)
          .populate('userId', 'name email')
          .populate('planId', 'name days price');
        filename = `pagos_${new Date().toISOString().split('T')[0]}.json`;
        break;

      case 'users':
        data = await User.find(filter);
        filename = `usuarios_${new Date().toISOString().split('T')[0]}.json`;
        break;

      case 'sessions':
        data = await User.aggregate([
          { $unwind: '$sessions' },
          {
            $match: filter.createdAt ? {
              'sessions.startTime': filter.createdAt
            } : {}
          },
          {
            $lookup: {
              from: 'hotspots',
              localField: 'sessions.hotspot',
              foreignField: '_id',
              as: 'hotspotInfo'
            }
          },
          {
            $project: {
              userName: '$name',
              userEmail: '$email',
              hotspot: { $arrayElemAt: ['$hotspotInfo.name', 0] },
              startTime: '$sessions.startTime',
              endTime: '$sessions.endTime',
              dataUsed: '$sessions.dataUsed',
              ipAddress: '$sessions.ipAddress'
            }
          }
        ]);
        filename = `sesiones_${new Date().toISOString().split('T')[0]}.json`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Tipo de exportación no válido'
        });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(JSON.stringify(data, null, 2));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;