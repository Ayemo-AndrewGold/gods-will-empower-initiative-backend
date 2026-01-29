// models/Repayment.js - Repayment Schema
const mongoose = require('mongoose');

const RepaymentSchema = new mongoose.Schema({
  // Receipt ID (Auto-generated)
  receiptId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Loan Reference
  loan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: [true, 'Loan reference is required']
  },
  
  // Customer Reference
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer reference is required']
  },
  
  // Payment Amount
  paymentAmount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [1, 'Payment amount must be greater than 0']
  },
  
  // Payment Allocation (PRD Section 4: Interest first, then Principal)
  interestPaid: {
    type: Number,
    default: 0
  },
  principalPaid: {
    type: Number,
    default: 0
  },
  
  // Balances After Payment
  remainingInterest: {
    type: Number,
    default: 0
  },
  remainingPrincipal: {
    type: Number,
    default: 0
  },
  remainingBalance: {
    type: Number,
    default: 0
  },
  
  // Payment Details
  paymentDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Mobile Money', 'Cheque'],
    default: 'Cash'
  },
  transactionReference: {
    type: String,
    trim: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  
  // Recorded By (Loan Officer or Admin)
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Approved By (Admin)
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  
  // Rejection Info
  rejectionReason: {
    type: String
  },
  rejectedAt: {
    type: Date
  },
  
  // Notes
  notes: {
    type: String,
    trim: true
  }
  
}, {
  timestamps: true
});

// Generate Receipt ID before saving
RepaymentSchema.pre('save', async function(next) {
  try {
    if (!this.receiptId) {
      const count = await this.constructor.countDocuments();
      this.receiptId = `RCP${String(count + 1).padStart(7, '0')}`;
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Repayment', RepaymentSchema);