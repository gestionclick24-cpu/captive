require('dotenv').config();
const mongoose = require('mongoose');
const Plan = require('../src/models/Plan');
const Hotspot = require('../src/models/Hotspot');

async function setupDatabase() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI no está definida en .env');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Crear planes por defecto
    const defaultPlans = [
      {
        name: '1 Día',
        description: 'Acceso a internet por 24 horas',
        days: 1,
        price: 100,
        speedLimit: '10M/10M',
        dataLimit: 0,
        isActive: true
      },
      {
        name: '3 Días',
        description: 'Acceso a internet por 3 días',
        days: 3,
        price: 250,
        speedLimit: '10M/10M',
        dataLimit: 0,
        isActive: true
      },
      {
        name: '7 Días',
        description: 'Acceso a internet por 1 semana',
        days: 7,
        price: 500,
        speedLimit: '10M/10M',
        dataLimit: 0,
        isActive: true
      },
      {
        name: '30 Días',
        description: 'Acceso a internet por 1 mes',
        days: 30,
        price: 1500,
        speedLimit: '10M/10M',
        dataLimit: 0,
        isActive: true
      }
    ];

    let plansCreated = 0;
    for (const planData of defaultPlans) {
      const existingPlan = await Plan.findOne({ name: planData.name });
      if (!existingPlan) {
        await Plan.create(planData);
        console.log(`✅ Plan creado: ${planData.name} - $${planData.price}`);
        plansCreated++;
      } else {
        console.log(`ℹ️ Plan ya existe: ${planData.name}`);
      }
    }

    // Crear hotspot de ejemplo
    const exampleHotspot = await Hotspot.findOne({ name: 'Hotspot Principal' });
    if (!exampleHotspot) {
      await Hotspot.create({
        name: 'Hotspot Principal',
        ip: '192.168.88.1',
        username: 'admin',
        password: 'password',
        secret: 'miclave_secreta_hotspot',
        location: 'Oficina Central',
        maxUsers: 50,
        isActive: true
      });
      console.log('✅ Hotspot de ejemplo creado');
    }

    console.log('\n🎉 Configuración inicial completada!');
    console.log(`📊 ${plansCreated} planes creados`);
    console.log('🔧 Recuerda configurar las variables de entorno en Render');
    console.log('🚀 Ejecuta "npm start" para iniciar el servidor');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la configuración:', error.message);
    process.exit(1);
  }
}

// Ejecutar solo si es el archivo principal
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
