const express = require('express');
const router = express.Router();
const productController = require('../controller/productController');
const { serveImage } = require('../controller/uploadController');
const { auth, authorize } = require('../middilware/auth');

// Debug route to test authentication
router.get('/debug-auth', auth(), authorize(['admin']), (req, res) => {
  res.json({
    success: true,
    message: 'Authentication successful',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// ---------------- Public routes for main website ----------------
// Get all active products (public - no auth required)
router.get('/public/all', productController.getPublicProducts);

// Get product by ID (public - no auth required)  
router.get('/public/:id', productController.getPublicProductById);

// Get products by category (public - no auth required)
router.get('/public/category/:category', productController.getProductsByCategory);

// Serve product images (public - no auth required)
router.get('/image/:filename', serveImage);

// ---------------- Admin routes only ----------------
// Get all products (admin only)
router.get('/getAll', auth(), authorize(['admin']), productController.getAllProducts);

// Get product by ID (admin only)
router.get('/:id', auth(), authorize(['admin']), productController.getProductById);

// Create/Update/Delete products (admin only)
router.post('/create', auth(), authorize(['admin']), productController.createProduct);
router.put('/update/:id', auth(), authorize(['admin']), productController.updateProduct);
router.delete('/delete/:id', auth(), authorize(['admin']), productController.deleteProduct);

module.exports = router;
