const Product = require('../models/Product');
const { validationResult } = require('express-validator');

const getProducts = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10, sortBy = 'createdAt' } = req.query;
    
    const query = { isActive: true };
    
    if (category) query.category = category;
    if (search) query.$text = { $search: search };

    const products = await Product.find(query)
      .populate('seller', 'name businessName location')
      .sort({ [sortBy]: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    const protocol = req.protocol;
    const host = req.get('host');
    const productsWithFullUrls = products.map(product => {
      const productObj = product.toObject();
      productObj.images = productObj.images.map(img => 
        img.startsWith('http') ? img : `${protocol}://${host}${img.startsWith('/') ? '' : '/'}${img}`
      );
      return productObj;
    });

    res.json({
      success: true,
      products: productsWithFullUrls,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name businessName location phone');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const protocol = req.protocol;
    const host = req.get('host');
    const productObj = product.toObject();
    productObj.images = productObj.images.map(img => 
      img.startsWith('http') ? img : `${protocol}://${host}${img.startsWith('/') ? '' : '/'}${img}`
    );

    res.json({ success: true, product: productObj });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const productData = {
      ...req.body,
      seller: req.user.id
    };

    const product = await Product.create(productData);
    await product.populate('seller', 'name businessName');

    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ 
      success: false,
      message: error.message,
      details: error.name === 'ValidationError' ? error.errors : undefined
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('seller', 'name businessName');

    res.json({ success: true, product: updatedProduct });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user.id })
      .sort({ createdAt: -1 });
    
    const protocol = req.protocol;
    const host = req.get('host');
    const productsWithFullUrls = products.map(product => {
      const productObj = product.toObject();
      productObj.images = productObj.images.map(img => 
        img.startsWith('http') ? img : `${protocol}://${host}${img.startsWith('/') ? '' : '/'}${img}`
      );
      return productObj;
    });
    
    res.json({ success: true, products: productsWithFullUrls });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerProducts
};