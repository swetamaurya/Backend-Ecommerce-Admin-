const express = require('express');
const router = express.Router();
const { uploadImage, deleteImage, upload } = require('../controller/uploadController');
const { auth, authorize } = require('../middilware/auth');

// Upload image route (admin only) - supports both file upload and base64
router.post('/image', auth(), authorize(['admin']), upload.single('image'), uploadImage);

// Delete image from Cloudinary (admin only)
router.delete('/image/:publicId', auth(), authorize(['admin']), deleteImage);

module.exports = router;
