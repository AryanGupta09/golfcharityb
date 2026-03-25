const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Charity = require('./models/Charity');
const User = require('./models/User');

const charities = [
  {
    name: 'Red Cross Golf Foundation',
    description: 'Providing emergency relief, disaster response, and humanitarian aid to communities in need across the globe. Every round you play helps save lives.',
    website: 'https://www.redcross.org',
    isActive: true,
    isFeatured: true,
    totalDonations: 12450,
    donorCount: 89
  },
  {
    name: 'Children\'s Cancer Research Fund',
    description: 'Funding breakthrough research to find cures for childhood cancers. Your golf scores directly contribute to giving children a fighting chance.',
    website: 'https://www.ccrf.org',
    isActive: true,
    isFeatured: false,
    totalDonations: 8320,
    donorCount: 64
  },
  {
    name: 'Green Earth Initiative',
    description: 'Protecting natural habitats, planting trees, and fighting climate change. Golf courses and nature go hand in hand — help us keep it that way.',
    website: 'https://www.greenearth.org',
    isActive: true,
    isFeatured: false,
    totalDonations: 5670,
    donorCount: 47
  },
  {
    name: 'Veterans Support Network',
    description: 'Supporting military veterans with mental health services, housing assistance, and career development. Honor those who served.',
    website: 'https://www.veteranssupport.org',
    isActive: true,
    isFeatured: false,
    totalDonations: 9100,
    donorCount: 73
  },
  {
    name: 'Hunger Free Communities',
    description: 'Eliminating food insecurity by funding local food banks and community kitchens. No one should go hungry while we play the sport we love.',
    website: 'https://www.hungerfree.org',
    isActive: true,
    isFeatured: false,
    totalDonations: 6890,
    donorCount: 55
  },
  {
    name: 'Youth Golf & Education Trust',
    description: 'Giving underprivileged youth access to golf, education, and mentorship programs. Building the next generation of champions on and off the course.',
    website: 'https://www.youthgolftrust.org',
    isActive: true,
    isFeatured: false,
    totalDonations: 4230,
    donorCount: 38
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if charities already exist
    const existing = await Charity.countDocuments();
    if (existing > 0) {
      console.log(`ℹ️  ${existing} charities already exist. Skipping charity seed.`);
    } else {
      await Charity.insertMany(charities);
      console.log(`✅ ${charities.length} charities added successfully`);
    }

    // Create admin user if not exists
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL || 'admin@golfcharity.com' });
    if (!adminExists) {
      await User.create({
        name: 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@golfcharity.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        role: 'admin',
        subscriptionStatus: 'active',
        subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
      console.log('✅ Admin user created');
      console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@golfcharity.com'}`);
      console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    console.log('\n🎉 Seed complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
