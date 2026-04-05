const express = require("express");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// Try different import methods for YahooFinance
let YahooFinance;
try {
  YahooFinance = require("yahoo-finance2").default;
} catch (e) {
  try {
    YahooFinance = require("yahoo-finance2");
  } catch (e2) {
    console.error("YahooFinance import failed:", e2.message);
  }
}

const SECRET = process.env.JWT_SECRET || "mysecretkey";

/* ---------------- DB ---------------- */

try {
  mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/stock_recommender")
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("MongoDB Error:", err));
} catch (error) {
  console.error("Database connection error:", error);
}

const User = require("../backend/models/User");
const Watchlist = require("../backend/models/Watchlist");
const Portfolio = require("../backend/models/Portfolio");
const Transaction = require("../backend/models/Transaction");

/* ---------------- APP ---------------- */

const corsOptions = {
  origin: '*',
  credentials: true,
  optionsSuccessStatus: 200
};

const app = express();

// Add /api prefix to all routes
const apiRouter = express.Router();

app.use(cors(corsOptions));
app.use(express.json());

// Initialize YahooFinance if available
let yahooFinance;
if (YahooFinance) {
  try {
    yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
  } catch (e) {
    console.error("YahooFinance initialization failed:", e.message);
  }
}

/* ---------------- AUTH MIDDLEWARE ---------------- */

function authMiddleware(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "Login required" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* ---------------- AUTH ---------------- */

apiRouter.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.json({ success: false, message: "All fields required" });

  try {
    const existing = await User.findOne({ $or: [{ username }, { email }] });

    if (existing)
      return res.json({ success: false, message: "User already exists" });

    await User.create({ username, email, password });

    await Portfolio.create({
      username,
      holdings: [],
      realizedPnL: 0,
      totalSellProceeds: 0
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Error creating user" });
  }
});

apiRouter.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.json({ success: false });

  try {
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
      password
    });

    if (!user)
      return res.json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { username: user.username },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({ success: true, token });

  } catch {
    res.json({ success: false });
  }
});

/* ---------------- STOCK ---------------- */

apiRouter.get("/stock/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol + ".NS";

    const response = await axios.get(
      `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 10000
      }
    );

    res.json(response.data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- FUNDAMENTALS ---------------- */

apiRouter.get("/fundamentals/:symbol", async (req, res) => {
  try {
    if (!yahooFinance) {
      return res.status(500).json({ error: "YahooFinance not available" });
    }
    
    const data = await yahooFinance.quoteSummary(req.params.symbol + ".NS", {
      modules: ["financialData", "defaultKeyStatistics"]
    });

    res.json({ quoteSummary: { result: [data] } });

  } catch (err) {
    console.error("Fundamentals error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- HISTORY ---------------- */

apiRouter.get("/history/:symbol/:range", async (req, res) => {
  try {
    if (!yahooFinance) {
      return res.status(500).json({ error: "YahooFinance not available" });
    }
    
    const now = Math.floor(Date.now() / 1000);
    let period1 = now - 365 * 24 * 60 * 60;

    if (req.params.range === "1d") period1 = now - 86400;
    if (req.params.range === "1mo") period1 = now - 2592000;
    if (req.params.range === "5y") period1 = now - 157680000;

    const result = await yahooFinance.chart(req.params.symbol + ".NS", {
      period1,
      period2: now,
      interval: "1d"
    });

    res.json(result);

  } catch (err) {
    console.error("History error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- WATCHLIST (PROTECTED) ---------------- */

apiRouter.post("/watchlist/add", authMiddleware, async (req, res) => {
  const username = req.user.username;
  const { symbol } = req.body;

  if (!symbol)
    return res.status(400).json({ error: "Symbol required" });

  try {
    let watchlist = await Watchlist.findOne({ username });

    if (!watchlist) {
      watchlist = await Watchlist.create({ username, stocks: [] });
    }

    const exists = watchlist.stocks.find(s => s.symbol === symbol);

    if (!exists) watchlist.stocks.push({ symbol });

    await watchlist.save();

    res.json({ message: "Added" });

  } catch {
    res.status(500).json({ error: "Watchlist error" });
  }
});

apiRouter.get("/watchlist", authMiddleware, async (req, res) => {
  const username = req.user.username;

  try {
    const watchlist = await Watchlist.findOne({ username });
    res.json(watchlist ? watchlist.stocks : []);
  } catch {
    res.json([]);
  }
});

/* ---------------- PORTFOLIO (PROTECTED) ---------------- */

apiRouter.get("/portfolio/with-prices", authMiddleware, async (req, res) => {
  const username = req.user.username;

  try {
    const portfolio = await Portfolio.findOne({ username });

    if (!portfolio || !portfolio.holdings.length) {
      return res.json({ holdings: [] });
    }

    const results = await Promise.all(
      portfolio.holdings.map(async (h) => {
        try {
          const response = await axios.get(
            `https://query2.finance.yahoo.com/v8/finance/chart/${h.symbol}.NS`,
            { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 5000 }
          );

          const quote = response.data.chart.result[0].indicators.quote[0];
          const closes = quote.close?.filter(v => v != null) || [];
          const price = closes.length ? closes[closes.length - 1] : h.avgBuy;

          return {
            symbol: h.symbol,
            quantity: h.quantity,
            avgBuy: h.avgBuy,
            current: price
          };

        } catch {
          return {
            symbol: h.symbol,
            quantity: h.quantity,
            avgBuy: h.avgBuy,
            current: 0
          };
        }
      })
    );

    res.json({ holdings: results });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load portfolio" });
  }
});

