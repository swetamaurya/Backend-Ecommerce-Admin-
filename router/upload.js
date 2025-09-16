const express = require('express');
const router = express.Router();
const { uploadImage } = require('../controller/uploadController');
const { auth, authorize } = require('../middilware/auth');

// Upload image route (admin only)
router.post('/image', auth(), authorize(['admin']), uploadImage);

module.exports = router;
