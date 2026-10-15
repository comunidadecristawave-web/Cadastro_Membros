/* Servidor estático mínimo (sem dependências) que publica ../versao-nova para os testes E2E.
   Por segurança, NUNCA serve config.local.js (pode conter credenciais reais de produção)
   nem rotas /api/* e /.netlify/* — essas são sempre respondidas pelo mock dentro dos testes. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', 'versao-nova');
const PORTA = Number(process.env.PORT || 4173);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.csv': 'text/csv; charset=utf-8'
};

const BLOQUEADOS = [/config\.local\.js$/i, /^\/api\//i, /^\/\.netlify\//i];

http.createServer((req, res) => {
  let caminho;
  try {
    caminho = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    res.writeHead(400); res.end(); return;
  }

  if (BLOQUEADOS.some(rx => rx.test(caminho))) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('bloqueado no ambiente de testes');
    return;
  }

  if (caminho === '/' || caminho === '/cadastro') caminho = '/index.html';
  const arquivo = path.normalize(path.join(RAIZ, caminho));
  if (!arquivo.startsWith(RAIZ)) { res.writeHead(403); res.end(); return; }

  fs.readFile(arquivo, (err, dados) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('não encontrado'); return; }
    // Windows é case-insensitive; a Netlify (Linux) não. Mantemos o comportamento do disco.
    res.writeHead(200, {
      'content-type': TIPOS[path.extname(arquivo).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    res.end(dados);
  });
}).listen(PORTA, '127.0.0.1', () => {
  console.log(`[servidor-estatico] servindo ${RAIZ} em http://localhost:${PORTA}`);
});
