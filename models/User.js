const { Roles } = require('../src/server/rbac/roles');
const { AuditLog } = require('./AuditLog');

/*
 * In‑memory User model.  This simplistic model emulates a database
 * using JavaScript arrays and objects.  It provides methods to
 * create, find and update users.  In a real application you would
 * integrate with a persistent data store such as MongoDB via
 * Mongoose.  All asynchronous methods return promises to ease
 * integration with async/await syntax.
 */

const users = [];

function generateId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

class User {
  constructor(data) {
    this.id = data.id || generateId();
    this.email = data.email || null;
    this.emailVerified = data.emailVerified || false;
    this.authProviders = data.authProviders || { discord: null, google: null };
    this.passwordHash = data.passwordHash || null;
    this.passwordEnabled = data.passwordEnabled || false;
    this.createdAt = data.createdAt || new Date();
    this.lastLoginAt = data.lastLoginAt || new Date();
    this.roles = data.roles || [];
    this.billingStatus = data.billingStatus || { plan: 'FREE', since: new Date() };
    this.flags = data.flags || {};
  }

  /**
   * Persist this user to the in‑memory store.  If the user already
   * exists (matched by id), the record is updated; otherwise a new
   * record is appended.  Returns the saved user.
   */
  save() {
    const index = users.findIndex((u) => u.id === this.id);
    if (index >= 0) {
      users[index] = this;
    } else {
      users.push(this);
    }
    return this;
  }

  /**
   * Return a plain object representation suitable for JSON.
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      emailVerified: this.emailVerified,
      authProviders: this.authProviders,
      passwordEnabled: this.passwordEnabled,
      createdAt: this.createdAt,
      lastLoginAt: this.lastLoginAt,
      roles: this.roles,
      billingStatus: this.billingStatus,
      flags: this.flags,
    };
  }

  static async findById(id) {
    return users.find((u) => u.id === id) || null;
  }

  static async findByEmail(email) {
    return users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  static async findByDiscordId(discordId) {
    return users.find((u) => u.authProviders.discord && u.authProviders.discord.id === discordId) || null;
  }

  static async findByGoogleSub(sub) {
    return users.find((u) => u.authProviders.google && u.authProviders.google.sub === sub) || null;
  }

  /**
   * Create or update a user from a Discord profile according to the
   * signup rules.  The resolution logic is as follows:
   *  1. If a user exists with the matching discord id, log them in.
   *  2. Else if a user exists with the same email, link the discord
   *     account to that user and log them in.
   *  3. Otherwise create a new user with the discord account.
   *
   * If the email matches `theceoion@gmail.com` and no existing owner
   * exists, the role OWNER is assigned automatically and cannot be
   * removed in the UI.
   *
   * @param {Object} profile Discord profile with id, username, avatar, email, emailVerified
   * @returns {User} The authenticated/created user
   */
  static async upsertFromDiscord(profile) {
    let user = await User.findByDiscordId(profile.id);
    if (user) {
      // Existing user by Discord ID
      user.lastLoginAt = new Date();
      return user.save();
    }
    // Match by email if verified
    if (profile.email && profile.emailVerified) {
      const existingByEmail = await User.findByEmail(profile.email);
      if (existingByEmail) {
        existingByEmail.authProviders.discord = {
          id: profile.id,
          username: profile.username,
          avatar: profile.avatar,
        };
        existingByEmail.emailVerified = true;
        existingByEmail.lastLoginAt = new Date();
        return existingByEmail.save();
      }
    }
    // Create new user
    const roles = [];
    // Auto‑assign OWNER if this email matches the CEO and no owner exists
    if (profile.email && profile.emailVerified && profile.email.toLowerCase() === 'theceoion@gmail.com') {
      const existingOwner = users.find((u) => u.roles && u.roles.includes(Roles.OWNER));
      if (!existingOwner) {
        roles.push(Roles.OWNER);
      }
    }
    const newUser = new User({
      email: profile.email || null,
      emailVerified: !!profile.emailVerified,
      authProviders: {
        discord: {
          id: profile.id,
          username: profile.username,
          avatar: profile.avatar,
        },
        google: null,
      },
      roles,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    });
    return newUser.save();
  }

  /**
   * Link a Google account to an existing user.  If another user is
   * already linked to the same Google sub, an error is thrown.
   *
   * @param {User} user The user to link
   * @param {Object} profile Google profile with sub, name, picture, email, emailVerified
   */
  static async linkGoogle(user, profile) {
    // Ensure no other user has this Google sub
    const existing = await User.findByGoogleSub(profile.sub);
    if (existing && existing.id !== user.id) {
      const err = new Error('Google account already linked to another user');
      err.status = 409;
      throw err;
    }
    user.authProviders.google = {
      sub: profile.sub,
      name: profile.name,
      picture: profile.picture,
    };
    // Optionally update email if verified and not already present
    if (!user.email && profile.emailVerified) {
      user.email = profile.email;
      user.emailVerified = true;
    }
    return user.save();
  }
}

module.exports = { User, users };