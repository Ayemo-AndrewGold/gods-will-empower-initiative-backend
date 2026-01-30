// models/Customer.js - Customer Schema
const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  // Basic Information
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
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  
  // Customer Type
  customerType: {
    type: String,
    enum: ['Individual', 'Group'],
    required: true,
    default: 'Individual'
  },
  
  // Loan Product Preferences
  preferredLoanProduct: {
    type: String,
    enum: ['Monthly', 'Weekly', 'Daily'],
    required: [true, 'Preferred loan product is required']
  },
  
  // Group Information (for Group customers)
  groupName: {
    type: String,
    trim: true
  },
  
  // Union Leader & Secretary (for Weekly loans)
  unionLeader: {
    name: String,
    phoneNumber: String,
    address: String
  },
  unionSecretary: {
    name: String,
    phoneNumber: String,
    address: String
  },
  
  // Group Leader (for Daily group loans)
  groupLeader: {
    name: String,
    phoneNumber: String,
    address: String
  },
  
  // Group Members (for group loans)
  groupMembers: [{
    name: {
      type: String,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      trim: true
    }
  }],
  
  // Identification
  idType: {
    type: String,
    enum: ['National ID', 'Passport', 'Driver License', 'Voter Card'],
    required: [true, 'ID type is required']
  },
  idNumber: {
    type: String,
    required: [true, 'ID number is required'],
    trim: true
  },
  
  // Business Information
  businessName: {
    type: String,
    trim: true
  },
  businessType: {
    type: String,
    trim: true
  },
  businessAddress: {
    type: String,
    trim: true
  },
  
  // Next of Kin
  nextOfKin: {
    name: {
      type: String,
      required: [true, 'Next of kin name is required'],
      trim: true
    },
    relationship: {
      type: String,
      required: [true, 'Next of kin relationship is required'],
      trim: true
    },
    phoneNumber: {
      type: String,
      required: [true, 'Next of kin phone number is required'],
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  
  // Documents
  documents: [{
    documentType: {
      type: String,
      enum: ['ID Card', 'Passport Photo', 'Utility Bill', 'Business Registration', 'Other']
    },
    documentUrl: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Customer Status
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Active', 'Inactive'],
    default: 'Pending'
  },
  
  // Customer ID (Auto-generated)
  customerId: {
    type: String,
    unique: true,
    sparse: true
  },
  
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

// Generate Customer ID before saving
CustomerSchema.pre('save', async function(next) {
  try {
    if (!this.customerId) {
      // Find the customer with the highest customerId
      const lastCustomer = await this.constructor
        .findOne({}, { customerId: 1 })
        .sort({ customerId: -1 })
        .lean();

      let nextNumber = 1;
      
      if (lastCustomer && lastCustomer.customerId) {
        // Extract the number from "CUST00010" -> 10
        const lastNumber = parseInt(lastCustomer.customerId.replace('CUST', ''));
        nextNumber = lastNumber + 1;
      }

      this.customerId = `CUST${String(nextNumber).padStart(5, '0')}`;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual for full name
CustomerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON
CustomerSchema.set('toJSON', { virtuals: true });
CustomerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Customer', CustomerSchema);