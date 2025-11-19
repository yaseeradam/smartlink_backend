const express = require('express');
const { body } = require('express-validator');
const {
  createCluster,
  getClusters,
  getCluster,
  updateCluster,
  addMember,
  removeMember,
  assignOrderToCluster,
  getClusterStats
} = require('../controllers/clusterController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all clusters (public)
router.get('/', getClusters);

// Get single cluster (public)
router.get('/:id', getCluster);

// Get cluster stats
router.get('/:id/stats', auth, getClusterStats);

// Create cluster (riders only)
router.post('/', auth, authorize('rider'), [
  body('name').notEmpty().withMessage('Cluster name is required'),
  body('location.address').notEmpty().withMessage('Location is required'),
  body('serviceAreas').isArray({ min: 1 }).withMessage('At least one service area is required')
], createCluster);

// Update cluster (leader only)
router.put('/:id', auth, authorize('rider'), updateCluster);

// Add member to cluster (leader only)
router.post('/:id/members', auth, authorize('rider'), [
  body('riderId').notEmpty().withMessage('Rider ID is required')
], addMember);

// Remove member from cluster (leader only)
router.delete('/:id/members', auth, authorize('rider'), [
  body('riderId').notEmpty().withMessage('Rider ID is required')
], removeMember);

// Assign order to cluster (sellers only)
router.post('/:id/assign-order', auth, authorize('seller'), [
  body('orderId').notEmpty().withMessage('Order ID is required')
], assignOrderToCluster);

module.exports = router;