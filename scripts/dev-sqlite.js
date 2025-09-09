#!/usr/bin/env node

// Development script to run both React app and SQLite server
const { spawn } = require('child_process');
const path = require('path');

// Set SQLite environment
process.env.USE_SQLITE = 'true';
process.env.SQLITE_PORT = '3001';
process.env.JWT_SECRET = 'dev-jwt-secret-change-in-production';

console.log('🗄️ Starting SQLite development mode...\n');

// Function to run a command
function runCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...options.env },
    ...options
  });

  child.on('error', (err) => {
    console.error(`Error running ${command}:`, err);
  });

  return child;
}

// Start SQLite server (simplified for development)
console.log('📦 Starting SQLite API server on port 3001...');
const sqliteServer = spawn('node', ['-e', `
  const express = require('express');
  const cors = require('cors');
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  
  // Mock endpoints for development
  app.get('/api/health', (req, res) => {
    res.json({ status: 'SQLite API ready', mode: 'development' });
  });
  
  app.listen(3001, () => {
    console.log('✅ SQLite API server running on port 3001');
  });
`], {
  stdio: 'inherit',
  env: { ...process.env }
});

// Wait a moment for SQLite server to start
setTimeout(() => {
  console.log('🚀 Starting React development server...\n');
  
  // Start React dev server
  const reactServer = runCommand('npm', ['run', 'dev'], {
    env: {
      USE_SQLITE: 'true',
      VITE_USE_SQLITE: 'true'
    }
  });

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development servers...');
    sqliteServer.kill();
    reactServer.kill();
    process.exit(0);
  });
}, 2000);