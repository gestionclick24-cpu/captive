const { RouterOSAPI } = require('routeros-client');
const Hotspot = require('../models/Hotspot');
const User = require('../models/User');

class MikroTikManager {
  constructor() {
    this.connections = new Map();
  }

  async getConnection(hotspotId) {
    if (this.connections.has(hotspotId)) {
      return this.connections.get(hotspotId);
    }

    const hotspot = await Hotspot.findById(hotspotId);
    if (!hotspot) {
      throw new Error('Hotspot no encontrado');
    }

    try {
      const conn = new RouterOSAPI({
        host: hotspot.ip,
        user: hotspot.username,
        password: hotspot.password,
        port: hotspot.port || 8728,
        timeout: 30
      });

      await conn.connect();
      this.connections.set(hotspotId, conn);
      
      // Manejar desconexión
      conn.on('close', () => {
        this.connections.delete(hotspotId);
      });

      return conn;
    } catch (error) {
      console.error('Error conectando a MikroTik:', error);
      throw error;
    }
  }

  async addHotspotUser(hotspotId, username, password, profile = 'default', uptime = '1d') {
    const conn = await this.getConnection(hotspotId);
    
    try {
      const response = await conn.write('/ip/hotspot/user/add', [
        `=name=${username}`,
        `=password=${password}`,
        `=profile=${profile}`,
        `=limit-uptime=${uptime}`
      ]);

      return response;
    } catch (error) {
      console.error('Error agregando usuario hotspot:', error);
      throw error;
    }
  }

  async removeHotspotUser(hotspotId, username) {
    const conn = await this.getConnection(hotspotId);
    
    try {
      // Buscar usuario primero
      const users = await conn.write('/ip/hotspot/user/print', [
        `?name=${username}`
      ]);

      if (users && users.length > 0) {
        const response = await conn.write('/ip/hotspot/user/remove', [
          `=.id=${users[0]['.id']}`
        ]);
        return response;
      }
    } catch (error) {
      console.error('Error removiendo usuario hotspot:', error);
      throw error;
    }
  }

  async getHotspotActiveUsers(hotspotId) {
    const conn = await this.getConnection(hotspotId);
    
    try {
      const activeUsers = await conn.write('/ip/hotspot/active/print');
      return activeUsers;
    } catch (error) {
      console.error('Error obteniendo usuarios activos:', error);
      throw error;
    }
  }

  async syncHotspotUsers(hotspotId) {
    const conn = await this.getConnection(hotspotId);
    const hotspot = await Hotspot.findById(hotspotId);
    
    try {
      const activeUsers = await this.getHotspotActiveUsers(hotspotId);
      hotspot.currentUsers = activeUsers.length;
      hotspot.lastSync = new Date();
      await hotspot.save();

      return activeUsers.length;
    } catch (error) {
      console.error('Error sincronizando hotspot:', error);
      throw error;
    }
  }

  async disconnectAll() {
    for (const [hotspotId, conn] of this.connections) {
      try {
        await conn.close();
      } catch (error) {
        console.error(`Error desconectando hotspot ${hotspotId}:`, error);
      }
    }
    this.connections.clear();
  }
}

module.exports = new MikroTikManager();