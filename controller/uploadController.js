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
      
      try {
        fs.writeFileSync(filePath, buffer);
        console.log('Image file written successfully:', filePath);
      } catch (writeError) {
        console.error('Error writing image file:', writeError);
        return res.status(500).json({
          success: false,
          message: 'Error saving image file',
          error: writeError.message
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid image format. Please provide base64 image data.'
      });
    }

    // Return the file URL
    const fileUrl = `/uploads/${uniqueFilename}`;
    
    // Clean BASE_URL to ensure no trailing slash
    const baseUrl = (process.env.BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
    
    console.log('=== IMAGE UPLOAD DEBUG ===');
    console.log('File saved to:', filePath);
    console.log('File URL:', fileUrl);
    console.log('Base URL from env:', process.env.BASE_URL);
    console.log('Cleaned baseUrl:', baseUrl);
    console.log('Full URL would be:', `${baseUrl}${fileUrl}`);
    
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: fileUrl,
        filename: uniqueFilename,
        fullUrl: `${baseUrl}${fileUrl}`
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

// Serve image file directly (public endpoint)
const serveImage = async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Log main site access
    const userAgent = req.get('User-Agent') || 'Unknown';
    const origin = req.get('Origin') || 'Direct';
    console.log(`[IMAGE SERVE] ${filename} - Origin: ${origin} - UserAgent: ${userAgent}`);
    
    // Validate filename to prevent directory traversal attacks
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }
    
    const filePath = path.join(uploadsDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Image file not found'
      });
    }
    
    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const ext = path.extname(filename).toLowerCase();
    
    // Validate file extension
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported file type'
      });
    }
    
    // Set appropriate content type
    let contentType = 'image/jpeg'; // default
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
    }
    
    // Set headers for proper image serving
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year cache
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (streamError) => {
      console.error('Error streaming file:', streamError);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error reading image file',
          error: streamError.message
        });
      }
    });
    
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving image:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error serving image',
        error: error.message
      });
    }
  }
};

// Test image serving endpoint
const testImageServing = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Image file not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Image file exists and can be served',
      data: {
        filename,
        filePath,
        url: `/uploads/${filename}`,
        fullUrl: `${process.env.BASE_URL || 'http://localhost:8000'}/uploads/${filename}`
      }
    });
  } catch (error) {
    console.error('Error testing image serving:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing image serving',
      error: error.message
    });
  }
};

module.exports = {
  uploadImage,
  serveImage,
  testImageServing
};
