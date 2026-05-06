const REPO = process.env.GITHUB_REPO || 'emilypharr75-hub/operations-property-map';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const EDIT_PASSWORD = process.env.EDIT_PASSWORD || 'BillingForTheWin';
const { hasLiveStore, writeLiveData } = require('../lib/live-store');

function jsonResponse(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.end(JSON.stringify(body));
}

function githubHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'operations-property-map'
  };
}

async function githubRequest(path, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...options,
    headers: {
      ...githubHeaders(),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.message || `GitHub request failed with ${response.status}`);
  }

  return data;
}

function normalizeMarker(marker) {
  return {
    id: String(marker.id),
    rect: marker.rect,
    buildingRect: marker.buildingRect || marker.rect,
    rotation: Number(marker.rotation || 0),
    custom: Boolean(marker.custom)
  };
}

function normalizeProperty(property) {
  return {
    id: String(property.id),
    name: String(property.name),
    number: String(property.number),
    buildingType: String(property.buildingType),
    owner: String(property.owner),
    price: String(property.price),
    tax: String(property.tax),
    custom: Boolean(property.custom)
  };
}

function normalizeDirectoryRecord(record) {
  return {
    id: String(record.id),
    name: String(record.name || ''),
    owner: String(record.owner || ''),
    type: String(record.type || ''),
    server: String(record.server || ''),
    logo: String(record.logo || '')
  };
}

function normalizeDirectories(orgs) {
  return {
    businesses: Array.isArray(orgs?.businesses) ? orgs.businesses.map(normalizeDirectoryRecord) : [],
    mafias: Array.isArray(orgs?.mafias) ? orgs.mafias.map(normalizeDirectoryRecord) : [],
    businessRegulations: Array.isArray(orgs?.businessRegulations) ? orgs.businessRegulations.map(normalizeRegulationRecord) : [],
    mafiaRegulations: Array.isArray(orgs?.mafiaRegulations) ? orgs.mafiaRegulations.map(normalizeRegulationRecord) : []
  };
}

function normalizeRegulationRecord(record) {
  return {
    id: String(record.id),
    name: String(record.name || ''),
    regulations: String(record.regulations || ''),
    pdfName: String(record.pdfName || ''),
    pdfData: String(record.pdfData || '')
  };
}

module.exports = async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    jsonResponse(response, 204, {});
    return;
  }

  if (request.method !== 'POST') {
    jsonResponse(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (!process.env.GITHUB_TOKEN) {
    jsonResponse(response, 500, { error: 'Missing GITHUB_TOKEN on Vercel.' });
    return;
  }

  try {
    const body = typeof request.body === 'string'
      ? JSON.parse(request.body || '{}')
      : request.body || {};

    if (body.password !== EDIT_PASSWORD) {
      jsonResponse(response, 401, { error: 'Invalid edit password.' });
      return;
    }

    if (!Array.isArray(body.properties) || !Array.isArray(body.markers)) {
      jsonResponse(response, 400, { error: 'Missing properties or markers.' });
      return;
    }

    const properties = body.properties.map(normalizeProperty);
    const markers = body.markers.map(normalizeMarker);
    const orgs = normalizeDirectories(body.orgs);
    let liveData = null;

    if (hasLiveStore()) {
      liveData = await writeLiveData({
        properties,
        markers,
        orgs
      });
    }

    const files = {
      'data/web-properties.json': `${JSON.stringify(properties, null, 2)}\n`,
      'data/property-markers.json': `${JSON.stringify(markers, null, 2)}\n`,
      'data/orgs.json': `${JSON.stringify(orgs, null, 2)}\n`,
      'public/properties.json': `${JSON.stringify(properties, null, 2)}\n`,
      'public/property-markers.json': `${JSON.stringify(markers, null, 2)}\n`,
      'public/orgs.json': `${JSON.stringify(orgs, null, 2)}\n`
    };

    const ref = await githubRequest(`/git/ref/heads/${BRANCH}`);
    const latestCommit = await githubRequest(`/git/commits/${ref.object.sha}`);
    const tree = [];

    for (const [path, content] of Object.entries(files)) {
      const blob = await githubRequest('/git/blobs', {
        method: 'POST',
        body: JSON.stringify({
          content,
          encoding: 'utf-8'
        })
      });

      tree.push({
        path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      });
    }

    const newTree = await githubRequest('/git/trees', {
      method: 'POST',
      body: JSON.stringify({
        base_tree: latestCommit.tree.sha,
        tree
      })
    });

    const newCommit = await githubRequest('/git/commits', {
      method: 'POST',
      body: JSON.stringify({
        message: `Update property boxes from editor ${new Date().toISOString()}`,
        tree: newTree.sha,
        parents: [ref.object.sha]
      })
    });

    await githubRequest(`/git/refs/heads/${BRANCH}`, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommit.sha
      })
    });

    jsonResponse(response, 200, {
      ok: true,
      commit: newCommit.sha,
      live: Boolean(liveData),
      updatedAt: liveData?.updatedAt || new Date().toISOString(),
      properties,
      markers,
      orgs
    });
  } catch (error) {
    jsonResponse(response, 500, {
      error: error.message
    });
  }
};
