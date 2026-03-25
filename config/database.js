const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/golf-charity';
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`⚠️  Database Connection Error: ${error.message}`);
    if (error.message.includes('whitelist') || error.message.includes('IP')) {
      console.log('⚠️  FIX: Go to MongoDB Atlas → Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)');
    }
    console.log('⚠️  Running in offline mode. Please start MongoDB to enable database features.');
    return null;
  }
};

module.exports = connectDB;

module.exports = connectDB;
