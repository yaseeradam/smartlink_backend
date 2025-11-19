const express = require('express');
const path = require('path');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Upload single image
router.post('/single', auth, (req, res) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      fileUrl,
      filename: req.file.filename
    });
  });
});

// Upload multiple images
router.post('/multiple', auth, (req, res) => {
  uploadMultiple(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const fileUrls = req.files.map(file => `/uploads/${file.filename}`);
    res.json({
      success: true,
      fileUrls,
      files: req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        size: file.size
      }))
    });
  });
});

module.exports = router;