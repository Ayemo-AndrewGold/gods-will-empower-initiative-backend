// models/Loan.js - Loan Schema
const mongoose = require('mongoose');

const LoanSchema = new mongoose.Schema({
  // Loan ID (Auto-generated)
  loanId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Customer Reference
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  
  // Loan Product Type
  loanProduct: {
    type: String,
    enum: ['Monthly', 'Weekly', 'Daily'],
    required: [true, 'Loan product is required']
  },
  
  // Principal Amount
  principalAmount: {
    type: Number,
    required: [true, 'Principal amount is required'],
    min: [1000, 'Minimum loan amount is ₦1,000']
  },
  
  // Interest Rate (Auto-set based on product)
  interestRate: {
    type: Number,
    required: true
  },
  
  // Calculated Fields
  interestAmount: {
    type: Number,
    required: true
  },
  totalPayable: {
    type: Number,
    required: true
  },
  
  // Tenure
  tenure: {
    type: Number,
    required: [true, 'Tenure is required']
  },
  tenureUnit: {
    type: String,
    enum: ['days', 'weeks', 'months'],
    required: true
  },
  
  // Installment
  installmentAmount: {
    type: Number,
    required: true
  },
  
  // Dates
  applicationDate: {
    type: Date,
    default: Date.now
  },
  approvalDate: {
    type: Date
  },
  disbursementDate: {
    type: Date
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  
  // Payment Tracking
  totalPaid: {
    type: Number,
    default: 0
  },
  interestPaid: {
    type: Number,
    default: 0
  },
  principalPaid: {
    type: Number,
    default: 0
  },
  remainingBalance: {
    type: Number
  },
  
  // Status
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Disbursed', 'Active', 'Completed', 'Overdue', 'Defaulted'],
    default: 'Pending'
  },
  
  // Purpose
  purpose: {
    type: String,
    trim: true
  },
  
  // Documents
  documents: [{
    documentType: String,
    documentUrl: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Created By (Loan Officer)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Approved By (Admin)
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Disbursed By (Admin)
  disbursedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Generate Loan ID before saving
LoanSchema.pre('save', async function(next) {
  try {
    // Generate loanId if it doesn't exist
    if (!this.loanId) {
      const count = await this.constructor.countDocuments();
      this.loanId = `LOAN${String(count + 1).padStart(6, '0')}`;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Calculate interest, total payable, and installment before saving
LoanSchema.pre('save', function(next) {
  try {
    // Only set interest rate and tenure unit if not already provided
    if (!this.interestRate) {
      switch (this.loanProduct) {
        case 'Monthly':
          this.interestRate = 25;
          if (!this.tenureUnit) this.tenureUnit = 'months';
          break;
        case 'Weekly':
          this.interestRate = 27;
          if (!this.tenureUnit) this.tenureUnit = 'weeks';
          break;
        case 'Daily':
          this.interestRate = 18;
          if (!this.tenureUnit) this.tenureUnit = 'days';
          break;
      }
    }
    
    // Only calculate if not already provided
    if (!this.interestAmount) {
      this.interestAmount = this.principalAmount * (this.interestRate / 100);
    }
    
    if (!this.totalPayable) {
      this.totalPayable = this.principalAmount + this.interestAmount;
    }
    
    if (!this.installmentAmount) {
      this.installmentAmount = this.totalPayable / this.tenure;
    }
    
    // Calculate remaining balance
    this.remainingBalance = (this.totalPayable || 0) - (this.totalPaid || 0);
    
    // Calculate end date if start date exists
    if (this.startDate && !this.endDate) {
      const start = new Date(this.startDate);
      switch (this.tenureUnit) {
        case 'days':
          this.endDate = new Date(start.setDate(start.getDate() + this.tenure));
          break;
        case 'weeks':
          this.endDate = new Date(start.setDate(start.getDate() + (this.tenure * 7)));
          break;
        case 'months':
          this.endDate = new Date(start.setMonth(start.getMonth() + this.tenure));
          break;
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check if loan is overdue
LoanSchema.methods.checkOverdue = function() {
  if (this.status === 'Active' && this.endDate && new Date() > this.endDate) {
    if (this.remainingBalance > 0) {
      return true;
    }
  }
  return false;
};

// Virtual for progress percentage
LoanSchema.virtual('progressPercentage').get(function() {
  if (this.totalPayable === 0) return 0;
  return ((this.totalPaid / this.totalPayable) * 100).toFixed(2);
});

// Ensure virtuals are included in JSON
LoanSchema.set('toJSON', { virtuals: true });
LoanSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Loan', LoanSchema);