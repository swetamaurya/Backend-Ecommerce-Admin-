require("dotenv").config();
const express = require("express");
const path = require("path");
// const helmet = require("helmet");
const cors = require("cors");
const connectDB = require("./middilware/db");
// const morgan = require("morgan");
 
const app = express();
// app.use(helmet());
// Enhanced CORS configuration for main website access
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173', 
      'https://royalthread.co.in',
      'https://www.royalthread.co.in',
      // Main site backend domains
      'https://e-commerce-backend-r6s0.onrender.com',
      'http://localhost:8000', // Common main site backend port
      'http://localhost:3001', // Alternative main site port
      // Add your main website domains here
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // For development, allow any localhost origin
      if (origin && origin.includes('localhost')) {
        callback(null, true);
      } else {
        // Allow any onrender.com subdomain for main site
        if (origin && origin.includes('onrender.com')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Cache-Control', 'User-Agent']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// app.use(morgan("dev"));

// Serve static files from uploads directory with proper headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // Set CORS headers for images - Allow all origins for main site access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Accept, User-Agent');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Last-Modified');
    
    // Set cache headers for better performance
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Set proper content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.png':
        res.setHeader('Content-Type', 'image/png');
        break;
      case '.jpg':
      case '.jpeg':
        res.setHeader('Content-Type', 'image/jpeg');
        break;
      case '.gif':
        res.setHeader('Content-Type', 'image/gif');
        break;
      case '.webp':
        res.setHeader('Content-Type', 'image/webp');
        break;
      case '.svg':
        res.setHeader('Content-Type', 'image/svg+xml');
        break;
      default:
        res.setHeader('Content-Type', 'application/octet-stream');
    }
    
    // Add security headers
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
  }
}));

// Routes - Admin only
app.use("/api/auth", require("./router/auth"));
app.use("/api/products", require("./router/product"));
app.use("/api/admin", require("./router/admin"));
app.use("/api/orders", require("./router/order"));
app.use("/api/payments", require("./router/payment"));
app.use("/api/upload", require("./router/upload"));

// Public image serving route (for main site access)
app.get("/api/images/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  // Check if file exists
  if (!require('fs').existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'Image not found',
      filename: filename
    });
  }
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');
  
  // Serve the file
  res.sendFile(filePath);
});
  
app.get("/health", (_req, res) => res.json({ ok: true }));

// Test endpoint to check image serving
app.get("/test-image", (_req, res) => {
  const fs = require('fs');
  const uploadsDir = path.join(__dirname, 'uploads');
  
  try {
    const files = fs.readdirSync(uploadsDir);
    const baseUrl = process.env.BASE_URL || `${_req.protocol}://${_req.get('host')}`;
    
    console.log('=== IMAGE SERVER TEST ===');
    console.log('Uploads directory:', uploadsDir);
    console.log('Files count:', files.length);
    console.log('Files:', files.slice(0, 5));
    
    res.json({
      success: true,
      message: 'Image serving test',
      data: {
        uploadsDir,
        filesCount: files.length,
        files: files.slice(0, 5), // Show first 5 files
        baseUrl: baseUrl,
        imageUrls: {
          static: files.length > 0 ? `${baseUrl}/uploads/${files[0]}` : null,
          api: files.length > 0 ? `${baseUrl}/api/images/${files[0]}` : null,
          upload: files.length > 0 ? `${baseUrl}/api/upload/serve/${files[0]}` : null
        },
        cors: {
          enabled: true,
          allowedOrigins: ['*'],
          methods: ['GET', 'OPTIONS', 'HEAD']
        }
      }
    });
  } catch (error) {
    console.error('Error reading uploads directory:', error);
    res.json({
      success: false,
      message: 'Error reading uploads directory',
      error: error.message
    });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, error: "Internal error" });
});

const PORT = process.env.PORT || 5001;
 
// console.log("Connecting to database:", process.env.MONGO_URI);
connectDB(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`[api] running on :${PORT}`));
});
