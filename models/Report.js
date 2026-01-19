/*
 * Report model
 *
 * Reports allow users to flag and persist a particular conversation for review by
 * staff.  When a report is submitted the entire conversation history is
 * exported into a standalone HTML document and stored in the report.  Staff
 * members can later view the report along with the exported chat without
 * accessing any live chat data.  Reports cannot be created by automated
 * systems; they must be explicitly submitted by a user via the report page.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReportSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    // The exported HTML is stored as a string.  It contains only safe,
    // sanitised markup and inline CSS.  When the HTML is served to staff
    // members it is delivered as-is without modification.
    exportedHtml: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'reports',
  },
);

module.exports = mongoose.model('Report', ReportSchema);