apiRouter.post("/portfolio/buy", authMiddleware, async (req, res) => {
  const symbol = req.body.symbol.toUpperCase();
  const { price, quantity } = req.body;
  const username = req.user.username;

  if (!symbol || !quantity || quantity <= 0 || !price)
    return res.status(400).json({ error: "symbol, price and quantity (> 0) are required" });

  try {
    let portfolio = await Portfolio.findOne({ username });
    if (!portfolio) portfolio = new Portfolio({ username, holdings: [] });

    let stock = portfolio.holdings.find(s => s.symbol === symbol);

    if (stock) {
      const totalQty = stock.quantity + Number(quantity);
      stock.avgBuy = ((stock.avgBuy * stock.quantity) + (Number(price) * Number(quantity))) / totalQty;
      stock.quantity = totalQty;
      stock.lastUpdatedAt = new Date();
    } else {
      portfolio.holdings.push({
        symbol,
        quantity: Number(quantity),
        avgBuy: Number(price),
        firstBoughtAt: new Date(),
        lastUpdatedAt: new Date()
      });
    }

    await portfolio.save();

    await Transaction.create({
      username,
      symbol,
      type: "BUY",
      price: Number(price),
      quantity: Number(quantity),
      total: Number(price) * Number(quantity)
    });

    res.json({ success: true, message: "Buy recorded" });

  } catch (err) {
    console.error("BUY error:", err);
    res.status(500).json({ error: "Buy failed" });
  }
});

apiRouter.post("/portfolio/sell-preview", authMiddleware, async (req, res) => {
  let { symbol, price, quantity } = req.body;
  symbol = symbol.toUpperCase();
  const username = req.user.username;

  try {
    const portfolio = await Portfolio.findOne({ username });
    if (!portfolio) return res.json({ error: "No portfolio found" });

    const stock = portfolio.holdings.find(s => s.symbol === symbol);
    if (!stock) return res.json({ error: "Stock not in portfolio" });
    if (stock.quantity < Number(quantity)) return res.json({ error: "Not enough shares" });

    const qty = Number(quantity);
    const sellPrice = Number(price);
    const pnl = (sellPrice - stock.avgBuy) * qty;
    const pnlPct = stock.avgBuy > 0 ? (pnl / (stock.avgBuy * qty)) * 100 : 0;
    const proceeds = sellPrice * qty;
    const remaining = stock.quantity - qty;

    res.json({
      success: true,
      symbol,
      sellPrice,
      avgBuy: stock.avgBuy,
      quantity: qty,
      proceeds,
      profitLoss: pnl,
      profitLossPct: pnlPct,
      remainingQty: remaining,
      costBasis: stock.avgBuy * qty
    });

  } catch (err) {
    console.error("SELL PREVIEW error:", err);
    res.status(500).json({ error: "Preview failed" });
  }
});

