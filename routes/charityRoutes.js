const express = require('express');
const {
  createCharity, getAllCharities, getFeaturedCharity,
  getCharityById, updateCharity, deleteCharity,
  setFeaturedCharity, addEvent, deleteEvent,
  getCharityStats, makeDonation
} = require('../controllers/charityController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Admin
router.post('/', protect, authorize('admin'), createCharity);
router.put('/:id', protect, authorize('admin'), updateCharity);
router.delete('/:id', protect, authorize('admin'), deleteCharity);
router.put('/:id/feature', protect, authorize('admin'), setFeaturedCharity);
router.post('/:id/events', protect, authorize('admin'), addEvent);
router.delete('/:id/events/:eventId', protect, authorize('admin'), deleteEvent);

// Public — specific before parameterized
router.get('/featured', getFeaturedCharity);
router.get('/', getAllCharities);
router.get('/:id/stats', getCharityStats);
router.get('/:id', getCharityById);

// User — with donation validation (item 17)
router.post('/:id/donate', protect, validate('makeDonation'), makeDonation);

module.exports = router;
