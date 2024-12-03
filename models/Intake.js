// models/Intake.js
const mongoose = require('mongoose');

const waterIntakeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

waterIntakeSchema.index({ user: 1, date: 1 }, { unique: true });  // Ensure one entry per day per user

const WaterIntake = mongoose.model('WaterIntake', waterIntakeSchema);

module.exports = WaterIntake;
