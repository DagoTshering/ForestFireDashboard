require('dotenv').config({ path: '../.env' });
const { sequelize } = require('../models/FireData');
const FireData = require('../models/FireData').FireData;
const nasaFirmsService = require('../services/nasaFirmsService');

async function seedHistoricalData(days = 30) {
  console.log(`Starting historical data seeding for last ${days} days...`);
  console.log(`Bhutan bounding box: ${process.env.BHUTAN_BBOX}`);

  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    await sequelize.sync({ alter: true });
    console.log('Database synchronized.');

    const existingCount = await FireData.count();
    console.log(`Existing records in database: ${existingCount}`);

    console.log(`Fetching data from NASA FIRMS API...`);
    const nasaData = await nasaFirmsService.fetchHistoricalData(days);

    if (nasaData.length === 0) {
      console.log('No data received from NASA FIRMS API');
      return;
    }

    console.log(`Received ${nasaData.length} records from NASA API`);

    const records = nasaData.map(fire => ({
      latitude: parseFloat(fire.latitude),
      longitude: parseFloat(fire.longitude),
      brightness: fire.brightness ? parseFloat(fire.brightness) : null,
      scan: fire.scan ? parseFloat(fire.scan) : null,
      track: fire.track ? parseFloat(fire.track) : null,
      acq_date: fire.acq_date,
      acq_time: fire.acq_time ? parseInt(fire.acq_time) : null,
      satellite: fire.satellite || null,
      instrument: fire.instrument || null,
      version: fire.version || null,
      confidence: fire.confidence ? parseInt(fire.confidence) : null,
      frp: fire.frp ? parseFloat(fire.frp) : null,
      fire_type: fire.type || fire.fire_type || null,
      created_at: new Date()
    }));

    const savedRecords = await FireData.bulkCreate(records, {
      ignoreDuplicates: true
    });

    console.log(`Successfully saved ${savedRecords.length} new records`);

    const totalCount = await FireData.count();
    console.log(`Total records in database: ${totalCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

const days = parseInt(process.argv[2]) || 30;
seedHistoricalData(days);
