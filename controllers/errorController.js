const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}:  ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateErrorDB = (err) => {
  const value = err.message.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
  const message = `Duplicate field Value: ${value} please enter another value`;
  return new AppError(message, 400);
};

const handleFieldsErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid Input Data :- ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJwtError = () =>
  new AppError('Invalid Token. Please login again !', 401);

const handleTokenExpire = () =>
  new AppError('Your Token is been Expired. Please login again.', 401);

const sendErrorDev = (err, res, req) => {
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
      status: err.status,
      err: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong',
      msg: err.message,
    });
  }
};
const sendErrorPro = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    // Operational Error
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
      // Programming error or other error
    } else {
      // 1) Log the error
      console.log('Error 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went Very Wrong',
      });
    }
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res, req);
  } else if (process.env.NODE_ENV === 'production') {
    if (err.name === 'CastError') err = handleCastErrorDB(err);
    if (err.code === 11000) err = handleDuplicateErrorDB(err);
    if (err.name === 'ValidationError') err = handleFieldsErrorDB(err);
    if (err.name === 'JsonWebTokenError') err = handleJwtError();
    if (err.name === 'TokenExpiredError') err = handleTokenExpire();
    sendErrorPro(err, req, res);
  }
};
