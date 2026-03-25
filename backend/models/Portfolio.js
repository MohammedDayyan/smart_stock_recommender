// backend/models/Portfolio.js
const mongoose = require("mongoose");

const HoldingSchema = new mongoose.Schema({
  symbol:        { type: String, required: true },
  quantity:      { type: Number, required: true, min: 0 },
  avgBuy:        { type: Number, required: true },
  firstBoughtAt: { type: Date,   default: Date.now },
  lastUpdatedAt: { type: Date,   default: Date.now }
}, { _id: false });

const PortfolioSchema = new mongoose.Schema({
  username:          { type: String, required: true, unique: true },
  holdings:          { type: [HoldingSchema], default: [] },
  realizedPnL:       { type: Number, default: 0 },
  totalSellProceeds: { type: Number, default: 0 },
  updatedAt:         { type: Date,   default: Date.now }
});

// FIX: async pre-hook — no `next` parameter needed (works with Mongoose 5, 6, 7+)
PortfolioSchema.pre("save", async function () {
  this.holdings  = this.holdings.filter(h => h.quantity > 0);
  this.updatedAt = new Date();
});

module.exports = mongoose.models.Portfolio
  || mongoose.model("Portfolio", PortfolioSchema);
