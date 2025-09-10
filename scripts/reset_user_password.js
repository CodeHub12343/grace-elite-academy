const mongoose = require('mongoose');
const User = require('../models/user.model');

async function main() {
  const [, , emailArg, passwordArg] = process.argv;
  if (!emailArg || !passwordArg) {
    console.error('Usage: node scripts/reset_user_password.js <email> <newPassword>');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URI environment variable.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 20000,
  });

  try {
    const user = await User.findOne({ email: emailArg });
    if (!user) {
      console.error(`User not found for email: ${emailArg}`);
      process.exitCode = 2;
      return;
    }

    user.password = passwordArg; // pre-save hook will hash
    await user.save();
    console.log(`Password reset OK for ${emailArg}`);
  } catch (err) {
    console.error('Failed to reset password:', err.message);
    process.exitCode = 3;
  } finally {
    await mongoose.connection.close();
  }
}

main();






































