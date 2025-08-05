const mongoose = require('mongoose');
const slugify = require('slugify');
//const User = require('./userModel');
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A Tour name must have less than 40 characters'],
      minlength: [10, 'A tour must have more than 10 characters'],
      //validate: [validator.isAlpha, 'A tour must have a character'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a max Group Size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium , difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'A rating must be above 1 '],
      max: [5, 'A rating must be below 5 '],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },

    price: { type: Number, required: [true, 'A tour must have price'] },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this only point to current document on New Document Creation
          return val < this.price;
        },
        message: 'Discount must be below than price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have descipition'],
    },
    description: { type: String, trim: true },
    imageCover: {
      type: String,
      required: [true, 'A tour must have image Cover'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoLJSOn
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      addres: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: {
      virtuals: true,
    },
    toObject: { virtuals: true },
  },
);

// tourSchema.index({  price: 1});
// for indexing and making query fast READ PERFORMANCE INCREASE
tourSchema.index({ ratingsAverage: -1, price: 1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

// Virtual Properties Does not Save data in database
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// DOCUMENT MIDDLEWARE :- run only before save() and create() method
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChange',
  });
  next();
});

// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.post('save', (doc, next) => {
//   console.log(doc);
//   next();
// });

//tourSchema.pre('find', function (next) {

// Query MiDDDle Ware
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

// tourSchema.post(/^find/, function (docs, next) {
//   console.log(`Query Took:-  ${Date.now() - this.start}, milliseconds`);
//   console.log(docs);
//   next();
// });

// AGGERATION MIDDLEWARE
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
