const express = require('express');
const router = express.Router();
const productController = require('../controller/productController');
// const { auth, authorize } = require('../middilware/auth'); // Commented out for now

// ---------------- Admin routes only ----------------
// Get all products
router.get('/getAll', productController.getAllProducts);

// Get product by ID
router.get('/:id', productController.getProductById);

// Create/Update/Delete products (admin only)
router.post('/create', productController.createProduct);
router.put('/update/:id', productController.updateProduct);
router.delete('/delete/:id', productController.deleteProduct);

module.exports = router;
