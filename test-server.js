import { spawn } from 'child_process';

console.log('Testing Business Central MCP Server...');

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send initialization request
const initRequest = {
  jsonrpc: '2.0',
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  },
  id: 1
};

server.stdin.write(JSON.stringify(initRequest) + '\n');

// Handle server output
server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
  
  // Parse response
  try {
    const response = JSON.parse(data.toString());
    if (response.id === 1 && response.result) {
      console.log('✓ Server initialized successfully!');
      console.log('Server name:', response.result.serverInfo.name);
      console.log('Server version:', response.result.serverInfo.version);
      
      // Gracefully close
      setTimeout(() => {
        server.kill();
        process.exit(0);
      }, 1000);
    }
  } catch (e) {
    // Ignore non-JSON output
  }
});

server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Timeout after 5 seconds
setTimeout(() => {
  console.error('Test timeout - no response from server');
  server.kill();
  process.exit(1);
}, 5000);