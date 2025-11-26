const Hotspot = require('../models/Hotspot');

const validateHotspot = async (req, res, next) => {
  try {
    const { hotspotId } = req.body;

    if (!hotspotId) {
      return res.status(400).json({
        success: false,
        message: 'ID de hotspot es requerido'
      });
    }

    const hotspot = await Hotspot.findById(hotspotId);
    
    if (!hotspot) {
      return res.status(404).json({
        success: false,
        message: 'Hotspot no encontrado'
      });
    }

    if (!hotspot.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Hotspot no está activo'
      });
    }

    req.hotspot = hotspot;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const validateHotspotParams = async (req, res, next) => {
  try {
    const { hotspotId } = req.params;

    if (!hotspotId) {
      return res.status(400).json({
        success: false,
        message: 'ID de hotspot es requerido'
      });
    }

    const hotspot = await Hotspot.findById(hotspotId);
    
    if (!hotspot) {
      return res.status(404).json({
        success: false,
        message: 'Hotspot no encontrado'
      });
    }

    req.hotspot = hotspot;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  validateHotspot,
  validateHotspotParams
};