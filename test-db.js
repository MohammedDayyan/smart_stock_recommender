const mongoose = require('mongoose');

async function testConnection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://dayyansoherwardi123_db_user:UAF7AX7uDn5xHTga@cluster0.6gpkfqj.mongodb.net/stock_recommender');
    console.log('✅ MongoDB Connected Successfully');
    
    // Test creating a simple document
    const testSchema = new mongoose.Schema({ test: String });
    const TestModel = mongoose.model('Test', testSchema);
    await TestModel.create({ test: 'connection-test' });
    console.log('✅ Database Write Test Passed');
    
    await mongoose.connection.close();
    console.log('✅ Connection Closed');
  } catch (error) {
    console.error('❌ Database Error:', error.message);
  }
}

testConnection();
