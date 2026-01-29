// routes/loans.js - Loan Routes
const express = require('express');
const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Create new loan application (Loan Officer or Admin)
  router.post('/', protect, async (req, res) => {
    try {
      // Extract ALL fields including calculated ones from frontend
      const { 
        customer, 
        loanProduct, 
        principalAmount, 
        tenure, 
        purpose,
        // IMPORTANT: Accept these calculated fields from frontend
        interestRate,
        interestAmount,
        totalPayable,
        tenureUnit,
        installmentAmount,
        startDate
      } = req.body;
      
      // Verify customer exists and is approved
      const customerDoc = await Customer.findById(customer);
      
      if (!customerDoc) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      
      if (customerDoc.status !== 'Approved') {
        return res.status(400).json({
          success: false,
          message: 'Customer must be approved before applying for a loan'
        });
      }
      
      // Validate tenure based on product (from PRD)
      if (loanProduct === 'Monthly' && tenure > 6) {
        return res.status(400).json({
          success: false,
          message: 'Monthly loan tenure cannot exceed 6 months'
        });
      }
      
      if (loanProduct === 'Weekly' && tenure > 24) {
        return res.status(400).json({
          success: false,
          message: 'Weekly loan tenure cannot exceed 24 weeks'
        });
      }
      
      if (loanProduct === 'Daily' && tenure > 20) {
        return res.status(400).json({
          success: false,
          message: 'Daily loan tenure cannot exceed 20 days'
        });
      }
      
      // IMPORTANT: Include ALL calculated fields in loanData
      const loanData = {
        customer,
        loanProduct,
        principalAmount,
        tenure,
        purpose,
        createdBy: req.user._id,
        // Include calculated fields from frontend
        interestRate,
        interestAmount,
        totalPayable,
        tenureUnit,
        installmentAmount
      };
      
      // Add startDate if provided
      if (startDate) {
        loanData.startDate = startDate;
      }
      
      const loan = await Loan.create(loanData);
      
      await loan.populate('customer', 'firstName lastName customerId phoneNumber');
      await loan.populate('createdBy', 'firstName lastName staffId');
      
      return res.status(201).json({
        success: true,
        message: 'Loan application created successfully',
        data: loan
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

// Get all loans
router.get('/', protect, async (req, res) => {
  try {
    const { status, loanProduct, customerId, search } = req.query;
    
    let query = {};
    
    // If Loan Officer, only show loans they created
    if (req.user.role === 'Loan Officer') {
      query.createdBy = req.user._id;
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by loan product
    if (loanProduct) {
      query.loanProduct = loanProduct;
    }
    
    // Filter by customer ID
    if (customerId) {
      query.customer = customerId;
    }
    
    // Search by loan ID
    if (search) {
      query.loanId = { $regex: search, $options: 'i' };
    }
    
    const loans = await Loan.find(query)
      .populate('customer', 'firstName lastName customerId phoneNumber email')
      .populate('createdBy', 'firstName lastName staffId')
      .populate('approvedBy', 'firstName lastName staffId')
      .populate('disbursedBy', 'firstName lastName staffId')
      .sort('-createdAt');
    
    return res.json({
      success: true,
      count: loans.length,
      data: loans
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single loan
router.get('/:id', protect, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('customer')
      .populate('createdBy', 'firstName lastName staffId')
      .populate('approvedBy', 'firstName lastName staffId')
      .populate('disbursedBy', 'firstName lastName staffId');
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    // If Loan Officer, only allow viewing their own loans
    if (req.user.role === 'Loan Officer' && loan.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this loan'
      });
    }
    
    return res.json({
      success: true,
      data: loan
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update loan (before approval)
router.put('/:id', protect, async (req, res) => {
  try {
    let loan = await Loan.findById(req.params.id);
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    // Only allow updating pending loans
    if (loan.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only update pending loans'
      });
    }
    
    // If Loan Officer, only allow updating their own loans
    if (req.user.role === 'Loan Officer' && loan.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this loan'
      });
    }
    
    // Don't allow updating certain fields
    delete req.body.loanId;
    delete req.body.createdBy;
    delete req.body.approvedBy;
    delete req.body.totalPaid;
    delete req.body.status;
    
    loan = await Loan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('customer');
    
    return res.json({
      success: true,
      message: 'Loan updated successfully',
      data: loan
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Approve loan (Admin only)
router.put('/:id/approve', protect, authorize('Admin'), async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    if (loan.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Loan is already ${loan.status.toLowerCase()}`
      });
    }
    
    loan.status = 'Approved';
    loan.approvedBy = req.user._id;
    loan.approvalDate = Date.now();
    await loan.save();
    
    await loan.populate('customer');
    await loan.populate('approvedBy', 'firstName lastName staffId');
    
    return res.json({
      success: true,
      message: 'Loan approved successfully',
      data: loan
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Reject loan (Admin only)
router.put('/:id/reject', protect, authorize('Admin'), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    const loan = await Loan.findById(req.params.id);
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    if (loan.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Loan is already ${loan.status.toLowerCase()}`
      });
    }
    
    loan.status = 'Rejected';
    loan.rejectionReason = rejectionReason;
    loan.rejectedAt = Date.now();
    await loan.save();
    
    return res.json({
      success: true,
      message: 'Loan rejected',
      data: loan
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Disburse loan (Admin only)
router.put('/:id/disburse', protect, authorize('Admin'), async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    if (loan.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved loans can be disbursed'
      });
    }
    
    loan.status = 'Disbursed';
    loan.disbursedBy = req.user._id;
    loan.disbursementDate = Date.now();
    loan.startDate = Date.now();
    await loan.save();
    
    // After disbursement, activate the loan
    loan.status = 'Active';
    await loan.save();
    
    await loan.populate('customer');
    await loan.populate('disbursedBy', 'firstName lastName staffId');
    
    return res.json({
      success: true,
      message: 'Loan disbursed and activated successfully',
      data: loan
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete loan (Admin only - only pending loans)
router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    if (loan.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete pending loans'
      });
    }
    
    await loan.deleteOne();
    
    return res.json({
      success: true,
      message: 'Loan deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get loan statistics (Admin only)
router.get('/stats/summary', protect, authorize('Admin'), async (req, res) => {
  try {
    const totalLoans = await Loan.countDocuments();
    const pendingLoans = await Loan.countDocuments({ status: 'Pending' });
    const approvedLoans = await Loan.countDocuments({ status: 'Approved' });
    const activeLoans = await Loan.countDocuments({ status: 'Active' });
    const completedLoans = await Loan.countDocuments({ status: 'Completed' });
    const overdueLoans = await Loan.countDocuments({ status: 'Overdue' });
    
    // Calculate total amounts
    const disbursedLoans = await Loan.find({ status: { $in: ['Active', 'Completed', 'Overdue'] } });
    const totalDisbursed = disbursedLoans.reduce((sum, loan) => sum + loan.principalAmount, 0);
    const totalRepaid = disbursedLoans.reduce((sum, loan) => sum + loan.totalPaid, 0);
    const totalOutstanding = disbursedLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
    const totalProfit = disbursedLoans.reduce((sum, loan) => sum + loan.interestPaid, 0);
    
    return res.json({
      success: true,
      data: {
        totalLoans,
        pendingLoans,
        approvedLoans,
        activeLoans,
        completedLoans,
        overdueLoans,
        totalDisbursed,
        totalRepaid,
        totalOutstanding,
        totalProfit
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;