// backend/models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String }, // optional, if you plan to store emails
  createdAt: { type: Date, default: Date.now }
});

// ✅ Avoid OverwriteModelError
module.exports = mongoose.models.User || mongoose.model("User", UserSchema);