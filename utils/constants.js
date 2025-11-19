const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

const USER_ROLES = {
  BUYER: 'buyer',
  SELLER: 'seller',
  RIDER: 'rider'
};

const PRODUCT_CATEGORIES = [
  'electronics',
  'fashion',
  'food',
  'home',
  'books',
  'sports',
  'beauty',
  'automotive'
];

const VEHICLE_TYPES = [
  'motorcycle',
  'bicycle',
  'car'
];

const PAYMENT_METHODS = [
  'card',
  'transfer',
  'cash_on_delivery'
];

module.exports = {
  ORDER_STATUS,
  PAYMENT_STATUS,
  USER_ROLES,
  PRODUCT_CATEGORIES,
  VEHICLE_TYPES,
  PAYMENT_METHODS
};