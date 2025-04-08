const mongoose = require('mongoose');

const updateSchema = new mongoose.Schema({
  adminName: {
    type: String,
    required: true,
  },
  updateText: {
    type: String,
    required: true,
  },
  postedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Update', updateSchema);
