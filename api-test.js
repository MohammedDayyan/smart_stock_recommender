// Simple API test for Vercel deployment
const testAPI = async () => {
  try {
    console.log('Testing API endpoints...');
    
    // Test signup
    const signupRes = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'testuser123', 
        email: 'test123@example.com', 
        password: 'test123456' 
      })
    });
    const signupData = await signupRes.json();
    console.log('Signup:', signupData);
    
    // Test login
    const loginRes = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'testuser123', 
        password: 'test123456' 
      })
    });
    const loginData = await loginRes.json();
    console.log('Login:', loginData);
    
    // Test stock endpoint
    const stockRes = await fetch('/api/stock/RELIANCE');
    const stockData = await stockRes.json();
    console.log('Stock:', stockData ? 'Success' : 'Failed');
    
  } catch (error) {
    console.error('API Test Error:', error);
  }
};

// Run in browser console
testAPI();
