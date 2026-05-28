import { readFileSync } from 'fs';
import { createServer } from 'http';

// Load .env.local
const env = {};
try {
  readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const eqIndex = line.indexOf('=');
    if (eqIndex > 0 && !line.startsWith('#')) {
      env[line.slice(0, eqIndex).trim()] = line.slice(eqIndex + 1).trim().replace(/^"|"$/g, '');
    }
  });
} catch {}

const OPENAI_API_KEY = env.OPENAI_API_KEY;

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { messages } = JSON.parse(body);
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({ model: 'gpt-3.5-turbo', messages, max_tokens: 500 }),
        });
        const data = await response.json();
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (err) {
        res.writeHead(500); res.end(JSON.stringify({ error: 'Server error' }));
      }
    });
  } else {
    res.writeHead(404); res.end();
  }
});

server.listen(3001, () => console.log('Local API running on http://localhost:3001'));
