// SQLite server launcher
const express = require('express');
const path = require('path');
const { createServer } = require('http');

// Check if running in SQLite mode
const USE_SQLITE = process.env.USE_SQLITE === 'true';

if (USE_SQLITE) {
  console.log('🗄️ Starting in SQLite mode...');
  
  // Import and start SQLite server
  const { startSQLiteServer } = require('./dist/lib/sqlite/server.js');
  startSQLiteServer();
}

// Start the main application server
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle React Router routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`✅ Main server running on port ${PORT}`);
  if (USE_SQLITE) {
    console.log('📊 SQLite API server running on port 3001');
    console.log('🔗 Set USE_SQLITE=true to enable SQLite mode');
  } else {
    console.log('☁️ Using Supabase backend');
  }
});