const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// IP real del socket peer. Normaliza IPv6 loopback/v4 y nets virtuales.
function peerIp(req) {
  const raw = (req.socket && req.socket.remoteAddress) || '';
  if (raw === '::1' || raw === '::ffff:127.0.0.1') return '127.0.0.1';
  if (raw.startsWith('::ffff:')) return raw.slice(7);
  return raw || '';
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const trustedIp = peerIp(req);
    // El rate-limit confía en estos headers. Este servidor es el punto de
    // confianza: sobreescribe los valores que el cliente pudiera fabricar.
    if (trustedIp) {
      req.headers['x-forwarded-for'] = trustedIp;
      req.headers['x-real-ip'] = trustedIp;
      // Header interno de confianza: solo este servidor lo establece, por lo
      // que getClientIp puede usarlo sin riesgo de spoofing por el cliente.
      req.headers['x-tpv-peer-ip'] = trustedIp;
    } else {
      delete req.headers['x-forwarded-for'];
      delete req.headers['x-real-ip'];
      delete req.headers['x-tpv-peer-ip'];
    }
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
