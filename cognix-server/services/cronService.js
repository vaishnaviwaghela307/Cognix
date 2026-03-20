/**
 * Cron Job Service for Cognix
 * Keeps both Node.js and Flask servers alive by pinging health endpoints
 */

const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

// Server URLs from environment variables
const NODE_SERVER_URL = process.env.NODE_SERVER_URL || 'http://localhost:3000';
const FLASK_SERVER_URL = process.env.FLASK_SERVER_URL || 'http://localhost:5000';

/**
 * Ping a server's health endpoint
 * @param {string} serverName - Name of the server
 * @param {string} url - Health check URL
 */
async function pingServer(serverName, url) {
  try {
    const response = await axios.get(url, {
      timeout: 5000, // 5 second timeout
      headers: {
        'User-Agent': 'Cognix-Cron-Job/1.0'
      }
    });
    
    console.log(`✅ [${new Date().toISOString()}] ${serverName} is alive - Status: ${response.status}`);
    return true;
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] ${serverName} ping failed:`, error.message);
    return false;
  }
}

/**
 * Initialize cron jobs
 */
function initializeCronJobs() {
  console.log('\n' + '='.repeat(60));
  console.log('🕐 Initializing Cron Jobs for Server Health Checks');
  console.log('='.repeat(60));
  console.log(`📍 Node Server: ${NODE_SERVER_URL}/health`);
  console.log(`📍 Flask Server: ${FLASK_SERVER_URL}/health`);
  console.log('='.repeat(60) + '\n');

  // Ping Node.js server every 10 seconds
  cron.schedule('*/10 * * * * *', async () => {
    await pingServer('Node.js Server', `${NODE_SERVER_URL}/health`);
  });

  // Ping Flask server every 10 seconds
  cron.schedule('*/10 * * * * *', async () => {
    await pingServer('Flask Server', `${FLASK_SERVER_URL}/health`);
  });

  console.log('✅ Cron jobs started successfully!');
  console.log('⏰ Pinging both servers every 10 seconds...\n');
}

// Start cron jobs if this file is run directly
if (require.main === module) {
  initializeCronJobs();
  
  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping cron jobs...');
    process.exit(0);
  });
}

module.exports = { initializeCronJobs, pingServer };
