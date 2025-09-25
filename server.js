require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./middilware/db");
 
const app = express();

// Simple CORS configuration - Allow all origins
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use("/api/auth", require("./router/auth"));
app.use("/api/products", require("./router/product"));
app.use("/api/admin", require("./router/admin"));
app.use("/api/dashboard", require("./router/dashboard"));
app.use("/api/orders", require("./router/order"));
app.use("/api/payments", require("./router/payment"));
app.use("/api/upload", require("./router/upload"));
  
app.get("/health", (_req, res) => res.json({ 
  ok: true, 
  message: 'Admin backend is running',
  timestamp: new Date().toISOString(),
  version: '1.0.0'
}));



// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, error: "Internal error" });
});

const PORT = process.env.PORT || 8000;

// Start server
connectDB(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`[api] running on :${PORT}`));
});
