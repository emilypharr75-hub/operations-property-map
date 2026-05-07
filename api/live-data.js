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

async function fetchGithubRef() {
  const response = await fetch(`https://api.github.com/repos/${REPO}/git/ref/heads/${BRANCH}?t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      ...githubHeaders(),
      'Cache-Control': 'no-store'
    }
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Could not resolve ${BRANCH}`);
  }

  return data.object.sha;
}

async function fetchRepoJson(path, ref) {
  const response = await fetch(`https://raw.githubusercontent.com/${REPO}/${ref}/${path}`, {
    cache: 'no-store',
    headers: githubHeaders()
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

function metaResponse(response, { version, source, updatedBy = '' }) {
  jsonResponse(response, 200, {
    unchanged: false,
    version,
    source,
    updatedBy,
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
    const wantsFullData = getSearchParam(request, 'full') === '1';

    if (hasLiveStore()) {
      const meta = await readLiveMeta();

      if (meta?.version) {
        if (since === meta.version) {
          unchangedResponse(response, meta.version, 'live-store');
          return;
        }

        if (!wantsFullData) {
          metaResponse(response, {
            version: meta.version,
            source: 'live-store',
            updatedBy: meta.updatedBy
          });
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

        if (!wantsFullData) {
          metaResponse(response, {
            version,
            source: 'live-store',
            updatedBy: liveData.updatedBy
          });
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

    const ref = await fetchGithubRef();

    if (since === ref) {
      unchangedResponse(response, ref, 'github');
      return;
    }

    if (!wantsFullData) {
      metaResponse(response, {
        version: ref,
        source: 'github'
      });
      return;
    }

    const [properties, markers, orgs] = await Promise.all([
      fetchRepoJson('public/properties.json', ref),
      fetchRepoJson('public/property-markers.json', ref),
      fetchRepoJson('public/orgs.json', ref)
    ]);

    jsonResponse(response, 200, {
      properties,
      markers,
      orgs,
      version: ref,
      source: 'github',
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    jsonResponse(response, 500, { error: error.message });
  }
};
