const REPO = process.env.GITHUB_REPO || 'emilypharr75-hub/operations-property-map';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const EDIT_PASSWORD = 'MoreBusinesses';
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

function normalizeTurf(turf) {
  return {
    id: String(turf.id),
    number: String(turf.number || ''),
    owner: String(turf.owner || 'Unclaimed'),
    status: String(turf.status || 'Unclaimed'),
    rect: Array.isArray(turf.rect) ? turf.rect.map(value => Math.round(Number(value) || 0)) : [1200, 1200, 1380, 1320],
    rotation: Number(turf.rotation || 0)
  };
}

function normalizeTurfAlignment(record) {
  return {
    scale: Math.min(1.4, Math.max(0.55, Number(record?.scale) || 0.94)),
    offsetX: Math.min(220, Math.max(-220, Number(record?.offsetX) || 0)),
    offsetY: Math.min(220, Math.max(-220, Number(record?.offsetY) || 0))
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
    generalRegulations: Array.isArray(orgs?.generalRegulations) ? orgs.generalRegulations.map(normalizeRegulationRecord) : [],
    billingRegulations: Array.isArray(orgs?.billingRegulations) ? orgs.billingRegulations.map(normalizeRegulationRecord) : [],
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
    pdfData: String(record.pdfData || ''),
    pdfPath: String(record.pdfPath || '')
  };
}

function sanitizeFileName(value) {
  return String(value || 'regulation')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'regulation';
}

function splitDataUrl(value) {
  const match = String(value || '').match(/^data:application\/pdf;base64,([a-z0-9+/=]+)$/i);
  return match ? match[1] : '';
}

function compactRegulationRecord(record) {
  return {
    id: record.id,
    name: record.name,
    regulations: record.regulations,
    pdfName: record.pdfName,
    pdfPath: record.pdfPath
  };
}

function prepareDirectoriesForSave(orgs) {
  const pdfFiles = {};
  const prepared = {
    businesses: orgs.businesses,
    mafias: orgs.mafias,
    generalRegulations: [],
    billingRegulations: [],
    businessRegulations: [],
    mafiaRegulations: []
  };

  for (const key of ['generalRegulations', 'billingRegulations', 'businessRegulations', 'mafiaRegulations']) {
    prepared[key] = orgs[key].map(record => {
      const pdfBase64 = splitDataUrl(record.pdfData);
      const next = { ...record };

      if (pdfBase64) {
        const fileName = sanitizeFileName(`${next.id}-${next.pdfName || 'regulation.pdf'}`);
        const path = `public/assets/regulations/${fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`}`;
        pdfFiles[path] = pdfBase64;
        next.pdfPath = `/${path.replace(/^public\//, '')}`;
      }

      return compactRegulationRecord(next);
    });
  }

  return { orgs: prepared, pdfFiles };
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

    const clientId = typeof body.clientId === 'string' ? body.clientId.slice(0, 120) : '';
    const properties = body.properties.map(normalizeProperty);
    const markers = body.markers.map(normalizeMarker);
    const turfs = Array.isArray(body.turfs) ? body.turfs.map(normalizeTurf) : [];
    const turfAlignment = normalizeTurfAlignment(body.turfAlignment);
    const normalizedOrgs = normalizeDirectories(body.orgs);
    const { orgs, pdfFiles } = prepareDirectoriesForSave(normalizedOrgs);
    let liveData = null;

    if (hasLiveStore()) {
      liveData = await writeLiveData({
        properties,
        markers,
        turfs,
        turfAlignment,
        orgs,
        updatedBy: clientId
      });
    }

    const files = {
      'data/web-properties.json': { content: `${JSON.stringify(properties, null, 2)}\n`, encoding: 'utf-8' },
      'data/property-markers.json': { content: `${JSON.stringify(markers, null, 2)}\n`, encoding: 'utf-8' },
      'data/mafia-turfs.json': { content: `${JSON.stringify(turfs, null, 2)}\n`, encoding: 'utf-8' },
      'data/turf-alignment.json': { content: `${JSON.stringify(turfAlignment, null, 2)}\n`, encoding: 'utf-8' },
      'data/orgs.json': { content: `${JSON.stringify(orgs, null, 2)}\n`, encoding: 'utf-8' },
      'public/properties.json': { content: `${JSON.stringify(properties, null, 2)}\n`, encoding: 'utf-8' },
      'public/property-markers.json': { content: `${JSON.stringify(markers, null, 2)}\n`, encoding: 'utf-8' },
      'public/mafia-turfs.json': { content: `${JSON.stringify(turfs, null, 2)}\n`, encoding: 'utf-8' },
      'public/turf-alignment.json': { content: `${JSON.stringify(turfAlignment, null, 2)}\n`, encoding: 'utf-8' },
      'public/orgs.json': { content: `${JSON.stringify(orgs, null, 2)}\n`, encoding: 'utf-8' }
    };

    for (const [path, content] of Object.entries(pdfFiles)) {
      files[path] = { content, encoding: 'base64' };
    }

    const ref = await githubRequest(`/git/ref/heads/${BRANCH}`);
    const latestCommit = await githubRequest(`/git/commits/${ref.object.sha}`);
    const tree = [];

    for (const [path, file] of Object.entries(files)) {
      const blob = await githubRequest('/git/blobs', {
        method: 'POST',
        body: JSON.stringify({
          content: file.content,
          encoding: file.encoding
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
      updatedBy: clientId,
      version: liveData?.version || newCommit.sha
    });
  } catch (error) {
    jsonResponse(response, 500, {
      error: error.message
    });
  }
};
