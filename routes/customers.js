// routes/customers.js - Customer Routes
const express = require('express');
const Customer = require('../models/Customer');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Register new customer (Loan Officer or Admin)
router.post('/', protect, async (req, res) => {
  try {
    const customerData = {
      ...req.body,
      createdBy: req.user._id
    };

    const customer = await Customer.create(customerData);

    return res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: customer
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all customers
router.get('/', protect, async (req, res) => {
  try {
    const { status, customerType, preferredLoanProduct, search } = req.query;

    let query = {};

    // If Loan Officer, only show customers they created
    if (req.user.role === 'Loan Officer') {
      query.createdBy = req.user._id;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by customer type
    if (customerType) {
      query.customerType = customerType;
    }

    // Filter by loan product
    if (preferredLoanProduct) {
      query.preferredLoanProduct = preferredLoanProduct;
    }

    // Search by name, email, phone, or customer ID
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await Customer.find(query)
      .populate('createdBy', 'firstName lastName email staffId')
      .populate('approvedBy', 'firstName lastName email staffId')
      .sort('-createdAt');

    return res.json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single customer
router.get('/:id', protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email staffId')
      .populate('approvedBy', 'firstName lastName email staffId');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // If Loan Officer, only allow viewing their own customers
    if (req.user.role === 'Loan Officer' && customer.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this customer'
      });
    }

    return res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update customer
router.put('/:id', protect, async (req, res) => {
  try {
    let customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // If Loan Officer, only allow updating their own customers
    if (req.user.role === 'Loan Officer' && customer.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this customer'
      });
    }

    // Don't allow updating certain fields
    delete req.body.customerId;
    delete req.body.createdBy;
    delete req.body.approvedBy;
    delete req.body.approvedAt;

    customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    return res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Approve customer (Admin only)
router.put('/:id/approve', protect, authorize('Admin'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    if (customer.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Customer is already ${customer.status.toLowerCase()}`
      });
    }

    customer.status = 'Approved';
    customer.approvedBy = req.user._id;
    customer.approvedAt = Date.now();
    await customer.save();

    await customer.populate('createdBy', 'firstName lastName email');
    await customer.populate('approvedBy', 'firstName lastName email');

    return res.json({
      success: true,
      message: 'Customer approved successfully',
      data: customer
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Reject customer (Admin only)
router.put('/:id/reject', protect, authorize('Admin'), async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    if (customer.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Customer is already ${customer.status.toLowerCase()}`
      });
    }

    customer.status = 'Rejected';
    customer.rejectionReason = rejectionReason;
    customer.rejectedAt = Date.now();
    await customer.save();

    return res.json({
      success: true,
      message: 'Customer rejected',
      data: customer
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete customer (Admin only)
router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// Get customer statistics (Admin only)
router.get('/stats/summary', protect, authorize('Admin'), async (req, res) => {
  try {
    const totalCustomers = await Customer.countDocuments();
    const pendingCustomers = await Customer.countDocuments({ status: 'Pending' });
    const approvedCustomers = await Customer.countDocuments({ status: 'Approved' });
    const rejectedCustomers = await Customer.countDocuments({ status: 'Rejected' });
    const individualCustomers = await Customer.countDocuments({ customerType: 'Individual' });
    const groupCustomers = await Customer.countDocuments({ customerType: 'Group' });

    return res.json({
      success: true,
      data: {
        totalCustomers,
        pendingCustomers,
        approvedCustomers,
        rejectedCustomers,
        individualCustomers,
        groupCustomers
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