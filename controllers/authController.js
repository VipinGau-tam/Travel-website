const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };

  // Cookies setting
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // Remove the password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // Created like this cause role of users can be changed
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
  });
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check the email and password is correct
  if (!email || !password) {
    return next(new AppError('Please provide email and Password ', 400));
  }
  // 2) check if the user exits or password correct
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password ', 401));
  }

  // 3) if everything is okay, send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting Token if there is log in or not
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('please  login in to get the access !', 401));
  }
  // 2) Verification Token
  const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if the user Still exists
  const currentUser = await User.findById(decode.id);
  if (!currentUser) {
    return next(new AppError('The User no longer exists', 401));
  }
  // 4) Check the user change the password
  if (currentUser.changesPasswordAt(decode.iat)) {
    return next(
      new AppError('Password Changed recently. Please log in ! ', 401),
    );
  }
  // GranT access to protected ROuter
  req.user = currentUser;
  next();
});

exports.isLooggedIn = async (req, res, next) => {
  // 1) Getting Token if there is log in or not
  if (req.cookies.jwt) {
    // verify the token
    const decode = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET,
    );

    // 3) Check if the user Still exists
    const currentUser = await User.findById(decode.id);
    if (!currentUser) {
      next();
    }
    // 4) Check the user change the password
    if (currentUser.changesPasswordAt(decode.iat)) {
      return next();
    }
    res.locals.user = currentUser;
    return next();
  }
  next();
};

/// Restrict To the uSer
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Roles are in array ['admin','lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You dont have permission to do this', 403));
    }
    next();
  };
};

// Forget Password
exports.forgetPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user for this email ', 404));
  }
  // Genrate random reset token
  const resetToken = user.createResetTokenPassword();
  await user.save({ validateBeforeSave: false });

  // 3 ) send the email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forget Your Password. Sumbit a patch ${resetURL}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid upto for 10 min)',
      text: message,
    });
    res.status(200).json({
      status: 'success',
      message: 'token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError('there is an error in sending email. Try Again later', 500),
    );
  }
});

/// Reset Password
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashtoken = crypto
    .createHash('sha256')
    .update(req.params.resetToken)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashtoken,
    passwordTokenExpires: { $gt: Date.now() },
  });

  // 2) if token has not expired and there is user . set new user password
  if (!user) {
    return next(new AppError('Token in Inavlid or Has been Expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordTokenExpires = undefined;

  await user.save();
  // 3) Update the password
  //  4) log in the user in send JWt
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get the user from the collection
  const user = await User.findById(req.user.id).select('+password');
  //2) check if Posted current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Invalid password please try again!', 401));
  }
  //3 ) if so update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //4 ) log in the user , send JWt
  createSendToken(user, 200, res);
});

/// ONly for render pages there wiill no pages
