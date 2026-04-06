
const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  username: { type: String, required: true, index: true },
  type: { type: String, enum: ["BUY", "SELL"], required: true },
  symbol: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  total: { type: Number, required: true },

  avgBuy: {
    type: Number,
    default: null        
  },
  profitLoss: {
    type: Number,
    default: null         
  },
  profitLossPct: {
    type: Number,
    default: null      
  },
  remainingQty: {
    type: Number,
    default: null          
  },
  notes: {
    type: String,
    default: ""
  },
  time: { type: Date, default: Date.now, index: true }
});

TransactionSchema.index({ username: 1, time: -1 });
TransactionSchema.index({ username: 1, symbol: 1 });

module.exports = mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);
