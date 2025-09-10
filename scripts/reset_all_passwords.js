/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://emmanuel:Ifeoluwa123@cluster0.ca3wo6k.mongodb.net/';

// Default passwords for each role
const DEFAULT_PASSWORDS = {
  admin: 'admin123',
  teacher: 'teacher123',
  student: 'student123',
  parent: 'parent123'
};

async function resetAllPasswords() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} total users`);

    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      try {
        // Determine the default password based on role
        const defaultPassword = DEFAULT_PASSWORDS[user.role] || 'password123';
        
        // Set the new password (will be hashed by pre-save hook)
        user.password = defaultPassword;
        await user.save();
        
        updated++;
        
        if (updated % 50 === 0) {
          console.log(`   ✅ Updated ${updated} users so far...`);
        }
        
        // Log the first few updates for verification
        if (updated <= 5) {
          console.log(`   🔐 Reset password for ${user.email} (${user.role})`);
        }
        
      } catch (error) {
        console.log(`   ❌ Failed to update ${user.email}: ${error.message}`);
        skipped++;
      }
    }

    console.log('\n🎉 Password Reset Complete!');
    console.log(`✅ Successfully updated: ${updated} users`);
    if (skipped > 0) {
      console.log(`⚠️  Skipped: ${skipped} users`);
    }

    // Test a few users to verify passwords work
    console.log('\n🧪 Testing password verification...');
    const testUsers = await User.find({}).limit(3);
    
    for (const user of testUsers) {
      const defaultPassword = DEFAULT_PASSWORDS[user.role] || 'password123';
      const isMatch = await user.comparePassword(defaultPassword);
      console.log(`   ${user.email} (${user.role}): ${isMatch ? '✅' : '❌'} - ${defaultPassword}`);
    }

    console.log('\n📋 Default Passwords:');
    Object.entries(DEFAULT_PASSWORDS).forEach(([role, password]) => {
      console.log(`   ${role}: ${password}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
resetAllPasswords();


































