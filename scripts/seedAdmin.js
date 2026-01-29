// scripts/seedAdmin.js - Create default admin user
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    const adminExists = await User.findOne({ email: 'admin@godswill.org' });

    if (adminExists) {
      console.log('⚠️  Admin user already exists');
      process.exit(0);
    }

    // Generate staff ID
    const count = await User.countDocuments();
    const staffId = `STAFF${String(count + 1).padStart(4, '0')}`;

    // Hash password (SAFE)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin@123', salt);

    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@godswill.org',
      password: hashedPassword,
      role: 'Admin',
      phoneNumber: '+234-XXX-XXX-XXXX',
      branch: 'Main Office',
      staffId,
      isActive: true
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@godswill.org');
    console.log('🔑 Password: Admin@123');
    console.log('⚠️  IMPORTANT: Change password after first login!');
    console.log(`👤 Staff ID: ${admin.staffId}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedAdmin();
