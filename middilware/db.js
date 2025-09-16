require("dotenv").config();
const mongoose = require('mongoose');

const connectDB = async (uri) => {
  const mongoUri = uri || process.env.MONGODB_URI 
  if (!mongoUri) {
    console.error("MongoDB URI not provided in environment variables");
    return;
  }
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    // No process.exit here, so process continues running
  }
};

module.exports = connectDB;
