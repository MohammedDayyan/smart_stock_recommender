// backend/models/Transaction.js
const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  username: { type: String, required: true, index: true },
  type:     { type: String, enum: ["BUY", "SELL"], required: true },
  symbol:   { type: String, required: true },
  price:    { type: Number, required: true },   // execution price
  quantity: { type: Number, required: true },
  total:    { type: Number, required: true },   // price × quantity

  /* ── Enriched fields ── */
  avgBuy: {
    type: Number,
    default: null          // avg cost basis at time of SELL — helps calculate P&L
  },
  profitLoss: {
    type: Number,
    default: null          // (sellPrice - avgBuy) × qty  — only set on SELL
  },
  profitLossPct: {
    type: Number,
    default: null          // profitLoss / (avgBuy * qty) * 100
  },
  remainingQty: {
    type: Number,
    default: null          // shares left after this sell
  },
  notes: {
    type: String,
    default: ""            // optional user-facing note
  },
  time: { type: Date, default: Date.now, index: true }
});

/* ── Compound index for fast user history lookups ── */
TransactionSchema.index({ username: 1, time: -1 });
TransactionSchema.index({ username: 1, symbol: 1 });

module.exports = mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);
