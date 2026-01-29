// routes/repayments.js
const express = require('express');
const Repayment = require('../models/Repayment');
const Loan = require('../models/Loan');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Record new repayment
router.post('/', protect, async (req, res) => {
  try {
    const { loan, paymentAmount, paymentMethod, transactionReference, notes } = req.body;

    if (!loan || !paymentAmount) {
      return res.status(400).json({
        success: false,
        message: 'Loan and paymentAmount are required',
      });
    }

    const loanDoc = await Loan.findById(loan).populate('customer');
    if (!loanDoc) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
      });
    }

    // Calculate new balances
    const newTotalPaid = (loanDoc.totalPaid || 0) + Number(paymentAmount);
    const remainingBalance = (loanDoc.totalPayable || 0) - newTotalPaid;

    // Create repayment
    let repayment = await Repayment.create({
      loan,
      customer: loanDoc.customer._id,
      paymentAmount,
      paymentMethod,
      transactionReference,
      remainingBalance,
      recordedBy: req.user._id,
      notes,
    });

    // Update loan
    loanDoc.totalPaid = newTotalPaid;
    loanDoc.remainingBalance = remainingBalance;
    await loanDoc.save();

    // ✅ single populate call for frontend
    await repayment.populate([
      { path: 'loan', select: 'loanId loanProduct remainingBalance' },
      { path: 'customer', select: 'firstName lastName customerId phoneNumber' },
    ]);

return res.status(201).json({
  success: true,
  message: 'Repayment recorded successfully',
  data: repayment,
});

    return res.status(201).json({
      success: true,
      message: 'Repayment recorded successfully',
      data: repayment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get all repayments
router.get('/', protect, async (req, res) => {
  try {
    const repayments = await Repayment.find()
      .populate('loan', 'loanId loanProduct remainingBalance')
      .populate('customer', 'firstName lastName customerId phoneNumber')
      .sort('-createdAt');

    return res.json({
      success: true,
      count: repayments.length,
      data: repayments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;




// // Record new repayment
// router.post('/', protect, async (req, res) => {
//   try {
//     const { 
//       loan, 
//       paymentAmount, 
//       interestPortion, // from frontend
//       principalPortion, // from frontend
//       paymentMethod, 
//       transactionReference, 
//       notes 
//     } = req.body;

//     if (!loan || !paymentAmount) {
//       return res.status(400).json({
//         success: false,
//         message: 'Loan and paymentAmount are required',
//       });
//     }

//     // Get loan with customer populated
//     const loanDoc = await Loan.findById(loan).populate('customer');
//     if (!loanDoc) {
//       return res.status(404).json({
//         success: false,
//         message: 'Loan not found',
//       });
//     }

//     // Get current loan balances
//     const totalPayable = loanDoc.totalPayable || 0;
//     const totalPaid = loanDoc.totalPaid || 0;
//     const interestAmount = loanDoc.interestAmount || 0;
//     const principalAmount = loanDoc.principalAmount || 0;
//     const interestPaidSoFar = loanDoc.interestPaid || Math.min(totalPaid, interestAmount);
//     const principalPaidSoFar = loanDoc.principalPaid || Math.max(0, totalPaid - interestAmount);

//     // Calculate remaining amounts
//     const remainingInterest = Math.max(0, interestAmount - interestPaidSoFar);
//     const remainingPrincipal = Math.max(0, principalAmount - principalPaidSoFar);
//     const currentBalance = totalPayable - totalPaid;

//     // Validate payment amount doesn't exceed balance
//     if (Number(paymentAmount) > currentBalance) {
//       return res.status(400).json({
//         success: false,
//         message: `Payment amount (${paymentAmount}) exceeds remaining balance (${currentBalance})`,
//       });
//     }

//     // Calculate allocation: interest first, then principal
//     let calculatedInterestPortion = 0;
//     let calculatedPrincipalPortion = 0;

//     if (remainingInterest > 0) {
//       calculatedInterestPortion = Math.min(Number(paymentAmount), remainingInterest);
//       calculatedPrincipalPortion = Math.min(Number(paymentAmount) - calculatedInterestPortion, remainingPrincipal);
//     } else {
//       calculatedPrincipalPortion = Math.min(Number(paymentAmount), remainingPrincipal);
//     }

//     // Use calculated values (backend is source of truth)
//     const finalInterestPortion = calculatedInterestPortion;
//     const finalPrincipalPortion = calculatedPrincipalPortion;

//     // Calculate new balances
//     const newTotalPaid = totalPaid + Number(paymentAmount);
//     const newInterestPaid = interestPaidSoFar + finalInterestPortion;
//     const newPrincipalPaid = principalPaidSoFar + finalPrincipalPortion;
//     const newRemainingBalance = Math.max(0, totalPayable - newTotalPaid);

//     // Create repayment record
//     let repayment = await Repayment.create({
//       loan,
//       customer: loanDoc.customer._id,
//       paymentAmount: Number(paymentAmount),
//       interestPaid: finalInterestPortion, // Store as interestPaid in repayment
//       principalPaid: finalPrincipalPortion, // Store as principalPaid in repayment
//       remainingInterest: Math.max(0, remainingInterest - finalInterestPortion),
//       remainingPrincipal: Math.max(0, remainingPrincipal - finalPrincipalPortion),
//       remainingBalance: newRemainingBalance, // Balance AFTER this payment
//       paymentMethod: paymentMethod || 'Cash',
//       transactionReference,
//       recordedBy: req.user._id,
//       notes,
//       status: 'Approved', // Auto-approve repayments
//     });

//     // Update loan balances
//     loanDoc.totalPaid = newTotalPaid;
//     loanDoc.interestPaid = newInterestPaid;
//     loanDoc.principalPaid = newPrincipalPaid;
//     loanDoc.remainingBalance = newRemainingBalance;
    
//     // Update loan status if fully paid
//     if (newRemainingBalance <= 0 && loanDoc.status === 'Active') {
//       loanDoc.status = 'Completed';
//     }
    
//     await loanDoc.save();

//     // Populate repayment for response
//     await repayment.populate([
//       { path: 'loan', select: 'loanId loanProduct remainingBalance totalPaid interestPaid principalPaid' },
//       { path: 'customer', select: 'firstName lastName customerId phoneNumber' },
//     ]);

//     return res.status(201).json({
//       success: true,
//       message: 'Repayment recorded successfully',
//       data: repayment,
//     });
//   } catch (error) {
//     console.error('Error recording repayment:', error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });