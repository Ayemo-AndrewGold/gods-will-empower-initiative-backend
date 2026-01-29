# God's Will Microfinance Backend - Setup Guide

## 📋 Prerequisites

Before starting, install:

1. **Node.js** - https://nodejs.org/ (LTS version)
2. **MongoDB** - Choose one:
   - **Local:** https://www.mongodb.com/try/download/community
   - **Cloud (Easier):** https://www.mongodb.com/cloud/atlas (Free tier available)
3. **Code Editor** - VS Code recommended: https://code.visualstudio.com/

---

## 🚀 Quick Setup (Automated)

### For Mac/Linux:
```bash
# Download and run setup script
curl -o setup.sh https://your-url/setup.sh
chmod +x setup.sh
./setup.sh
```

### For Windows:
```batch
REM Download setup.bat and run:
setup.bat
```

---

## 📝 Manual Setup (Step-by-Step)

### Step 1: Create Project Folder

```bash
# Create and navigate to project folder
mkdir godswill-backend
cd godswill-backend

# Create folder structure
mkdir models routes middleware scripts
```

### Step 2: Initialize Node.js

```bash
npm init -y
```

### Step 3: Install Dependencies

```bash
# Install main dependencies
npm install express mongoose bcryptjs jsonwebtoken dotenv cors express-validator moment

# Install dev dependencies
npm install --save-dev nodemon
```

### Step 4: Update package.json

Replace your `package.json` with:

```json
{
  "name": "godswill-microfinance-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node scripts/seedAdmin.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "express-validator": "^7.0.1",
    "moment": "^2.29.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### Step 5: Create .env File

Create a file named `.env` in the root folder:

```env
NODE_ENV=development
PORT=5000

# MongoDB - Choose one option:
# Option 1: Local MongoDB
MONGO_URI=mongodb://localhost:27017/godswill_microfinance

# Option 2: MongoDB Atlas (Cloud)
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/godswill_microfinance

JWT_SECRET=godswill-super-secret-jwt-key-2025-change-this
JWT_EXPIRE=7d

FRONTEND_URL=http://localhost:3000

ORG_NAME=God's Will Empowerment Initiative
ORG_ADDRESS=Lagos, Nigeria
ORG_PHONE=+234-XXX-XXX-XXXX
ORG_EMAIL=info@godswill.org
```

### Step 6: Create All Code Files

Now create these files with the code I provided earlier:

**File Structure:**
```
backend/
├── models/
│   └── User.js              (User Model code)
├── routes/
│   └── auth.js              (Authentication Routes code)
├── middleware/
│   └── auth.js              (Auth Middleware code)
├── scripts/
│   └── seedAdmin.js         (Seed Admin script)
├── .env                     (Environment variables)
├── .gitignore               (Git ignore file)
├── server.js                (Main server code)
└── package.json             (Dependencies)
```

**Copy each code file:**
- `server.js` - Main server setup
- `models/User.js` - User database schema
- `routes/auth.js` - Authentication endpoints
- `middleware/auth.js` - JWT verification
- `scripts/seedAdmin.js` - Create first admin user

### Step 7: Create .gitignore

Create `.gitignore` file:

```
node_modules/
.env
.DS_Store
*.log
```

---

## 🗄️ MongoDB Setup

### Option A: Local MongoDB

1. Install MongoDB Community Edition
2. Start MongoDB service:
   ```bash
   # Windows
   net start MongoDB
   
   # Mac (with Homebrew)
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

### Option B: MongoDB Atlas (Cloud - Recommended)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster (select free tier)
4. Create database user:
   - Username: `godswill_admin`
   - Password: (choose strong password)
5. Whitelist IP: `0.0.0.0/0` (allow from anywhere)
6. Get connection string:
   - Click "Connect" → "Connect your application"
   - Copy connection string
   - Replace `<password>` with your password
7. Update `.env` file with your connection string

---

## ▶️ Running the Server

### 1. Create Admin User

```bash
npm run seed
```

**Output:**
```
✅ Admin user created successfully!
📧 Email: admin@godswill.org
🔑 Password: Admin@123
👤 Staff ID: STAFF0001
```

### 2. Start Development Server

```bash
npm run dev
```

**Output:**
```
🚀 Server running on port 5000
✅ MongoDB Connected
```

### 3. Start Production Server

```bash
npm start
```

---

## 🧪 Testing the API

### Using Postman or Thunder Client:

#### 1. Login
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

Body:
{
  "email": "admin@godswill.org",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@godswill.org",
    "role": "Admin",
    "staffId": "STAFF0001"
  }
}
```

#### 2. Get Current User
```
GET http://localhost:5000/api/auth/me
Authorization: Bearer YOUR_TOKEN_FROM_LOGIN
```

#### 3. Register New User (Admin only)
```
POST http://localhost:5000/api/auth/register
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

Body:
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@godswill.org",
  "password": "SecurePass123",
  "role": "Loan Officer",
  "phoneNumber": "+234-XXX-XXX-XXXX"
}
```

---

## 🐛 Troubleshooting

### "Cannot find module 'express'"
```bash
npm install
```

### "MongoDB connection failed"
- Check if MongoDB is running
- Verify connection string in `.env`
- Check firewall/network settings

### "Port 5000 already in use"
- Change PORT in `.env` file
- Or kill process using port 5000:
  ```bash
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  
  # Mac/Linux
  lsof -ti:5000 | xargs kill -9
  ```

### "JWT Secret not defined"
- Make sure `.env` file exists
- Check `JWT_SECRET` is set

---

## 📂 Project Structure

```
backend/
├── models/                 # Database schemas
│   ├── User.js            # User model
│   ├── Customer.js        # (Coming in Step 2)
│   ├── Loan.js            # (Coming in Step 3)
│   └── Repayment.js       # (Coming in Step 4)
├── routes/                 # API endpoints
│   ├── auth.js            # Authentication routes
│   ├── customers.js       # (Coming in Step 2)
│   ├── loans.js           # (Coming in Step 3)
│   ├── repayments.js      # (Coming in Step 4)
│   └── reports.js         # (Coming in Step 5)
├── middleware/             # Custom middleware
│   ├── auth.js            # JWT verification
│   └── validation.js      # Input validation
├── scripts/                # Utility scripts
│   └── seedAdmin.js       # Create admin user
├── .env                    # Environment variables (DO NOT COMMIT)
├── .gitignore             # Git ignore rules
├── server.js              # Main application entry
└── package.json           # Dependencies
```

---

## 🔐 Security Notes

1. **Change default admin password immediately after first login**
2. **Never commit `.env` file to Git**
3. **Use strong JWT_SECRET in production**
4. **Enable MongoDB authentication in production**
5. **Use HTTPS in production**

---

## ✅ Verification Checklist

- [ ] Node.js installed and working
- [ ] MongoDB running (local or Atlas)
- [ ] All dependencies installed (`npm install`)
- [ ] `.env` file created and configured
- [ ] All code files created
- [ ] Admin user created (`npm run seed`)
- [ ] Server starts without errors (`npm run dev`)
- [ ] Login works (test with Postman)
- [ ] Token received successfully

---

## 📞 Support

If you encounter issues:
1. Check error messages carefully
2. Verify all prerequisites are installed
3. Ensure MongoDB is running
4. Check `.env` configuration
5. Review the troubleshooting section

---

## 🎯 Next Steps

Once Step 1 is working:
- **Step 2:** Customer Management API
- **Step 3:** Loans Management API
- **Step 4:** Repayments Management API
- **Step 5:** Reports & Analytics API

---

**Ready to test?** Try the login endpoint and let me know if you get the token! 🚀