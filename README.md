//readmi
# Smart Stock Recommender

A full-stack web application that provides intelligent stock recommendations and portfolio management capabilities. This platform leverages real-time market data from Yahoo Finance to help users make informed investment decisions.

## Features

- **User Authentication**: Secure login and signup system with JWT tokens
- **Real-time Stock Data**: Live stock prices and market information via Yahoo Finance API
- **Portfolio Management**: Track and manage your investment portfolio
- **Watchlist**: Monitor stocks of interest with personalized watchlists
- **Transaction History**: Complete record of all buy/sell transactions
- **Interactive Dashboard**: Comprehensive overview of portfolio performance

## Technology Stack

**Backend**:
- Node.js with Express.js
- MongoDB with Mongoose ODM
- JWT authentication
- Yahoo Finance API integration

**Frontend**:
- HTML5, CSS3, JavaScript
- Responsive design
- Real-time data updates

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up MongoDB database
4. Start the backend server:
   ```bash
   cd backend && npm start
   ```
5. Open `frontend/login.html` in your browser

## Database Schema

The application uses MongoDB with the following models:
- Users (authentication and profiles)
- Watchlists (stock monitoring)
- Portfolios (investment holdings)
- Transactions (buy/sell records)

## API Endpoints

The backend provides RESTful APIs for user authentication, stock data retrieval, portfolio management, and transaction handling. All sensitive endpoints require JWT authentication.

## Frontend Structure

### HTML Files Overview

**login.html** - User Authentication Entry Point
- Split-screen layout with animated robot mascot
- JWT token-based authentication integration
- Dark theme with purple accent colors and floating animations

**signup.html** - New User Registration
- Registration form with additional validation fields
- Pink accent theme differentiation from login
- Enhanced animations including core pulse effects

**dashboard.html** - Main Control Center
- Interactive chatbot with AI-powered stock recommendations
- Real-time portfolio metrics and live stock prices
- Comprehensive data visualization and modal systems

**portfolio.html** - Investment Management
- Sophisticated sell popup with quantity controls
- Real-time P&L calculations and performance tracking
- Dynamic price calculations with preset quantity buttons

**watchlist.html** - Stock Monitoring
- CSS-based treemap for portfolio allocation visualization
- Interactive heatmap grid for stock performance
- Sector-wise performance breakdown with sortable tables

**history.html** - Transaction Records
- Complete buy/sell transaction history with timestamps
- Color-coded badges and detailed trade information
- Clean, minimalist design focused on data clarity

## Contributing

This project is designed for educational purposes to demonstrate full-stack development with real-time financial data integration.

