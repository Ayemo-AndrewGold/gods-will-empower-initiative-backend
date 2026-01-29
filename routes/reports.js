// routes/reports.js - Reports & Analytics Routes
const express = require('express');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const Customer = require('../models/Customer');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Dashboard Overview (Admin only)
router.get('/dashboard', protect, authorize('Admin'), async (req, res) => {
  try {
    // Customer Statistics
    const totalCustomers = await Customer.countDocuments();
    const pendingCustomers = await Customer.countDocuments({ status: 'Pending' });
    const approvedCustomers = await Customer.countDocuments({ status: 'Approved' });
    const activeCustomers = await Customer.countDocuments({ status: 'Active' });
    
    // Loan Statistics
    const totalLoans = await Loan.countDocuments();
    const pendingLoans = await Loan.countDocuments({ status: 'Pending' });
    const activeLoans = await Loan.countDocuments({ status: 'Active' });
    const completedLoans = await Loan.countDocuments({ status: 'Completed' });
    const overdueLoans = await Loan.countDocuments({ status: 'Overdue' });
    
    // Financial Statistics
    const allLoans = await Loan.find({ status: { $in: ['Active', 'Completed', 'Overdue'] } });
    const totalDisbursed = allLoans.reduce((sum, loan) => sum + loan.principalAmount, 0);
    const totalExpectedRepayment = allLoans.reduce((sum, loan) => sum + loan.totalPayable, 0);
    const totalRepaid = allLoans.reduce((sum, loan) => sum + loan.totalPaid, 0);
    const totalOutstanding = allLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
    const totalInterestEarned = allLoans.reduce((sum, loan) => sum + loan.interestPaid, 0);
    
    // Repayment Statistics
    const totalRepayments = await Repayment.countDocuments({ status: 'Approved' });
    const pendingRepayments = await Repayment.countDocuments({ status: 'Pending' });
    
    // User Statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const loanOfficers = await User.countDocuments({ role: 'Loan Officer' });
    
    return res.json({
      success: true,
      data: {
        customers: {
          total: totalCustomers,
          pending: pendingCustomers,
          approved: approvedCustomers,
          active: activeCustomers
        },
        loans: {
          total: totalLoans,
          pending: pendingLoans,
          active: activeLoans,
          completed: completedLoans,
          overdue: overdueLoans
        },
        financial: {
          totalDisbursed,
          totalExpectedRepayment,
          totalRepaid,
          totalOutstanding,
          totalInterestEarned,
          repaymentRate: totalExpectedRepayment > 0 ? ((totalRepaid / totalExpectedRepayment) * 100).toFixed(2) : 0
        },
        repayments: {
          total: totalRepayments,
          pending: pendingRepayments
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          loanOfficers
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Monthly Performance (PRD Section 9.2.A)
router.get('/monthly-performance', protect, authorize('Admin'), async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    const monthlyData = [];
    
    for (let month = 0; month < 12; month++) {
      const startDate = new Date(targetYear, month, 1);
      const endDate = new Date(targetYear, month + 1, 0, 23, 59, 59);
      
      // Loans disbursed in this month
      const disbursedLoans = await Loan.find({
        disbursementDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['Active', 'Completed', 'Overdue'] }
      });
      
      const amountDisbursed = disbursedLoans.reduce((sum, loan) => sum + loan.principalAmount, 0);
      const loansCount = disbursedLoans.length;
      
      // Repayments made in this month
      const repayments = await Repayment.find({
        paymentDate: { $gte: startDate, $lte: endDate },
        status: 'Approved'
      });
      
      const amountRepaid = repayments.reduce((sum, rep) => sum + rep.paymentAmount, 0);
      const interestEarned = repayments.reduce((sum, rep) => sum + rep.interestPaid, 0);
      
      // Outstanding at end of month
      const activeLoansEndMonth = await Loan.find({
        startDate: { $lte: endDate },
        status: { $in: ['Active', 'Overdue'] }
      });
      
      const outstandingAmount = activeLoansEndMonth.reduce((sum, loan) => sum + loan.remainingBalance, 0);
      
      // Overdue count
      const overdueCount = await Loan.countDocuments({
        status: 'Overdue',
        endDate: { $lte: endDate }
      });
      
      monthlyData.push({
        month: month + 1,
        monthName: new Date(targetYear, month).toLocaleString('default', { month: 'long' }),
        year: targetYear,
        amountDisbursed,
        loansCount,
        amountRepaid,
        interestEarned,
        outstandingAmount,
        overdueCount,
        profit: interestEarned
      });
    }
    
    return res.json({
      success: true,
      year: targetYear,
      data: monthlyData
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Product Distribution (PRD Section 9.2.B)
router.get('/product-distribution', protect, authorize('Admin'), async (req, res) => {
  try {
    const monthlyLoans = await Loan.countDocuments({ loanProduct: 'Monthly' });
    const weeklyLoans = await Loan.countDocuments({ loanProduct: 'Weekly' });
    const dailyLoans = await Loan.countDocuments({ loanProduct: 'Daily' });
    
    const monthlyAmount = await Loan.aggregate([
      { $match: { loanProduct: 'Monthly' } },
      { $group: { _id: null, total: { $sum: '$principalAmount' } } }
    ]);
    
    const weeklyAmount = await Loan.aggregate([
      { $match: { loanProduct: 'Weekly' } },
      { $group: { _id: null, total: { $sum: '$principalAmount' } } }
    ]);
    
    const dailyAmount = await Loan.aggregate([
      { $match: { loanProduct: 'Daily' } },
      { $group: { _id: null, total: { $sum: '$principalAmount' } } }
    ]);
    
    const totalLoans = monthlyLoans + weeklyLoans + dailyLoans;
    
    return res.json({
      success: true,
      data: {
        byCount: {
          monthly: {
            count: monthlyLoans,
            percentage: totalLoans > 0 ? ((monthlyLoans / totalLoans) * 100).toFixed(2) : 0
          },
          weekly: {
            count: weeklyLoans,
            percentage: totalLoans > 0 ? ((weeklyLoans / totalLoans) * 100).toFixed(2) : 0
          },
          daily: {
            count: dailyLoans,
            percentage: totalLoans > 0 ? ((dailyLoans / totalLoans) * 100).toFixed(2) : 0
          }
        },
        byAmount: {
          monthly: {
            amount: monthlyAmount.length > 0 ? monthlyAmount[0].total : 0
          },
          weekly: {
            amount: weeklyAmount.length > 0 ? weeklyAmount[0].total : 0
          },
          daily: {
            amount: dailyAmount.length > 0 ? dailyAmount[0].total : 0
          }
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Profit vs Loss (PRD Section 9.2.C)
router.get('/profit-loss', protect, authorize('Admin'), async (req, res) => {
  try {
    const allLoans = await Loan.find({ status: { $in: ['Active', 'Completed', 'Overdue'] } });
    
    // Total Profit (interest earned)
    const totalProfit = allLoans.reduce((sum, loan) => sum + loan.interestPaid, 0);
    
    // Total Expected Interest
    const totalExpectedInterest = allLoans.reduce((sum, loan) => sum + loan.interestAmount, 0);
    
    // Total Loss (defaults and unpaid interest)
    const defaultedLoans = await Loan.find({ status: 'Defaulted' });
    const totalDefaulted = defaultedLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
    
    // Overdue amounts (potential loss)
    const overdueLoans = await Loan.find({ status: 'Overdue' });
    const totalOverdue = overdueLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
    
    const totalLoss = totalDefaulted;
    const potentialLoss = totalOverdue;
    
    return res.json({
      success: true,
      data: {
        profit: {
          total: totalProfit,
          expected: totalExpectedInterest,
          percentage: totalExpectedInterest > 0 ? ((totalProfit / totalExpectedInterest) * 100).toFixed(2) : 0
        },
        loss: {
          total: totalLoss,
          potential: potentialLoss,
          defaultedLoans: defaultedLoans.length,
          overdueLoans: overdueLoans.length
        },
        netProfit: totalProfit - totalLoss,
        profitMargin: (totalProfit + totalLoss) > 0 ? ((totalProfit / (totalProfit + totalLoss)) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Loan Officer Performance (Admin only)
router.get('/officer-performance', protect, authorize('Admin'), async (req, res) => {
  try {
    const loanOfficers = await User.find({ role: 'Loan Officer', isActive: true });
    
    const performance = await Promise.all(
      loanOfficers.map(async (officer) => {
        const customersRegistered = await Customer.countDocuments({ createdBy: officer._id });
        const loansCreated = await Loan.countDocuments({ createdBy: officer._id });
        const activeLoans = await Loan.countDocuments({ createdBy: officer._id, status: 'Active' });
        const completedLoans = await Loan.countDocuments({ createdBy: officer._id, status: 'Completed' });
        
        const officerLoans = await Loan.find({ createdBy: officer._id, status: { $in: ['Active', 'Completed'] } });
        const totalDisbursed = officerLoans.reduce((sum, loan) => sum + loan.principalAmount, 0);
        const totalRepaid = officerLoans.reduce((sum, loan) => sum + loan.totalPaid, 0);
        
        const repaymentsRecorded = await Repayment.countDocuments({ recordedBy: officer._id });
        
        return {
          officer: {
            id: officer._id,
            name: `${officer.firstName} ${officer.lastName}`,
            staffId: officer.staffId,
            email: officer.email
          },
          metrics: {
            customersRegistered,
            loansCreated,
            activeLoans,
            completedLoans,
            totalDisbursed,
            totalRepaid,
            repaymentsRecorded,
            repaymentRate: totalDisbursed > 0 ? ((totalRepaid / totalDisbursed) * 100).toFixed(2) : 0
          }
        };
      })
    );
    
    return res.json({
      success: true,
      count: performance.length,
      data: performance
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Loan Status Breakdown
router.get('/loan-status', protect, authorize('Admin'), async (req, res) => {
  try {
    const statusBreakdown = await Loan.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$principalAmount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    const totalLoans = await Loan.countDocuments();
    
    const data = statusBreakdown.map(item => ({
      status: item._id,
      count: item.count,
      totalAmount: item.totalAmount,
      percentage: totalLoans > 0 ? ((item.count / totalLoans) * 100).toFixed(2) : 0
    }));
    
    return res.json({
      success: true,
      totalLoans,
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Date Range Report (Custom)
router.get('/date-range', protect, authorize('Admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);
    
    // Loans disbursed in date range
    const loansInRange = await Loan.find({
      disbursementDate: { $gte: start, $lte: end }
    }).populate('customer', 'firstName lastName customerId');
    
    const totalDisbursed = loansInRange.reduce((sum, loan) => sum + loan.principalAmount, 0);
    
    // Repayments in date range
    const repaymentsInRange = await Repayment.find({
      paymentDate: { $gte: start, $lte: end },
      status: 'Approved'
    }).populate('customer', 'firstName lastName customerId');
    
    const totalRepaid = repaymentsInRange.reduce((sum, rep) => sum + rep.paymentAmount, 0);
    const totalInterest = repaymentsInRange.reduce((sum, rep) => sum + rep.interestPaid, 0);
    
    // New customers in date range
    const newCustomers = await Customer.countDocuments({
      createdAt: { $gte: start, $lte: end }
    });
    
    return res.json({
      success: true,
      dateRange: {
        start: startDate,
        end: endDate
      },
      data: {
        loans: {
          count: loansInRange.length,
          totalDisbursed,
          list: loansInRange
        },
        repayments: {
          count: repaymentsInRange.length,
          totalRepaid,
          totalInterest,
          list: repaymentsInRange
        },
        newCustomers
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Export Summary (for Excel/PDF generation on frontend)
router.get('/export-summary', protect, authorize('Admin'), async (req, res) => {
  try {
    const customers = await Customer.find().select('customerId firstName lastName phoneNumber status preferredLoanProduct createdAt');
    const loans = await Loan.find().populate('customer', 'firstName lastName customerId').select('loanId loanProduct principalAmount totalPayable totalPaid remainingBalance status disbursementDate');
    const repayments = await Repayment.find({ status: 'Approved' }).populate('customer', 'firstName lastName customerId').select('receiptId paymentAmount interestPaid principalPaid paymentDate paymentMethod');
    
    return res.json({
      success: true,
      data: {
        customers,
        loans,
        repayments,
        generatedAt: new Date()
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