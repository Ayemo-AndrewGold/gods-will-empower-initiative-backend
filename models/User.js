// models/User.js - User Schema (FIXED VERSION)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['Admin', 'Loan Officer'],
    default: 'Loan Officer',
    required: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  staffId: {
    type: String,
    unique: true,
    sparse: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  branch: {
    type: String,
    default: 'Main Office'
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving - FIXED WITH next() PARAMETER
UserSchema.pre('save', async function(next) {
  try {
    // Hash password if modified
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    
    // Generate Staff ID if not exists
    if (!this.staffId) {
      const count = await this.constructor.countDocuments();
      this.staffId = `STAFF${String(count + 1).padStart(4, '0')}`;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);