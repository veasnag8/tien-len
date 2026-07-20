/**
 * Single-port proxy for Cloudflare Tunnel.
 * Routes /api and /socket.io → backend:4000, everything else → frontend:3000
 */
const http = require('http');
const httpProxy = require('http-proxy');

const PORT = Number(process.env.TUNNEL_PROXY_PORT || 8080);
const proxy = httpProxy.createProxyServer({ ws: true, xfwd: true });

proxy.on('error', (err, req, res) => {
  console.error('[proxy]', err.message);
  if (res && !res.headersSent && typeof res.writeHead === 'function') {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Service starting… try again in a few seconds.');
  }
});

const server = http.createServer((req, res) => {
  const url = req.url ?? '/';
  const backend = url.startsWith('/api') || url.startsWith('/socket.io');
  proxy.web(req, res, {
    target: backend ? 'http://127.0.0.1:4000' : 'http://127.0.0.1:3000',
    changeOrigin: true,
  });
});

server.on('upgrade', (req, socket, head) => {
  const url = req.url ?? '';
  const target = url.startsWith('/socket.io')
    ? 'http://127.0.0.1:4000'
    : 'http://127.0.0.1:3000';
  proxy.ws(req, socket, head, { target, changeOrigin: true });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[proxy] listening on http://127.0.0.1:${PORT}`);
});
