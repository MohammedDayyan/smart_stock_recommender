const mongoose = require('mongoose');

// Test different connection string formats
const connectionStrings = [
  'mongodb+srv://dayyansoherwardi123_db_user:UAF7AX7uDn5xHTga@cluster0.6gpkfqj.mongodb.net/stock_recommender',
  'mongodb+srv://dayyansoherwardi123_db_user:UAF7AX7uDn5xHTga@cluster0.6gpkfqj.mongodb.net/stock_recommender?retryWrites=true&w=majority',
  'mongodb+srv://dayyansoherwardi123_db_user:UAF7AX7uDn5xHTga@cluster0.6gpkfqj.mongodb.net/'
];

async function testConnection(index) {
  try {
    console.log(`Testing connection string ${index + 1}:`);
    await mongoose.connect(connectionStrings[index]);
    console.log('✅ SUCCESS: Connected to MongoDB');
    await mongoose.connection.close();
    return true;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    return false;
  }
}

async function testAll() {
  for (let i = 0; i < connectionStrings.length; i++) {
    const success = await testConnection(i);
    if (success) {
      console.log('\n✅ Use this connection string:');
      console.log(connectionStrings[i]);
      break;
    }
    console.log('---');
  }
}

testAll();
