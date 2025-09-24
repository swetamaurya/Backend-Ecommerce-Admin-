const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, index: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: "user" },
  mobile: String,
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  preferences: {
    newsletter: { type: Boolean, default: false },
    notifications: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
