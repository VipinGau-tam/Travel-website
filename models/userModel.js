const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please Tell your name'],
  },
  email: {
    type: String,
    required: [true, 'Please Provide your Email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid Email'],
  },
  photo: { type: String },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please provide a password'],
    validate: {
      // THIS WORK  ONLY work on create & SAVE !!!
      validator: function (el) {
        return el === this.password;
      },
      message: 'Password are not the Same!!',
    },
  },
  passwordChange: Date,
  passwordResetToken: String,
  passwordTokenExpires: Date,
  active: { type: Boolean, default: true, select: false },
});

userSchema.pre('save', async function (next) {
  //Only run this function if password is actually modified
  if (!this.isModified('password')) return next();
  //Hash the password
  this.password = await bcrypt.hash(this.password, 12);
  // delete the password confirm
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChange = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changesPasswordAt = function (JWTTimestamp) {
  if (this.passwordChange) {
    const changeTimeStamp = parseInt(this.passwordChange.getTime() / 1000, 10);
    return JWTTimestamp < changeTimeStamp;
  }
  // False means not change in password
  return false;
};

// forget password
userSchema.methods.createResetTokenPassword = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  //console.log({ resetToken }, this.passwordResetToken);

  this.passwordTokenExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
