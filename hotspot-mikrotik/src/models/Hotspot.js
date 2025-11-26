const mongoose = require('mongoose');

const hotspotSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ip: { type: String, required: true },
  port: { type: Number, default: 8728 },
  username: { type: String, required: true },
  password: { type: String, required: true },
  secret: { type: String, required: true },
  location: String,
  isActive: { type: Boolean, default: true },
  maxUsers: { type: Number, default: 50 },
  currentUsers: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Hotspot', hotspotSchema);
