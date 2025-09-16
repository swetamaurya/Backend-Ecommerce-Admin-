require("dotenv").config();
const express = require("express");
const path = require("path");
// const helmet = require("helmet");
const cors = require("cors");
const connectDB = require("./middilware/db");
// const morgan = require("morgan");
 
const app = express();
// app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// app.use(morgan("dev"));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes - Admin only
app.use("/api/auth", require("./router/auth"));
app.use("/api/products", require("./router/product"));
app.use("/api/admin", require("./router/admin"));
app.use("/api/orders", require("./router/order"));
app.use("/api/payments", require("./router/payment"));
app.use("/api/upload", require("./router/upload"));
  
app.get("/health", (_req, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, error: "Internal error" });
});

const PORT = process.env.PORT || 5000;
 
// console.log("Connecting to database:", process.env.MONGO_URI);
connectDB(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`[api] running on :${PORT}`));
});
