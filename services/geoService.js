// Haversine formula to calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

// Calculate delivery fee based on distance
const calculateDeliveryFee = (distance) => {
  const baseFee = 500; // Base fee in Naira
  const perKmRate = 100; // Rate per kilometer
  
  if (distance <= 2) return baseFee;
  return baseFee + ((distance - 2) * perKmRate);
};

// Find nearby riders
const findNearbyRiders = async (latitude, longitude, maxDistance = 10) => {
  const User = require('../models/User');
  
  const riders = await User.find({
    role: 'rider',
    isAvailable: true,
    isActive: true,
    'location.coordinates.latitude': { $exists: true },
    'location.coordinates.longitude': { $exists: true }
  });

  const nearbyRiders = riders.filter(rider => {
    const distance = calculateDistance(
      latitude,
      longitude,
      rider.location.coordinates.latitude,
      rider.location.coordinates.longitude
    );
    return distance <= maxDistance;
  }).map(rider => ({
    ...rider.toObject(),
    distance: calculateDistance(
      latitude,
      longitude,
      rider.location.coordinates.latitude,
      rider.location.coordinates.longitude
    )
  })).sort((a, b) => a.distance - b.distance);

  return nearbyRiders;
};

// Find nearby sellers
const findNearbySellers = async (latitude, longitude, maxDistance = 20) => {
  const User = require('../models/User');
  
  const sellers = await User.find({
    role: 'seller',
    isActive: true,
    'location.coordinates.latitude': { $exists: true },
    'location.coordinates.longitude': { $exists: true }
  });

  const nearbySellers = sellers.filter(seller => {
    const distance = calculateDistance(
      latitude,
      longitude,
      seller.location.coordinates.latitude,
      seller.location.coordinates.longitude
    );
    return distance <= maxDistance;
  }).map(seller => ({
    ...seller.toObject(),
    distance: calculateDistance(
      latitude,
      longitude,
      seller.location.coordinates.latitude,
      seller.location.coordinates.longitude
    )
  })).sort((a, b) => a.distance - b.distance);

  return nearbySellers;
};

// Estimate delivery time based on distance and traffic
const estimateDeliveryTime = (distance, vehicleType = 'motorcycle') => {
  const speeds = {
    motorcycle: 25, // km/h average in city
    bicycle: 15,
    car: 20
  };
  
  const speed = speeds[vehicleType] || speeds.motorcycle;
  const timeInHours = distance / speed;
  const timeInMinutes = Math.ceil(timeInHours * 60);
  
  // Add buffer time for pickup and traffic
  return timeInMinutes + 15;
};

module.exports = {
  calculateDistance,
  calculateDeliveryFee,
  findNearbyRiders,
  findNearbySellers,
  estimateDeliveryTime
};