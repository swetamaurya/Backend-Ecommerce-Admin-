const express = require('express');
const router = express.Router();
const productController = require('../controller/productController');
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
