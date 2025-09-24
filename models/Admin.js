// models/Admin.js - Admin only model
const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, index: true, required: true },
  password: { type: String, required: true }, // Main password field
  passwordHash: { type: String, required: false }, // Optional for backward compatibility
  role: { type: String, default: "admin" },
  mobile: String,
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpiry: { type: Date, default: null },
  otpCode: { type: String, default: null },
  otpExpiry: { type: Date, default: null },
  otpAttempts: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Admin", AdminSchema);
