require('dotenv').config({ path: '../.env' });
const shapefile = require('shapefile');
const { sequelize, FireData } = require('../models/FireData');

async function importShapefile() {
  console.log('Starting VIIRS SHP data import...');
  console.log(`Source: Data/fire_archive_SV-C2_739417.shp`);
  console.log(`Target: PostgreSQL via Sequelize`);

  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    await sequelize.sync({ alter: true });
    console.log('Database synchronized.');

    const source = await shapefile.open(
      'Data/fire_archive_SV-C2_739417.shp',
      'Data/fire_archive_SV-C2_739417.dbf'
    );

    let count = 0;
    let records = [];

    console.log('Reading shapefile...');

    while (true) {
      const result = await source.read();
      if (result.done) break;

      const props = result.value.properties;

      const record = {
        latitude: parseFloat(props.LATITUDE),
        longitude: parseFloat(props.LONGITUDE),
        brightness: props.BRIGHTNESS ? parseFloat(props.BRIGHTNESS) : null,
        scan: props.SCAN ? parseFloat(props.SCAN) : null,
        track: props.TRACK ? parseFloat(props.TRACK) : null,
        acq_date: formatDate(props.ACQ_DATE),
        acq_time: props.ACQ_TIME ? parseInt(props.ACQ_TIME) : null,
        satellite: props.SATELLITE || null,
        instrument: props.INSTRUMENT || null,
        version: props.VERSION || null,
        confidence: parseConfidence(props.CONFIDENCE),
        frp: props.FRP ? parseFloat(props.FRP) : null,
        fire_type: props.TYPE !== undefined ? String(props.TYPE) : null,
        created_at: new Date()
      };

      records.push(record);
      count++;

      if (count % 100 === 0) {
        console.log(`Processed ${count} records...`);
      }
    }

    console.log(`Total records read: ${count}`);

    console.log('Inserting records into database...');
    const saved = await FireData.bulkCreate(records, {
      ignoreDuplicates: true
    });

    console.log(`Successfully imported ${saved.length} records`);

    const total = await FireData.count();
    console.log(`Total records in database: ${total}`);

    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

function formatDate(dateValue) {
  if (!dateValue) return null;

  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }

  if (typeof dateValue === 'string') {
    return dateValue.split('T')[0];
  }

  return new Date(dateValue).toISOString().split('T')[0];
}

function parseConfidence(confidence) {
  if (!confidence) return null;

  if (typeof confidence === 'number') return confidence;

  const confMap = {
    'l': 25,
    'n': 50,
    'h': 75
  };

  return confMap[confidence.toLowerCase()] || 50;
}

importShapefile();
