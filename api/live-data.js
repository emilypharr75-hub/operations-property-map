const REPO = process.env.GITHUB_REPO || 'emilypharr75-hub/operations-property-map';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const crypto = require('crypto');
const { hasLiveStore, readLiveData, readLiveMeta } = require('../lib/live-store');

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
  const response = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}?t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      ...githubHeaders(),
      'Cache-Control': 'no-store'
    }
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Could not fetch ${path}`);
  }

  return JSON.parse(text);
}

function getSearchParam(request, name) {
  return new URL(request.url || '/', 'https://operations.local').searchParams.get(name);
}

function versionFor(data) {
  if (data.version || data.updatedAt) {
    return data.version || data.updatedAt;
  }

  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      properties: data.properties || [],
      markers: data.markers || [],
      orgs: data.orgs || {}
    }))
    .digest('hex');
}

function unchangedResponse(response, version, source) {
  jsonResponse(response, 200, {
    unchanged: true,
    version,
    source,
    checkedAt: new Date().toISOString()
  });
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
    const since = getSearchParam(request, 'since');

    if (hasLiveStore()) {
      if (since) {
        const meta = await readLiveMeta();

        if (meta?.version === since) {
          unchangedResponse(response, meta.version, 'live-store');
          return;
        }
      }

      const liveData = await readLiveData();

      if (liveData) {
        const version = versionFor(liveData);

        if (since === version) {
          unchangedResponse(response, version, 'live-store');
          return;
        }

        jsonResponse(response, 200, {
          ...liveData,
          version,
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
    const version = versionFor({ properties, markers, orgs });

    if (since === version) {
      unchangedResponse(response, version, 'github');
      return;
    }

    jsonResponse(response, 200, {
      properties,
      markers,
      orgs,
      version,
      source: 'github',
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    jsonResponse(response, 500, { error: error.message });
  }
};
