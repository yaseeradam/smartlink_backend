const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testAPI() {
  try {
    console.log('🚀 Testing SmartLink API...\n');

    // 1. Health Check
    console.log('1. Health Check...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health:', health.data);

    // 2. Register Seller
    console.log('\n2. Registering Seller...');
    const sellerData = {
      name: 'Test Seller',
      email: 'seller@test.com',
      password: '123456',
      phone: '08012345678',
      role: 'seller',
      businessName: 'Test Store'
    };
    
    const seller = await axios.post(`${BASE_URL}/auth/register`, sellerData);
    console.log('✅ Seller registered:', seller.data.user.name);
    const sellerToken = seller.data.token;

    // 3. Create Product
    console.log('\n3. Creating Product...');
    const productData = {
      name: 'Test iPhone',
      description: 'Amazing phone for testing',
      price: 450000,
      category: 'electronics',
      stock: 5,
      images: ['https://via.placeholder.com/300x300']
    };

    const product = await axios.post(`${BASE_URL}/products`, productData, {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });
    console.log('✅ Product created:', product.data.product.name);

    // 4. Get Products
    console.log('\n4. Getting Products...');
    const products = await axios.get(`${BASE_URL}/products`);
    console.log('✅ Products found:', products.data.products.length);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAPI();