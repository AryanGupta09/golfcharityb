const mongoose = require('mongoose');

// Event schema for charity golf days / upcoming events
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  location: { type: String },
  imageUrl: { type: String, default: null }
}, { _id: true });

const charitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true },
    website: { type: String, default: null },
    logo: { type: String, default: null },
    images: [{ type: String }],                    // multiple images for profile page
    registrationNumber: { type: String, unique: true, sparse: true },
    totalDonations: { type: Number, default: 0 },
    donorCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false }, // spotlight on homepage
    events: [eventSchema],                         // upcoming golf days / events
    bankDetails: {
      accountName: String,
      accountNumber: String,
      routingNumber: String,
      bankName: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Charity', charitySchema);
