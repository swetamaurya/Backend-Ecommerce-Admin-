const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Simple file upload handler
const uploadImage = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // For now, we'll accept base64 images and save them as files
    const { imageData, filename } = req.body;
    
    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: 'No image data provided'
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = filename ? path.extname(filename) : '.jpg';
    const uniqueFilename = `product_${timestamp}${fileExtension}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    // Handle base64 data
    if (imageData.startsWith('data:image/')) {
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      fs.writeFileSync(filePath, buffer);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid image format. Please provide base64 image data.'
      });
    }

    // Return the file URL
    const fileUrl = `/uploads/${uniqueFilename}`;
    
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: fileUrl,
        filename: uniqueFilename
      }
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: 'Server error uploading image',
      error: error.message
    });
  }
};

module.exports = {
  uploadImage
};
