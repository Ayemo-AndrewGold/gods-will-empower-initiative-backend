// server.js - Main Express Server
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

/* =======================
   CORS CONFIG (IMPORTANT)
   ======================= */
const allowedOrigins = [
  "http://localhost:3000",
  "https://gods-will-empower-initiative.vercel.app",
  "https://godswillempowerment.netlify.app",
  process.env.FRONTEND_URL,
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, mobile apps)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);


/* =======================
   MIDDLEWARES
   ======================= */
app.use(express.json());

/* =======================
   MONGODB CONNECTION
   ======================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) =>
    console.error("❌ MongoDB Connection Error:", err)
  );

/* =======================
   ROUTES
   ======================= */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/customers", require("./routes/customers"));
app.use("/api/loans", require("./routes/loans"));
app.use("/api/repayments", require("./routes/repayments"));
app.use("/api/reports", require("./routes/reports"));

/* =======================
   HEALTH CHECK
   ======================= */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "God's Will Microfinance API is running 🚀",
  });
});

/* =======================
   ERROR HANDLER
   ======================= */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || "Server Error",
  });
});

/* =======================
   SERVER START
   ======================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
