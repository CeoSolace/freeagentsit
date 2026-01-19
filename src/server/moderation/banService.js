const { Roles } = require('../rbac/roles');

/*
 * Ban service manages user bans including reasons and appealability.
 * Bans are stored in memory for the lifetime of the server.  Each
 * entry tracks the reason code, reason text, the admin who issued
 * the ban and whether the ban is active.  Unappealable bans cannot
 * be undone via user appeal but may still be lifted by an admin.
 */

// Reason codes as specified in the contract
const ReasonCodes = {
  CHILD_PRED: 'CHILD_PRED',
  ABUSE_OF_SYSTEM: 'ABUSE_OF_SYSTEM',
  CHARGE_FRAUD: 'CHARGE_FRAUD',
  HARASSMENT: 'HARASSMENT',
  HATE_SPEECH: 'HATE_SPEECH',
  SCAM_FRAUD: 'SCAM_FRAUD',
  IMPERSONATION: 'IMPERSONATION',
  SPAM: 'SPAM',
  TERMS_VIOLATION: 'TERMS_VIOLATION',
  OTHER: 'OTHER',
};

// Codes that are unappealable by users.  Only admins/owners can
// override these bans.
const UNAPPEALABLE_CODES = new Set([
  ReasonCodes.CHILD_PRED,
  ReasonCodes.ABUSE_OF_SYSTEM,
  ReasonCodes.CHARGE_FRAUD,
]);

const bans = new Map();

/**
 * Ban a user.  If a user is already banned, their existing ban is
 * overwritten.  A ban record contains the reason, text, who issued
 * the ban, and whether it is active.
 *
 * @param {string} userId User to ban
 * @param {string} reasonCode Code from ReasonCodes
 * @param {string} reasonText Human readable explanation
 * @param {Object} adminUser Admin performing the ban
 */
function banUser(userId, reasonCode, reasonText, adminUser) {
  const ban = {
    userId,
    reasonCode,
    reasonText,
    bannedBy: adminUser ? adminUser.id : null,
    createdAt: new Date(),
    active: true,
    appealable: !UNAPPEALABLE_CODES.has(reasonCode),
  };
  bans.set(userId, ban);
  return ban;
}

/**
 * Unban a user.  Sets the active flag to false.  Does nothing if
 * there is no ban.
 *
 * @param {string} userId User to unban
 * @param {Object} adminUser Admin performing the unban
 */
function unbanUser(userId, adminUser) {
  const ban = bans.get(userId);
  if (ban) {
    ban.active = false;
    ban.unbannedBy = adminUser ? adminUser.id : null;
    ban.unbannedAt = new Date();
  }
  return ban;
}

function getBan(userId) {
  return bans.get(userId);
}

/**
 * Return the actions the current staff user can take on a target
 * user.  A staff member with MODERATOR or higher may ban or unban
 * users except owners.  Owners cannot be banned at all.  Users may
 * appeal their own bans if the code is appealable.
 *
 * @param {Object} currentUser The staff member performing the action
 * @param {Object} targetUser The user being moderated
 * @returns {Object} Object describing allowed actions
 */
function getModerationActions(currentUser, targetUser) {
  const actions = { canBan: false, canUnban: false, canAppeal: false };
  if (!currentUser || !targetUser) return actions;
  const currentRole = currentUser.roles && currentUser.roles[0];
  const targetRole = targetUser.roles && targetUser.roles[0];
  // Owners cannot be banned by anyone
  if (targetRole === Roles.OWNER) return actions;
  // Staff may ban/unban users if they are moderator or higher
  if (currentRole === Roles.MODERATOR || currentRole === Roles.ADMIN || currentRole === Roles.OWNER) {
    const ban = bans.get(targetUser.id);
    if (!ban || !ban.active) {
      actions.canBan = true;
    } else {
      actions.canUnban = true;
      actions.canBan = false;
    }
  }
  // User can appeal their own ban if it is appealable
  const selfBan = bans.get(targetUser.id);
  if (selfBan && selfBan.active && selfBan.appealable && currentUser.id === targetUser.id) {
    actions.canAppeal = true;
  }
  return actions;
}

module.exports = {
  ReasonCodes,
  UNAPPEALABLE_CODES,
  banUser,
  unbanUser,
  getBan,
  getModerationActions,
};