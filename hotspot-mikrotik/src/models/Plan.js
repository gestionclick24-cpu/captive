const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  days: { type: Number, required: true },
  price: { type: Number, required: true },
  speedLimit: { type: String, default: 'unlimited' },
  dataLimit: { type: Number, default: 0 }, // 0 = ilimitado
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Plan', planSchema);
