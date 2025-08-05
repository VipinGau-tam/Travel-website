const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRoutes = require('./routes/tourRoutes');
const userRoutes = require('./routes/userRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
//SET security HTTP headers

const scriptSrcUrls = [
  'https://api.tiles.mapbox.com/',
  //'https://api.mapbox.com/',
  'https://cdn.jsdelivr.net',
];
const styleSrcUrls = [
  //'https://api.mapbox.com/',
  //'https://api.tiles.mapbox.com/',
  'https://fonts.googleapis.com/',
];
const connectSrcUrls = [
  //'https://api.mapbox.com/',
  'https://a.tiles.mapbox.com/',
  //'https://b.tiles.mapbox.com/',
  'https://events.mapbox.com/',
];
const fontSrcUrls = ['fonts.googleapis.com', 'fonts.gstatic.com'];
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: [],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'self'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", 'blob:'],
      objectSrc: [],
      imgSrc: ["'self'", 'blob:', 'data:'],
      fontSrc: ["'self'", ...fontSrcUrls],
    },
  }),
);

// app.use(helmet());
// Development login
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limiting the request from the user
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this IP, please try again after an hour! ',
});

app.use('/api', limiter);
// Body Parser reading data from the body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Data santization against noSQL query Injection
app.use(mongoSanitize());
// Data Santization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// serving static files
// app.use(express.static(`${__dirname}/public `));

// Test Middlewares
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// Routes
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/reviews', reviewRoutes);

// Handling Unhandled Routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't Find ${req.originalUrl} on this Server`));
});

// Global Error Handiling Middleware
app.use(globalErrorHandler);

// Start The server
module.exports = app;
