const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create a Error if user patch update password
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This Routes not for password update. Please use the other / UpdatePassword',
        400,
      ),
    );
  }
  // 2) Filter out unwanted fields names that are not allowed in
  const filterbody = filterObj(req.body, 'name', 'email');
  // 3) Update user document

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filterbody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route not yet defined! please used sign up instead',
  });
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
// Do Not Update Password with this
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
