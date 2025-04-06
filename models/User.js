const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'username is required'],
    trim: true,
    unique: true, // ensure username is unique
  },
  name: {
    type: String
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  }
});

module.exports = mongoose.model('User', userSchema);
