const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getProfile, updateProfile, addAddress, deleteAddress } = require('../controllers/userController');

router.use(auth);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/addresses', addAddress);
router.delete('/addresses/:id', deleteAddress);

module.exports = router;
