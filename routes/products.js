const express = require('express');
const { body } = require('express-validator');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerProducts
} = require('../controllers/productController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all products (public)
router.get('/', getProducts);

// Get single product (public)
router.get('/:id', getProduct);

// Get seller's products
router.get('/seller/my-products', auth, authorize('seller'), getSellerProducts);

// Create product (sellers only)
router.post('/', auth, authorize('seller'), [
  body('title').optional().notEmpty().withMessage('Product title is required'),
  body('name').optional().notEmpty().withMessage('Product name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('category').notEmpty().withMessage('Category is required'),
  body('stock').optional().isNumeric().withMessage('Stock must be a number'),
  body('stockQuantity').optional().isNumeric().withMessage('Stock quantity must be a number'),
  body('images').isArray({ min: 1 }).withMessage('At least one image is required')
], createProduct);

// Update product (sellers only)
router.put('/:id', auth, authorize('seller'), updateProduct);

// Delete product (sellers only)
router.delete('/:id', auth, authorize('seller'), deleteProduct);

module.exports = router;