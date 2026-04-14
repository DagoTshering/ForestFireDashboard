require('dotenv').config({ path: '../.env' });
const shapefile = require('shapefile');
const fs = require('fs');
const path = require('path');
const { sequelize, FireData } = require('../models/FireData');

async function importAllShapefiles() {
  console.log('Starting dynamic VIIRS SHP data import...');
  console.log(`Target: PostgreSQL via Sequelize`);
  console.log('');

  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    await sequelize.sync({ alter: true });
    console.log('Database synchronized.');

    const dataDir = path.join(__dirname, '../Data');
    const entries = fs.readdirSync(dataDir, { withFileTypes: true });

    const subdirs = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort();

    if (subdirs.length === 0) {
      console.log('No data folders found in Data/');
      console.log('Add folders with shapefiles to server/Data/ and run again.');
      process.exit(0);
    }

    console.log(`Found ${subdirs.length} data folder(s):`);
    subdirs.forEach(dir => console.log(`  - ${dir}`));
    console.log('');

    let totalImported = 0;
    let totalSkipped = 0;

    for (const subdir of subdirs) {
      const subdirPath = path.join(dataDir, subdir);
      const files = fs.readdirSync(subdirPath);

      const archiveFiles = files.filter(f => f.startsWith('fire_archive') && f.endsWith('.shp'));

      if (archiveFiles.length === 0) {
        console.log(`[${subdir}] No archive shapefile found, skipping.`);
        continue;
      }

      for (const archiveFile of archiveFiles) {
        const baseName = archiveFile.replace('.shp', '');
        const shpPath = path.join(subdirPath, archiveFile);
        const dbfPath = path.join(subdirPath, baseName + '.dbf');

        if (!fs.existsSync(dbfPath)) {
          console.log(`[${subdir}] DBF file not found for ${archiveFile}, skipping.`);
          continue;
        }

        console.log(`[${subdir}] Importing ${archiveFile}...`);

        const source = await shapefile.open(shpPath, dbfPath);

        let count = 0;
        let records = [];

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

          if (count % 500 === 0) {
            console.log(`  Processed ${count} records...`);
          }
        }

        console.log(`  Total records: ${count}`);

        try {
          const saved = await FireData.bulkCreate(records, {
            ignoreDuplicates: true
          });
          console.log(`  Imported: ${saved.length} records`);
          totalImported += saved.length;
          totalSkipped += count - saved.length;
        } catch (error) {
          if (error.name === 'SequelizeUniqueConstraintError') {
            console.log(`  Some duplicates skipped`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('');
    console.log('=== Import Complete ===');
    console.log(`Total imported: ${totalImported} records`);
    console.log(`Total skipped (duplicates): ${totalSkipped} records`);

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

importAllShapefiles();
