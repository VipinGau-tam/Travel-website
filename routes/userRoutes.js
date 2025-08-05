const express = require('express');
const userController = require('../controllers/usercontroller');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

const router = express.Router();

router.get(
  '/me',
  authController.protect,
  userController.getMe,
  userController.getUser,
);

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgetPassword', authController.forgetPassword);
router.patch('/resetPassword/:resetToken', authController.resetPassword);

// Protect all routes after this Middleware
router.use(authController.protect);

router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

router.patch('/updatePassword', authController.updatePassword);

router.use(authController.restrictTo('admin'));
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

// POST  tour/79812af/reviews
// GET   tour/hdanda912/reviews/0991027ads

module.exports = router;
