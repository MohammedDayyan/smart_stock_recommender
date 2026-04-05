# Deployment Guide for Smart Stock Recommender

This guide will help you deploy your Smart Stock Recommender application on Render and Vercel using MongoDB as the database.

## Prerequisites

1. MongoDB Atlas account (for cloud database)
2. Render account (for backend deployment)
3. Vercel account (for frontend deployment)
4. GitHub repository with your code

## Environment Variables

Create the following environment variables in your deployment platforms:

### Required Environment Variables:
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET`: A secure secret key for JWT authentication
- `NODE_ENV`: Set to `production`
- `PORT`: Set to `3000` (or your preferred port)

## MongoDB Setup

1. **Create MongoDB Atlas Account**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free account

2. **Create a Cluster**:
   - Create a new cluster (choose the free M0 tier)
   - Select a cloud provider and region closest to your users

3. **Configure Database Access**:
   - Create a database user with username and password
   - Add your IP address to the IP whitelist (or use 0.0.0.0/0 for all access)

4. **Get Connection String**:
   - Click "Connect" on your cluster
   - Select "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

## Render Deployment (Backend)

### Option 1: Using render.yaml (Recommended)

1. **Update render.yaml**:
   - Replace `your-app-name` in the CORS origins with your actual app names
   - The file is already configured for deployment

2. **Deploy**:
   - Connect your GitHub repository to Render
   - Render will automatically detect the render.yaml file
   - Set environment variables in Render dashboard:
     - `MONGODB_URI`: Your MongoDB connection string
     - `JWT_SECRET`: Generate a secure random string
     - `NODE_ENV`: `production`

### Option 2: Manual Setup

1. **Create Web Service**:
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Set:
     - Name: `smart-stock-recommender-api`
     - Runtime: `Node`
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Root Directory: `backend`

2. **Create Database**:
   - Click "New +" → "PostgreSQL" (or use MongoDB Atlas)
   - Configure and get connection string

## Vercel Deployment (Frontend)

### Option 1: Using vercel.json (Recommended)

1. **Update vercel.json**:
   - Replace `your-app-name` in the CORS origins with your actual app names
   - The file is already configured for deployment

2. **Deploy**:
   - Install Vercel CLI: `npm i -g vercel`
   - Run: `vercel --prod`
   - Set environment variables in Vercel dashboard:
     - `MONGODB_URI`: Your MongoDB connection string
     - `JWT_SECRET`: Same as used in Render

### Option 2: Manual Setup

1. **Connect Repository**:
   - Go to Vercel Dashboard
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Settings**:
   - Framework Preset: `Other`
   - Root Directory: `frontend`
   - Build Command: Leave empty (static files)
   - Output Directory: Leave empty

3. **Set Environment Variables**:
   - Add `MONGODB_URI` and `JWT_SECRET` in Vercel dashboard

## Important Notes

### CORS Configuration
Update the CORS origins in both `backend/server.js` and `api/index.js`:

```javascript
origin: process.env.NODE_ENV === 'production' 
  ? ['https://your-actual-app-name.vercel.app', 'https://your-actual-app-name.onrender.com']
  : ['http://localhost:3000', 'http://127.0.0.1:3000']
```

### Frontend API Calls
Update your frontend JavaScript to use the correct API endpoints:

- For Render: `https://your-app-name.onrender.com/api/endpoint`
- For Vercel: `/api/endpoint` (automatically routed)

### Security
- Never commit `.env` files to version control
- Use strong, unique JWT secrets
- Enable HTTPS in production (both platforms do this automatically)
- Consider implementing rate limiting for API endpoints

## Testing Deployment

1. **Backend Health Check**:
   - Visit `https://your-app-name.onrender.com/` to check if server is running
   - Test API endpoints using Postman or curl

2. **Frontend Functionality**:
   - Visit `https://your-app-name.vercel.app`
   - Test user registration, login, and stock features

3. **Database Connection**:
   - Check Render logs for MongoDB connection status
   - Verify data persistence by creating test users and portfolios

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Update allowed origins in CORS configuration
2. **Database Connection**: Verify MongoDB URI and IP whitelist
3. **Environment Variables**: Ensure all required variables are set
4. **Build Failures**: Check logs for missing dependencies or syntax errors

### Log Locations:
- Render: Dashboard → Your Service → Logs
- Vercel: Dashboard → Your Project → Logs tab

## Production Checklist

- [ ] MongoDB Atlas cluster created and configured
- [ ] Environment variables set in both platforms
- [ ] CORS origins updated with actual app URLs
- [ ] Frontend API endpoints updated for production
- [ ] SSL/HTTPS enabled (automatic on both platforms)
- [ ] Database backups configured in MongoDB Atlas
- [ ] Monitoring and error tracking set up
- [ ] Performance testing completed
