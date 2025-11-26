const Hotspot = require('../models/Hotspot');
const User = require('../models/User');
const mikrotikManager = require('../utils/mikrotikManager');
const { generateRandomString } = require('../utils/helpers');

class MikroTikController {
  async connectToHotspot(req, res) {
    try {
      const { hotspotId } = req.body;
      const user = req.user;

      // Verificar créditos
      if (user.credits <= 0) {
        return res.status(400).json({
          success: false,
          message: 'No tienes créditos suficientes. Por favor, compra un plan.'
        });
      }

      const hotspot = await Hotspot.findById(hotspotId);
      if (!hotspot || !hotspot.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Hotspot no disponible en este momento.'
        });
      }

      // Verificar capacidad del hotspot
      if (hotspot.currentUsers >= hotspot.maxUsers) {
        return res.status(400).json({
          success: false,
          message: 'El hotspot ha alcanzado su capacidad máxima. Intenta más tarde.'
        });
      }

      // Generar credenciales únicas
      const username = `user_${user._id.toString().slice(-8)}_${Date.now().toString().slice(-6)}`;
      const password = generateRandomString(10);

      // Agregar usuario al MikroTik
      await mikrotikManager.addHotspotUser(
        hotspotId,
        username,
        password,
        'default',
        '1d' // 1 día de acceso
      );

      // Actualizar créditos del usuario
      user.credits -= 1;
      
      // Registrar sesión
      user.sessions.push({
        hotspot: hotspotId,
        startTime: new Date(),
        ipAddress: req.ip
      });

      await user.save();

      // Sincronizar contador de usuarios
      await mikrotikManager.syncHotspotUsers(hotspotId);

      res.json({
        success: true,
        credentials: {
          username,
          password
        },
        hotspot: {
          name: hotspot.name,
          ip: hotspot.ip,
          location: hotspot.location
        },
        remainingCredits: user.credits,
        message: 'Conexión establecida correctamente. Usa las credenciales proporcionadas para conectarte al WiFi.'
      });

    } catch (error) {
      console.error('Error connecting to hotspot:', error);
      res.status(500).json({
        success: false,
        message: 'Error al conectar con el hotspot. Por favor, intenta nuevamente.'
      });
    }
  }

  async getAvailableHotspots(req, res) {
    try {
      const hotspots = await Hotspot.find({ isActive: true })
        .select('name location currentUsers maxUsers lastSync')
        .sort({ name: 1 });

      // Sincronizar usuarios activos para hotspots que no se han sincronizado en los últimos 5 minutos
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const needsSync = hotspots.filter(h => 
        !h.lastSync || h.lastSync < fiveMinutesAgo
      );

      for (const hotspot of needsSync) {
        try {
          await mikrotikManager.syncHotspotUsers(hotspot._id);
        } catch (syncError) {
          console.error(`Error syncing hotspot ${hotspot.name}:`, syncError);
        }
      }

      // Obtener datos actualizados
      const updatedHotspots = await Hotspot.find({ isActive: true })
        .select('name location currentUsers maxUsers')
        .sort({ name: 1 });

      res.json({
        success: true,
        hotspots: updatedHotspots.map(hotspot => ({
          id: hotspot._id,
          name: hotspot.name,
          location: hotspot.location,
          currentUsers: hotspot.currentUsers,
          maxUsers: hotspot.maxUsers,
          available: hotspot.currentUsers < hotspot.maxUsers
        }))
      });
    } catch (error) {
      console.error('Error getting hotspots:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la lista de hotspots.'
      });
    }
  }

  async getHotspotStatus(req, res) {
    try {
      const { hotspotId } = req.params;

      const hotspot = await Hotspot.findById(hotspotId);
      if (!hotspot) {
        return res.status(404).json({
          success: false,
          message: 'Hotspot no encontrado.'
        });
      }

      // Sincronizar estado actual
      const userCount = await mikrotikManager.syncHotspotUsers(hotspotId);
      const activeUsers = await mikrotikManager.getHotspotActiveUsers(hotspotId);

      res.json({
        success: true,
        hotspot: {
          id: hotspot._id,
          name: hotspot.name,
          location: hotspot.location,
          ip: hotspot.ip,
          currentUsers: userCount,
          maxUsers: hotspot.maxUsers,
          isActive: hotspot.isActive,
          lastSync: hotspot.lastSync,
          activeUsers: activeUsers || []
        }
      });
    } catch (error) {
      console.error('Error getting hotspot status:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el estado del hotspot.'
      });
    }
  }

  async disconnectUser(req, res) {
    try {
      const { hotspotId, username } = req.body;

      await mikrotikManager.removeHotspotUser(hotspotId, username);
      
      // Sincronizar contador
      await mikrotikManager.syncHotspotUsers(hotspotId);

      res.json({
        success: true,
        message: 'Usuario desconectado correctamente.'
      });
    } catch (error) {
      console.error('Error disconnecting user:', error);
      res.status(500).json({
        success: false,
        message: 'Error al desconectar al usuario.'
      });
    }
  }
}

module.exports = new MikroTikController();