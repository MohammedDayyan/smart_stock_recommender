const express = require("express");
const cors = require("cors");

const app = express();

// Allow all origins for the code  in backend logic as simple.js
app.use(cors());
app.use(express.json());

// Simple test endpoint
app.get("/", (req, res) => {
  res.json({ message: "API is working!" });
});

// Simple login endpoint (without database)
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.json({ success: false, message: "All fields required" });
  }
  
  // Mock successful login for testing
  if (username === "test" && password === "test") {
    return res.json({ 
      success: true, 
      token: "mock-token-123",
      message: "Login successful (mock mode)"
    });
  }
  
  res.json({ success: false, message: "Invalid credentials" });
});

// Simple signup endpoint (without database)
app.post("/signup", (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.json({ success: false, message: "All fields required" });
  }
  
  // Mock successful signup for testing
  res.json({ 
    success: true, 
    message: "Account created (mock mode)"
  });
});

// Debug endpoint
app.get("/debug", (req, res) => {
  res.json({
    message: "Simple API working",
    mongodb_uri: process.env.MONGODB_URI ? "Set" : "Not set",
    jwt_secret: process.env.JWT_SECRET ? "Set" : "Not set",
    node_env: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ 
    error: "Internal server error", 
    message: err.message || "Something went wrong" 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

module.exports = app;