apiRouter.post("/portfolio/sell", authMiddleware, async (req, res) => {
  let { symbol, price, quantity } = req.body;
  symbol = symbol.toUpperCase();
  const username = req.user.username;

  if (!symbol || !quantity || quantity <= 0 || !price)
    return res.status(400).json({ error: "symbol, price and quantity (> 0) are required" });

  try {
    const portfolio = await Portfolio.findOne({ username });
    if (!portfolio) return res.status(404).json({ error: "Portfolio not found" });

    const stock = portfolio.holdings.find(s => s.symbol === symbol);
    if (!stock) return res.status(400).json({ error: "Stock not in portfolio" });
    if (stock.quantity < Number(quantity)) return res.status(400).json({ error: "Not enough shares" });

    const qty = Number(quantity);
    const sellPrice = Number(price);
    const pnl = (sellPrice - stock.avgBuy) * qty;
    const pnlPct = stock.avgBuy > 0 ? (pnl / (stock.avgBuy * qty)) * 100 : 0;
    const remaining = stock.quantity - qty;
    const avgBuySnap = stock.avgBuy;

    stock.quantity = remaining;
    stock.lastUpdatedAt = new Date();

    portfolio.realizedPnL = (portfolio.realizedPnL || 0) + pnl;
    portfolio.totalSellProceeds = (portfolio.totalSellProceeds || 0) + (sellPrice * qty);

    await portfolio.save();

    await Transaction.create({
      username,
      symbol,
      type: "SELL",
      price: sellPrice,
      quantity: qty,
      total: sellPrice * qty,
      avgBuy: avgBuySnap,
      profitLoss: pnl,
      profitLossPct: pnlPct,
      remainingQty: remaining
    });

    res.json({
      success: true,
      message: "Sell recorded",
      profitLoss: pnl,
      profitLossPct: pnlPct,
      remainingQty: remaining,
      proceeds: sellPrice * qty
    });

  } catch (err) {
    console.error("SELL error:", err);
    res.status(500).json({ error: "Sell failed" });
  }
});

apiRouter.get("/portfolio", authMiddleware, async (req, res) => {
  const username = req.user.username;

  try {
    const portfolio = await Portfolio.findOne({ username });
    res.json({
      holdings: portfolio?.holdings || [],
      realizedPnL: portfolio?.realizedPnL || 0,
      totalSellProceeds: portfolio?.totalSellProceeds || 0
    });
  } catch {
    res.status(500).json({});
  }
});

/* ---------------- TRANSACTIONS (PROTECTED) ---------------- */

apiRouter.get("/transactions", authMiddleware, async (req, res) => {
  const username = req.user.username;

  try {
    const tx = await Transaction.find({ username }).sort({ time: -1 });
    res.json(tx);
  } catch {
    res.json([]);
  }
});

/* ---------------- TEST ---------------- */

apiRouter.get("/test", (req, res) => {
  res.json({ message: "API is working correctly!" });
});

/* ---------------- DEBUG ---------------- */

apiRouter.get("/debug", (req, res) => {
  res.json({
    message: "API is working",
    mongodb_uri: process.env.MONGODB_URI ? "Set" : "Not set",
    jwt_secret: process.env.JWT_SECRET ? "Set" : "Not set",
    node_env: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

/* ---------------- ERROR HANDLER ---------------- */

apiRouter.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ 
    error: "Internal server error", 
    message: err.message || "Something went wrong" 
  });
});

/* ---------------- 404 HANDLER ---------------- */

apiRouter.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Mount the API router with /api prefix
app.use("/api", apiRouter);

module.exports = app;
