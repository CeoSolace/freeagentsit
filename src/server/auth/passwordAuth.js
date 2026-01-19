const bcrypt = require("bcryptjs");
const User = require("../../../models/User");

async function setPasswordForUser(userId, plainPassword) {
  if (!plainPassword || typeof plainPassword !== "string" || plainPassword.length < 8) {
    const err = new Error("Password must be at least 8 characters.");
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found.");
    err.status = 404;
    throw err;
  }

  user.passwordHash = passwordHash;
  user.passwordEnabled = true;

  await user.save();
  return user;
}

async function verifyPasswordLogin(email, plainPassword) {
  const e = String(email || "").toLowerCase().trim();
  if (!e || !plainPassword) {
    const err = new Error("Missing email or password.");
    err.status = 400;
    throw err;
  }

  // Prefer native mongoose query
  const user = await User.findOne({ email: e });
  if (!user || !user.passwordEnabled || !user.passwordHash) {
    const err = new Error("Invalid credentials.");
    err.status = 401;
    throw err;
  }

  const ok = await bcrypt.compare(plainPassword, user.passwordHash);
  if (!ok) {
    const err = new Error("Invalid credentials.");
    err.status = 401;
    throw err;
  }

  return user;
}

module.exports = { setPasswordForUser, verifyPasswordLogin };
