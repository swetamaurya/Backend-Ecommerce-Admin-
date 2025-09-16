const express = require('express');
const router = express.Router();
const { uploadImage, serveImage, testImageServing } = require('../controller/uploadController');
const { auth, authorize } = require('../middilware/auth');

// Upload image route (admin only)
router.post('/image', auth(), authorize(['admin']), uploadImage);

// Public image serving route (no auth required)
router.get('/serve/:filename', serveImage);

// Test image serving route (for debugging)
router.get('/test/:filename', testImageServing);

module.exports = router;
