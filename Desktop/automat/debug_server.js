
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3003;
const APP_ROOT = path.resolve();
const PUBLIC_DIR = path.join(APP_ROOT, 'public');

console.log('=== DEBUG SERVER ===');
console.log('APP_ROOT:', APP_ROOT);
console.log('PUBLIC_DIR:', PUBLIC_DIR);
console.log('public contents:', fs.readdirSync(PUBLIC_DIR));

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  
  console.log('');
  console.log(`---- NEW REQUEST ----`);
  console.log(`Method: ${req.method}`);
  console.log(`Path:   ${pathname}`);
  console.log(`UA:     ${req.headers['user-agent']}`);
  
  // Log requests
  if (!pathname.startsWith('/styles.css') && !pathname.startsWith('/app.js') && !pathname.startsWith('/creador.js')) {
    console.log(`[${new Date().toTimeString().split(' ')[0]}] ${req.method} ${pathname}`);
  }
  
  // Live Demo Viewer (/demo/:id)
  if (pathname.startsWith('/demo/')) {
    const demoId = pathname.replace('/demo/', '').trim();
    console.log(`[demo] ID: ${demoId}`);
    
    if (!/^[a-zA-Z0-9_]+$/.test(demoId)) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('ID de demo no válido');
      return;
    }
    
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Demo not implemented in debug server' }));
    return;
  }
  
  // API routes - not implemented in debug version
  if (pathname.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API not implemented in debug server' }));
    return;
  }
  
  // Clean Route Mapping
  let file = pathname.replace(/^\//, '');
  console.log(`[mapping] raw path -> "${pathname}" => file="${file}"`);
  
  if (file === '' || file === 'home') {
    file = 'home.html';
  } else if (file === 'buscador') {
    file = 'index.html';
  } else if (file === 'creador') {
    file = 'creador.html';
  }
  console.log(`[mapping] after mapping: file="${file}"`);
  
  // Sanitize path
  file = path.normalize(file);
  console.log(`[sanitize] after normalize: file="${file}"`);
  console.log(`[sanitize] startsWith('..'): ${file.startsWith('..')}`);
  console.log(`[sanitize] isAbsolute: ${path.isAbsolute(file)}`);
  
  if (file.startsWith('..') || path.isAbsolute(file)) {
    console.log('[BLOCKED] Path traversal detected!');
    fs.readFile(path.join(APP_ROOT, 'public', '404.html'), (err, content) => {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('Archivo no encontrado');
    });
    return;
  }
  
  let filePath = path.join(APP_ROOT, 'public', file);
  console.log(`[resolve] filePath: "${filePath}"`);
  console.log(`[exists] fs.existsSync: ${fs.existsSync(filePath)}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`[404] File not found!`);
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('Archivo no encontrado');
    return;
  }
  
  const ext = path.extname(filePath);
  console.log(`[ext] extname: "${ext}"`);
  console.log(`[mime] mime: "${MIME_TYPES[ext] || 'application/octet-stream'}"`);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      console.log(`[500] Error reading file: ${err.code} - ${err.message}`);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('Archivo no encontrado');
    } else {
      console.log(`[200] Serving ${content.length} bytes`);
      res.writeHead(200, { 'Content-Type': mime });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\nDebug server running on http://localhost:${PORT}`);
  console.log('Testing styles.css...');
  http.get('http://localhost:' + PORT + '/styles.css', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log(`Response status: ${res.statusCode}`);
      console.log(`Content-Type: ${res.headers['content-type']}`);
      console.log(`Length: ${data.length}`);
      if (data.length === 0) {
        console.log('EMPTY RESPONSE - CSS NOT SERVED!');
      } else {
        console.log('First 100 chars:', data.substring(0, 100));
      }
    });
  });
});
