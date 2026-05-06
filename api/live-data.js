const REPO = process.env.GITHUB_REPO || 'emilypharr75-hub/operations-property-map';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const { hasLiveStore, readLiveData } = require('../lib/live-store');

function jsonResponse(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.end(JSON.stringify(body));
}

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'operations-property-map'
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function fetchRepoJson(path) {
  const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`, {
    headers: githubHeaders()
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Could not fetch ${path}`);
  }

  return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
}

module.exports = async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    jsonResponse(response, 204, {});
    return;
  }

  if (request.method !== 'GET') {
    jsonResponse(response, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    if (hasLiveStore()) {
      const liveData = await readLiveData();

      if (liveData) {
        jsonResponse(response, 200, {
          ...liveData,
          source: 'live-store',
          checkedAt: new Date().toISOString()
        });
        return;
      }
    }

    const [properties, markers, orgs] = await Promise.all([
      fetchRepoJson('public/properties.json'),
      fetchRepoJson('public/property-markers.json'),
      fetchRepoJson('public/orgs.json')
    ]);

    jsonResponse(response, 200, {
      properties,
      markers,
      orgs,
      source: 'github',
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    jsonResponse(response, 500, { error: error.message });
  }
};
