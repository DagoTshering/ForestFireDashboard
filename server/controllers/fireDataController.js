const { FireData } = require('../models/FireData');
const nasaFirmsService = require('../services/nasaFirmsService');
const { Op } = require('sequelize');
const moment = require('moment');

async function saveFireData(nasaData) {
  const records = nasaData.map(fire => {
    const brightness = fire.brightness || fire.bright_ti4 || null;
    const confidence = parseConfidence(fire.confidence);
    
    return {
      latitude: parseFloat(fire.latitude),
      longitude: parseFloat(fire.longitude),
      brightness: brightness ? parseFloat(brightness) : null,
      scan: fire.scan ? parseFloat(fire.scan) : null,
      track: fire.track ? parseFloat(fire.track) : null,
      acq_date: fire.acq_date,
      acq_time: fire.acq_time ? parseInt(fire.acq_time) : null,
      satellite: fire.satellite || null,
      instrument: fire.instrument || null,
      version: fire.version || null,
      confidence: confidence,
      frp: fire.frp ? parseFloat(fire.frp) : null,
      fire_type: fire.type || fire.daynight || null,
      created_at: new Date()
    };
  });

  try {
    const result = await FireData.bulkCreate(records, {
      ignoreDuplicates: true
    });
    return result.length;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.log('Some duplicate records skipped');
      return 0;
    }
    throw error;
  }
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

class FireDataController {
  async getFireData(req, res) {
    try {
      const { days, start, end, source } = req.query;
      
      let whereClause = {};
      
      if (start && end) {
        whereClause.acq_date = {
          [Op.between]: [start, end]
        };
      } else if (days) {
        const daysInt = parseInt(days);
        if (daysInt > 0 && daysInt <= 30) {
          const startDate = moment().subtract(daysInt, 'days').format('YYYY-MM-DD');
          const endDate = moment().format('YYYY-MM-DD');
          whereClause.acq_date = {
            [Op.between]: [startDate, endDate]
          };
        }
      }

      const fireData = await FireData.findAll({
        where: whereClause,
        order: [['acq_date', 'DESC'], ['acq_time', 'DESC']],
        limit: 10000
      });

      res.json({
        success: true,
        count: fireData.length,
        data: fireData
      });
    } catch (error) {
      console.error('Error fetching fire data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch fire data',
        message: error.message
      });
    }
  }

  async fetchAndSaveLatest(req, res) {
    try {
      const { days = 1 } = req.query;
      const daysInt = Math.min(parseInt(days), 5);
      
      const nasaData = await nasaFirmsService.fetchLatestData(daysInt);
      
      if (nasaData.length === 0) {
        return res.json({
          success: true,
          message: 'No new fire data available',
          count: 0
        });
      }

      const savedRecords = await saveFireData(nasaData);

      res.json({
        success: true,
        message: `Fetched and saved ${savedRecords} records`,
        count: savedRecords
      });
    } catch (error) {
      console.error('Error fetching latest data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch latest fire data',
        message: error.message
      });
    }
  }

  async getStatistics(req, res) {
    try {
      const stats = await FireData.findAll({
        attributes: [
          'acq_date',
          [FireData.sequelize.fn('COUNT', FireData.col('id')), 'count'],
          [FireData.sequelize.fn('AVG', FireData.col('frp')), 'avg_frp'],
          [FireData.sequelize.fn('MAX', FireData.col('frp')), 'max_frp']
        ],
        group: ['acq_date'],
        order: [['acq_date', 'DESC']],
        limit: 30
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
        message: error.message
      });
    }
  }

  async getLatestFromAPI(req, res) {
    try {
      const { days = 1 } = req.query;
      const daysInt = Math.min(parseInt(days), 5);
      
      const data = await nasaFirmsService.fetchLatestData(daysInt);

      res.json({
        success: true,
        source: 'NASA FIRMS',
        count: data.length,
        data: data
      });
    } catch (error) {
      console.error('Error fetching from NASA API:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch from NASA FIRMS API',
        message: error.message
      });
    }
  }
}

module.exports = new FireDataController();
