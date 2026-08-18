

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

// ==========================================
// ⚡ CORS CONFIGURATION
// ==========================================

const allowedOrigins = [
  "http://localhost:5173",
  "https://www.truee.in",
  "https://truee.in"
];

app.use(cors({
  origin: function (origin, callback) {

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }

  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// ==========================================
// ⚡ ROUTES
// ==========================================

app.use("/api/company", require("./routes/companyRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/Superadmin", require("./routes/superAdminRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/cart", require("./routes/addTocartRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/history", require("./routes/historyRoutes"));
app.use("/api/home", require("./routes/homeroutes"));
app.use("/api/theme", require("./routes/ThemeRoutes"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));
app.use("/api/legal", require("./routes/legalRoutes"));
app.use("/api/v1/legal", require("./routes/legalRoutes"));

// ⚡ COUPON ROUTE
app.use("/api/coupons", require("./routes/couponRoutes"));

// ⚡ REWARD & WALLET ROUTES
app.use("/api/rewards", require("./routes/rewardRoutes"));
app.use("/api/wallet", require("./routes/walletRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/admin/rewards", require("./routes/adminRewardRoutes"));

// Initialize default reward settings on boot
const { ensureDefaultSettings } = require("./services/rewardConfigService");

ensureDefaultSettings()
  .catch((err) => console.error("Reward settings init:", err.message));

// ==========================================
// ⚡ GLOBAL ERROR HANDLER
// ==========================================

app.use(errorMiddleware);

module.exports = app;