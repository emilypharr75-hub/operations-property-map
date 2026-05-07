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
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream'
    });
    response.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`Preview running at http://${host}:${port}`);
});
