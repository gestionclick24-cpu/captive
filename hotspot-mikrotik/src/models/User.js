const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, sparse: true },
  appleId: { type: String, sparse: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  credits: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  sessions: [{
    hotspot: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotspot' },
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    dataUsed: { type: Number, default: 0 },
    ipAddress: String
  }],
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }]
});

// Índices para mejor performance
userSchema.index({ googleId: 1 });
userSchema.index({ appleId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: 1 });

module.exports = mongoose.model('User', userSchema);