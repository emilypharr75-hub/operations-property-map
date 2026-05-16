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
      orgs: data.orgs || {},
      turfs: data.turfs || [],
      turfAlignment: data.turfAlignment || {},
      blacklistRegions: data.blacklistRegions || []
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

function sanitizeFileName(value) {
  return String(value || 'regulation')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'regulation';
}

function regulationPdfPath(record) {
  if (record.pdfPath) {
    return String(record.pdfPath);
  }

  if (!record.pdfData) {
    return '';
  }

  const fileName = sanitizeFileName(`${record.id || 'regulation'}-${record.pdfName || 'regulation.pdf'}`);
  return `/assets/regulations/${fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`}`;
}

function compactRegulationRecord(record) {
  return {
    id: String(record.id || ''),
    name: String(record.name || ''),
    regulations: String(record.regulations || ''),
    pdfName: String(record.pdfName || ''),
    pdfPath: regulationPdfPath(record)
  };
}

function compactDirectoryRecord(record) {
  const ownerParts = splitOwnerLabelAndId(record.owner, record.ownerId);

  return {
    id: String(record.id || ''),
    name: String(record.name || ''),
    owner: ownerParts.owner,
    ownerId: ownerParts.ownerId,
    type: String(record.type || ''),
    server: String(record.server || ''),
    logo: String(record.logo || ''),
    registeredAt: String(record.registeredAt || record.createdAt || '')
  };
}

function splitOwnerLabelAndId(owner, ownerId = '') {
  const text = String(owner || '').trim();
  const explicitId = String(ownerId || '').trim();
  const match = text.match(/^(.*?)\s*\((\d{17,20})\)\s*$/);

  if (!match) {
    return {
      owner: text,
      ownerId: explicitId
    };
  }

  return {
    owner: match[1].trim(),
    ownerId: explicitId || match[2]
  };
}

function compactOrgs(orgs = {}) {
  return {
    businesses: Array.isArray(orgs.businesses) ? orgs.businesses.map(compactDirectoryRecord) : [],
    mafias: Array.isArray(orgs.mafias) ? orgs.mafias.map(compactDirectoryRecord) : [],
    generalRegulations: Array.isArray(orgs.generalRegulations) ? orgs.generalRegulations.map(compactRegulationRecord) : [],
    billingRegulations: Array.isArray(orgs.billingRegulations) ? orgs.billingRegulations.map(compactRegulationRecord) : [],
    businessRegulations: Array.isArray(orgs.businessRegulations) ? orgs.businessRegulations.map(compactRegulationRecord) : [],
    mafiaRegulations: Array.isArray(orgs.mafiaRegulations) ? orgs.mafiaRegulations.map(compactRegulationRecord) : []
  };
}

function compactLiveData(data) {
  return {
    properties: Array.isArray(data.properties) ? data.properties : [],
    markers: Array.isArray(data.markers) ? data.markers : [],
    orgs: compactOrgs(data.orgs),
    turfs: Array.isArray(data.turfs) ? data.turfs : [],
    turfAlignment: data.turfAlignment || { scale: 0.94, offsetX: 0, offsetY: 0 },
    blacklistRegions: Array.isArray(data.blacklistRegions) ? data.blacklistRegions : [],
    updatedBy: data.updatedBy || '',
    updatedAt: data.updatedAt,
    version: data.version
  };
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

        const compactedLiveData = compactLiveData(liveData);

        if (!compactedLiveData.turfs.length || !compactedLiveData.blacklistRegions.length) {
          const ref = await fetchGithubRef();
          if (!compactedLiveData.turfs.length) {
            compactedLiveData.turfs = await fetchRepoJson('public/mafia-turfs.json', ref).catch(() => []);
            compactedLiveData.turfAlignment = await fetchRepoJson('public/turf-alignment.json', ref).catch(() => compactedLiveData.turfAlignment);
          }
          if (!compactedLiveData.blacklistRegions.length) {
            compactedLiveData.blacklistRegions = await fetchRepoJson('public/blacklist-regions.json', ref).catch(() => compactedLiveData.blacklistRegions);
          }
        }

        jsonResponse(response, 200, {
          ...compactedLiveData,
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

    const [properties, markers, orgs, turfs, turfAlignment, blacklistRegions] = await Promise.all([
      fetchRepoJson('public/properties.json', ref),
      fetchRepoJson('public/property-markers.json', ref),
      fetchRepoJson('public/orgs.json', ref),
      fetchRepoJson('public/mafia-turfs.json', ref).catch(() => []),
      fetchRepoJson('public/turf-alignment.json', ref).catch(() => ({ scale: 0.94, offsetX: 0, offsetY: 0 })),
      fetchRepoJson('public/blacklist-regions.json', ref).catch(() => [])
    ]);

    jsonResponse(response, 200, {
      properties,
      markers,
      orgs: compactOrgs(orgs),
      turfs,
      turfAlignment,
      blacklistRegions,
      version: ref,
      source: 'github',
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    jsonResponse(response, 500, { error: error.message });
  }
};
