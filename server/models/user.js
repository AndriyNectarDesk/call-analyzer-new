const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'user'],
    default: 'user'
  },
  isMasterAdmin: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Hash password if it's new or modified
  if (this.isModified('password')) {
    this.password = bcrypt.hashSync(this.password, 10);
  }
  
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compareSync(candidatePassword, this.password);
};

// Method to check if user is admin (either org admin or master admin)
UserSchema.methods.isAdmin = function() {
  return this.isMasterAdmin || this.role === 'admin';
};

// Method to get full name
UserSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Indexes for faster queries
UserSchema.index({ email: 1 });
UserSchema.index({ organizationId: 1 });
UserSchema.index({ isMasterAdmin: 1 });

// Don't return password in JSON
UserSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', UserSchema); 