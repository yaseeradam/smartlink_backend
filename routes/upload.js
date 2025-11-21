const express = require('express');
const multer = require('multer');
const path = require('path');
const { auth } = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    } else {
      cb(new Error(`Only image files are allowed. Received: ${file.mimetype}`));
    }
  }
});

// Single file upload
router.post('/single', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'smartlink' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      fileUrl: result.secure_url,
      filename: result.public_id
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Multiple files upload
router.post('/multiple', auth, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No files uploaded' 
      });
    }

    console.log(`Uploading ${req.files.length} files to Cloudinary`);

    // Upload all files to Cloudinary
    const uploadPromises = req.files.map((file, index) => {
      return new Promise((resolve, reject) => {
        console.log(`Uploading file ${index + 1}: ${file.originalname}`);
        cloudinary.uploader.upload_stream(
          { folder: 'smartlink' },
          (error, result) => {
            if (error) {
              console.error(`Upload error for file ${index + 1}:`, error);
              reject(error);
            } else {
              console.log(`File ${index + 1} uploaded: ${result.secure_url}`);
              resolve(result.secure_url);
            }
          }
        ).end(file.buffer);
      });
    });

    const fileUrls = await Promise.all(uploadPromises);
    
    res.json({
      success: true,
      message: 'Files uploaded successfully',
      fileUrls: fileUrls
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Upload failed'
    });
  }
});

module.exports = router;