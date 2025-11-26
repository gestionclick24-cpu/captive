const express = require('express');
const router = express.Router();
const User = require('../src/models/User');
const Payment = require('../src/models/Payment');
const Hotspot = require('../src/models/Hotspot');
const Plan = require('../src/models/Plan');

// Middleware de autenticación básica
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel", charset="UTF-8"');
    return res.status(401).send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>Authentication Required</h1>
          <p>Please enter your admin credentials</p>
        </body>
      </html>
    `);
  }

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
  const [email, password] = credentials.split(':');
  
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    return next();
  }
  
  res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel", charset="UTF-8"');
  res.status(401).send('Invalid credentials');
};

// Dashboard principal
router.get('/', adminAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalUsers,
      todayStats,
      weekStats,
      monthStats,
      activeHotspots,
      totalRevenue,
      recentPayments,
      userRegistrations
    ] = await Promise.all([
      User.countDocuments(),
      Payment.aggregate([
        { 
          $match: { 
            status: 'approved',
            createdAt: { $gte: today }
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
      Hotspot.countDocuments({ isActive: true }),
      Payment.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.find({ status: 'approved' })
        .populate('userId', 'name email')
        .populate('planId', 'name')
        .sort({ createdAt: -1 })
        .limit(10),
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

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admin Panel - Hotspot MikroTik</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
          <style>
              .stat-card { transition: transform 0.2s; }
              .stat-card:hover { transform: translateY(-5px); }
              .sidebar { min-height: 100vh; }
              .nav-link { color: #333; }
              .nav-link:hover { color: #0d6efd; }
          </style>
      </head>
      <body>
          <div class="container-fluid">
              <div class="row">
                  <!-- Sidebar -->
                  <nav class="col-md-3 col-lg-2 d-md-block bg-light sidebar collapse">
                      <div class="position-sticky pt-3">
                          <h4 class="px-3">🌐 Hotspot Admin</h4>
                          <ul class="nav flex-column">
                              <li class="nav-item">
                                  <a class="nav-link active" href="/admin">
                                      <i class="fas fa-tachometer-alt me-2"></i>Dashboard
                                  </a>
                              </li>
                              <li class="nav-item">
                                  <a class="nav-link" href="/admin/users">
                                      <i class="fas fa-users me-2"></i>Usuarios
                                  </a>
                              </li>
                              <li class="nav-item">
                                  <a class="nav-link" href="/admin/payments">
                                      <i class="fas fa-credit-card me-2"></i>Pagos
                                  </a>
                              </li>
                              <li class="nav-item">
                                  <a class="nav-link" href="/admin/hotspots">
                                      <i class="fas fa-wifi me-2"></i>Hotspots
                                  </a>
                              </li>
                              <li class="nav-item">
                                  <a class="nav-link" href="/admin/plans">
                                      <i class="fas fa-list me-2"></i>Planes
                                  </a>
                              </li>
                          </ul>
                      </div>
                  </nav>

                  <!-- Main content -->
                  <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
                      <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                          <h1 class="h2">Dashboard</h1>
                          <div class="btn-toolbar mb-2 mb-md-0">
                              <span class="text-muted">${new Date().toLocaleDateString('es-ES')}</span>
                          </div>
                      </div>

                      <!-- Stats Cards -->
                      <div class="row">
                          <div class="col-xl-3 col-md-6 mb-4">
                              <div class="card border-left-primary shadow h-100 py-2 stat-card">
                                  <div class="card-body">
                                      <div class="row no-gutters align-items-center">
                                          <div class="col mr-2">
                                              <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">Usuarios Totales</div>
                                              <div class="h5 mb-0 font-weight-bold text-gray-800">${totalUsers}</div>
                                          </div>
                                          <div class="col-auto">
                                              <i class="fas fa-users fa-2x text-gray-300"></i>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div class="col-xl-3 col-md-6 mb-4">
                              <div class="card border-left-success shadow h-100 py-2 stat-card">
                                  <div class="card-body">
                                      <div class="row no-gutters align-items-center">
                                          <div class="col mr-2">
                                              <div class="text-xs font-weight-bold text-success text-uppercase mb-1">Ingresos Hoy</div>
                                              <div class="h5 mb-0 font-weight-bold text-gray-800">$${todayStats[0]?.revenue || 0}</div>
                                              <div class="text-xs text-muted">${todayStats[0]?.count || 0} pagos</div>
                                          </div>
                                          <div class="col-auto">
                                              <i class="fas fa-dollar-sign fa-2x text-gray-300"></i>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div class="col-xl-3 col-md-6 mb-4">
                              <div class="card border-left-info shadow h-100 py-2 stat-card">
                                  <div class="card-body">
                                      <div class="row no-gutters align-items-center">
                                          <div class="col mr-2">
                                              <div class="text-xs font-weight-bold text-info text-uppercase mb-1">Hotspots Activos</div>
                                              <div class="h5 mb-0 font-weight-bold text-gray-800">${activeHotspots}</div>
                                          </div>
                                          <div class="col-auto">
                                              <i class="fas fa-wifi fa-2x text-gray-300"></i>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div class="col-xl-3 col-md-6 mb-4">
                              <div class="card border-left-warning shadow h-100 py-2 stat-card">
                                  <div class="card-body">
                                      <div class="row no-gutters align-items-center">
                                          <div class="col mr-2">
                                              <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">Ingresos Totales</div>
                                              <div class="h5 mb-0 font-weight-bold text-gray-800">$${totalRevenue[0]?.total || 0}</div>
                                          </div>
                                          <div class="col-auto">
                                              <i class="fas fa-chart-line fa-2x text-gray-300"></i>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <!-- Revenue Summary -->
                      <div class="row">
                          <div class="col-lg-4 mb-4">
                              <div class="card shadow">
                                  <div class="card-header bg-primary text-white">
                                      <h6 class="m-0 font-weight-bold">Resumen Semanal</h6>
                                  </div>
                                  <div class="card-body">
                                      <p><strong>Ingresos:</strong> $${weekStats[0]?.revenue || 0}</p>
                                      <p><strong>Pagos:</strong> ${weekStats[0]?.count || 0}</p>
                                  </div>
                              </div>
                          </div>
                          <div class="col-lg-4 mb-4">
                              <div class="card shadow">
                                  <div class="card-header bg-success text-white">
                                      <h6 class="m-0 font-weight-bold">Resumen Mensual</h6>
                                  </div>
                                  <div class="card-body">
                                      <p><strong>Ingresos:</strong> $${monthStats[0]?.revenue || 0}</p>
                                      <p><strong>Pagos:</strong> ${monthStats[0]?.count || 0}</p>
                                  </div>
                              </div>
                          </div>
                          <div class="col-lg-4 mb-4">
                              <div class="card shadow">
                                  <div class="card-header bg-info text-white">
                                      <h6 class="m-0 font-weight-bold">Registros (30 días)</h6>
                                  </div>
                                  <div class="card-body">
                                      <p><strong>Total:</strong> ${userRegistrations.reduce((sum, day) => sum + day.count, 0)} usuarios</p>
                                      <p><strong>Promedio/día:</strong> ${Math.round(userRegistrations.reduce((sum, day) => sum + day.count, 0) / 30)}</p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <!-- Recent Payments -->
                      <div class="card shadow mb-4">
                          <div class="card-header py-3">
                              <h6 class="m-0 font-weight-bold text-primary">Pagos Recientes</h6>
                          </div>
                          <div class="card-body">
                              <div class="table-responsive">
                                  <table class="table table-bordered" id="dataTable" width="100%" cellspacing="0">
                                      <thead>
                                          <tr>
                                              <th>Usuario</th>
                                              <th>Plan</th>
                                              <th>Monto</th>
                                              <th>Fecha</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          ${recentPayments.map(payment => `
                                              <tr>
                                                  <td>${payment.userId?.name || 'N/A'} <br><small class="text-muted">${payment.userId?.email || ''}</small></td>
                                                  <td>${payment.planId?.name || 'N/A'}</td>
                                                  <td>$${payment.amount}</td>
                                                  <td>${new Date(payment.createdAt).toLocaleDateString('es-ES')}</td>
                                              </tr>
                                          `).join('')}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>
                  </main>
              </div>
          </div>

          <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    console.error('Error en dashboard:', error);
    res.status(500).send(`
      <html>
        <body class="container mt-5">
          <div class="alert alert-danger">
            <h4>Error en el dashboard</h4>
            <p>${error.message}</p>
          </div>
        </body>
      </html>
    `);
  }
});

// Gestión de Usuarios
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(50);
    
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Usuarios - Admin Panel</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body>
          <div class="container mt-4">
              <h1>👥 Gestión de Usuarios</h1>
              <div class="table-responsive">
                  <table class="table table-striped">
                      <thead>
                          <tr>
                              <th>Nombre</th>
                              <th>Email</th>
                              <th>Créditos</th>
                              <th>Último Login</th>
                              <th>Registro</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${users.map(user => `
                              <tr>
                                  <td>${user.name}</td>
                                  <td>${user.email}</td>
                                  <td>${user.credits}</td>
                                  <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('es-ES') : 'Nunca'}</td>
                                  <td>${new Date(user.createdAt).toLocaleDateString('es-ES')}</td>
                              </tr>
                          `).join('')}
                      </tbody>
                  </table>
              </div>
              <a href="/admin" class="btn btn-primary mt-3">← Volver al Dashboard</a>
          </div>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Gestión de Pagos
router.get('/payments', adminAuth, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('userId', 'name email')
      .populate('planId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Pagos - Admin Panel</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body>
          <div class="container mt-4">
              <h1>💳 Gestión de Pagos</h1>
              <div class="table-responsive">
                  <table class="table table-striped">
                      <thead>
                          <tr>
                              <th>Usuario</th>
                              <th>Plan</th>
                              <th>Monto</th>
                              <th>Estado</th>
                              <th>Fecha</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${payments.map(payment => `
                              <tr>
                                  <td>${payment.userId?.name || 'N/A'}<br><small>${payment.userId?.email || ''}</small></td>
                                  <td>${payment.planId?.name || 'N/A'}</td>
                                  <td>$${payment.amount}</td>
                                  <td>
                                      <span class="badge ${payment.status === 'approved' ? 'bg-success' : payment.status === 'pending' ? 'bg-warning' : 'bg-danger'}">
                                          ${payment.status}
                                      </span>
                                  </td>
                                  <td>${new Date(payment.createdAt).toLocaleDateString('es-ES')}</td>
                              </tr>
                          `).join('')}
                      </tbody>
                  </table>
              </div>
              <a href="/admin" class="btn btn-primary mt-3">← Volver al Dashboard</a>
          </div>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Gestión de Hotspots
router.get('/hotspots', adminAuth, async (req, res) => {
  try {
    const hotspots = await Hotspot.find().sort({ name: 1 });

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Hotspots - Admin Panel</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body>
          <div class="container mt-4">
              <h1>📡 Gestión de Hotspots</h1>
              <div class="table-responsive">
                  <table class="table table-striped">
                      <thead>
                          <tr>
                              <th>Nombre</th>
                              <th>IP</th>
                              <th>Ubicación</th>
                              <th>Usuarios</th>
                              <th>Estado</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${hotspots.map(hotspot => `
                              <tr>
                                  <td>${hotspot.name}</td>
                                  <td>${hotspot.ip}</td>
                                  <td>${hotspot.location || 'N/A'}</td>
                                  <td>${hotspot.currentUsers}/${hotspot.maxUsers}</td>
                                  <td>
                                      <span class="badge ${hotspot.isActive ? 'bg-success' : 'bg-danger'}">
                                          ${hotspot.isActive ? 'Activo' : 'Inactivo'}
                                      </span>
                                  </td>
                              </tr>
                          `).join('')}
                      </tbody>
                  </table>
              </div>
              <a href="/admin" class="btn btn-primary mt-3">← Volver al Dashboard</a>
          </div>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Gestión de Planes
router.get('/plans', adminAuth, async (req, res) => {
  try {
    const plans = await Plan.find().sort({ price: 1 });

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Planes - Admin Panel</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body>
          <div class="container mt-4">
              <h1>📋 Gestión de Planes</h1>
              <div class="table-responsive">
                  <table class="table table-striped">
                      <thead>
                          <tr>
                              <th>Nombre</th>
                              <th>Días</th>
                              <th>Precio</th>
                              <th>Límite</th>
                              <th>Estado</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${plans.map(plan => `
                              <tr>
                                  <td>${plan.name}</td>
                                  <td>${plan.days}</td>
                                  <td>$${plan.price}</td>
                                  <td>${plan.speedLimit}</td>
                                  <td>
                                      <span class="badge ${plan.isActive ? 'bg-success' : 'bg-danger'}">
                                          ${plan.isActive ? 'Activo' : 'Inactivo'}
                                      </span>
                                  </td>
                              </tr>
                          `).join('')}
                      </tbody>
                  </table>
              </div>
              <a href="/admin" class="btn btn-primary mt-3">← Volver al Dashboard</a>
          </div>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

module.exports = router;
