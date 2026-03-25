// backend/models/Watchlist.js
const mongoose = require("mongoose");

const WatchlistSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  stocks: [{
    symbol: { type: String, required: true }
  }]
});

module.exports = mongoose.models.Watchlist || mongoose.model("Watchlist", WatchlistSchema);