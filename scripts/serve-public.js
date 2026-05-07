const fs = require('fs');
const http = require('http');
const path = require('path');

const port = Number(process.env.PORT || 4173);
const host = '127.0.0.1';
const root = path.join(__dirname, '..', 'public');
const contentTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function getCacheControl(filePath) {
  const relativePath = path.relative(root, filePath).replace(/\\/g, '/');
  const extension = path.extname(filePath);

  if (relativePath.startsWith('assets/')) {
    return 'public, max-age=31536000, immutable';
  }

  if (extension === '.css' || extension === '.js') {
    return 'public, max-age=3600, stale-while-revalidate=86400';
  }

  if (extension === '.json') {
    return 'no-cache';
  }

  return 'no-cache';
}

const server = http.createServer((request, response) => {
  let urlPath = decodeURIComponent(request.url.split('?')[0]);

  if (urlPath === '/') {
    urlPath = '/index.html';
  }

  const filePath = path.join(root, urlPath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': getCacheControl(filePath)
    });
    response.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`Preview running at http://${host}:${port}`);
});
