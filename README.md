# SmartLink Backend API

MERN stack backend for SmartLink multi-marketplace and delivery platform.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Start development server
npm run dev

# Start production server
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (sellers)
- `PUT /api/products/:id` - Update product (sellers)
- `DELETE /api/products/:id` - Delete product (sellers)

### Orders
- `POST /api/orders` - Create order (buyers)
- `GET /api/orders` - Get orders (role-based)
- `GET /api/orders/:id` - Get single order
- `PUT /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id/assign-rider` - Assign rider (sellers)

### Riders
- `GET /api/riders/available` - Get available riders
- `PUT /api/riders/availability` - Update availability
- `GET /api/riders/deliveries` - Get rider deliveries
- `GET /api/riders/earnings` - Get rider earnings

### Users
- `PUT /api/users/profile` - Update profile
- `GET /api/users/:id` - Get user by ID

## Real-time Features

Socket.io events:
- `orderStatusUpdate` - Order status changes
- `updateLocation` - Rider location updates
- `newOrder` - New order notifications
- `sendMessage` - Chat messages

## Environment Variables

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smartlink
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
```

## Database Models

- **User** - Buyers, sellers, and riders
- **Product** - Product listings with categories
- **Order** - Orders with tracking and status

## Tech Stack

- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- Socket.io for real-time features
- bcryptjs for password hashing