const REPO = process.env.GITHUB_REPO || 'emilypharr75-hub/operations-property-map';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const EDIT_PASSWORD = process.env.EDIT_PASSWORD ||
  process.env.PROPERTY_EDIT_PASSWORD ||
  'MoreMafiaAdmin';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.TOKEN || '';
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || '';
const BUSINESS_OWNER_ROLE_NAME = 'Business Owner';
const { hasLiveStore, readLiveMeta, writeLiveData } = require('../lib/live-store');
const SHUTDOWN_ORGANIZATION_OWNERS = new Set([
  'bm industries',
  'bp (british petroleum)',
  'golden harvest farms',
  'golden harvest farms (676431193276678164)',
  'srt',
  'tampa bay channel 5 news'
]);

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

async function fetchRepoJson(path, ref) {
  const response = await fetch(`https://raw.githubusercontent.com/${REPO}/${ref}/${path}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github.raw+json',
      'User-Agent': 'operations-property-map'
    }
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Could not fetch ${path}`);
  }

  return JSON.parse(text);
}

function normalizeMarker(marker) {
  return {
    id: String(marker.id),
    rect: marker.rect,
    buildingRect: marker.buildingRect || marker.rect,
    points: Array.isArray(marker.points)
      ? marker.points.map(point => [
        Math.round(Number(point?.[0]) || 0),
        Math.round(Number(point?.[1]) || 0)
      ])
      : undefined,
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

function normalizeBlacklistRegion(record, index = 0) {
  const defaultRects = [
    [1083, 577, 1352, 772],
    [577, 1031, 754, 1282],
    [1118, 1189, 1175, 1286],
    [877, 1269, 990, 1394],
    [477, 1407, 535, 1471],
    [1127, 1417, 1211, 1508],
    [955, 1584, 1085, 1653]
  ];

  return {
    id: String(record?.id || `blacklist-${index + 1}`),
    sourceRect: Array.isArray(record?.sourceRect) && record.sourceRect.length === 4
      ? record.sourceRect.map(value => Math.round(Number(value) || 0))
      : defaultRects[index] || defaultRects[0],
    offsetX: Math.min(260, Math.max(-260, Number(record?.offsetX) || 0)),
    offsetY: Math.min(260, Math.max(-260, Number(record?.offsetY) || 0)),
    scale: Math.min(2, Math.max(0.25, Number(record?.scale) || 1))
  };
}

function normalizeBlacklistRegions(records) {
  return Array.isArray(records) && records.length
    ? records.map(normalizeBlacklistRegion)
    : [];
}

function normalizeProperty(property) {
  const price = String(property.price || 'Not for sale');
  const tax = String(property.tax || 'Not for sale');
  const buildingType = String(property.buildingType);
  const shutdownOwner = isShutdownOrganizationOwner(property.owner);
  const owner = shutdownOwner ? 'N/A' : String(property.owner || 'N/A');
  const requestedSaleStatus = shutdownOwner ? 'On Sale' : property.saleStatus;
  const offSale = shouldBeOffSale({
    ...property,
    buildingType,
    owner,
    saleStatus: requestedSaleStatus,
    price,
    tax
  });

  return {
    id: String(property.id),
    name: String(property.name),
    number: String(property.number),
    buildingType,
    owner,
    saleStatus: offSale ? 'Off Sale' : normalizeSaleStatus(requestedSaleStatus),
    price,
    tax,
    custom: Boolean(property.custom)
  };
}

function isShutdownOrganizationOwner(value) {
  const owner = String(value || 'N/A').trim() || 'N/A';
  return SHUTDOWN_ORGANIZATION_OWNERS.has(owner.toLowerCase());
}

function normalizeSaleStatus(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[-_]+/g, ' ');
  return normalized === 'off sale' ? 'Off Sale' : 'On Sale';
}

function isPropertyOwned(property) {
  const owner = String(property.owner || '').trim().toLowerCase();
  return Boolean(owner && owner !== 'n/a' && owner !== 'none');
}

function shouldBeOffSale(property) {
  const buildingType = String(property.buildingType || '').trim().toLowerCase();
  const saleStatus = normalizeSaleStatus(property.saleStatus).toLowerCase();
  const price = String(property.price || '').trim().toLowerCase();
  const tax = String(property.tax || '').trim().toLowerCase();

  return isPropertyOwned(property) ||
    buildingType === 'government' ||
    saleStatus === 'off sale' ||
    price === 'not for sale' ||
    tax === 'not for sale' ||
    price === 'n/a' ||
    tax === 'n/a';
}

function normalizeDirectoryRecord(record, defaultTier = '') {
  const ownerParts = splitOwnerLabelAndId(record.owner, record.ownerId);
  const tierValue = record.tier || defaultTier;

  return {
    id: String(record.id),
    name: String(record.name || ''),
    owner: ownerParts.owner,
    ownerId: ownerParts.ownerId,
    type: String(record.type || ''),
    tier: tierValue ? normalizeMafiaTier(tierValue) : '',
    server: String(record.server || ''),
    logo: String(record.logo || ''),
    registeredAt: String(record.registeredAt || record.createdAt || '')
  };
}

function normalizeMafiaTier(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[-_]+/g, ' ');

  if (normalized === 'tier 2' || normalized === '2') {
    return 'Tier 2';
  }

  if (normalized === 'tier 3' || normalized === '3') {
    return 'Tier 3';
  }

  return 'Tier 1';
}

function splitOwnerLabelAndId(owner, ownerId = '') {
  const ownerEntries = splitCommaSeparatedValues(owner);
  const explicitIds = splitCommaSeparatedValues(ownerId);
  const names = [];
  const embeddedIds = [];

  for (const entry of ownerEntries) {
    const match = entry.match(/^(.*?)\s*\((\d{17,20})\)\s*$/);
    names.push(match ? match[1].trim() : entry);

    if (match) {
      embeddedIds.push(match[2]);
    }
  }

  return {
    owner: names.join(', '),
    ownerId: (explicitIds.length ? explicitIds : embeddedIds).join(', ')
  };
}

function splitCommaSeparatedValues(value) {
  return String(value || '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}

function normalizeDirectories(orgs) {
  return {
    businesses: Array.isArray(orgs?.businesses) ? orgs.businesses.map(record => normalizeDirectoryRecord(record)) : [],
    mafias: Array.isArray(orgs?.mafias) ? orgs.mafias.map(record => normalizeDirectoryRecord(record, 'Tier 1')) : [],
    generalRegulations: Array.isArray(orgs?.generalRegulations) ? orgs.generalRegulations.map(normalizeRegulationRecord) : [],
    billingRegulations: Array.isArray(orgs?.billingRegulations) ? orgs.billingRegulations.map(normalizeRegulationRecord) : [],
    businessRegulations: Array.isArray(orgs?.businessRegulations) ? orgs.businessRegulations.map(normalizeRegulationRecord) : [],
    mafiaRegulations: Array.isArray(orgs?.mafiaRegulations) ? orgs.mafiaRegulations.map(normalizeRegulationRecord) : []
  };
}

function organizationOwnerKeys(record) {
  return [record?.name, record?.id]
    .map(value => String(value || '').trim().toLowerCase())
    .filter(Boolean);
}

function businessOwnerIds(orgs) {
  return new Set((Array.isArray(orgs?.businesses) ? orgs.businesses : [])
    .flatMap(record => splitCommaSeparatedValues(record.ownerId))
    .filter(ownerId => /^\d{17,20}$/.test(ownerId)));
}

function removedBusinessOwnerIds(previousOrgs, nextOrgs) {
  const nextBusinessIds = new Set((Array.isArray(nextOrgs?.businesses) ? nextOrgs.businesses : [])
    .map(record => String(record.id || '').trim().toLowerCase())
    .filter(Boolean));
  const nextBusinessNames = new Set((Array.isArray(nextOrgs?.businesses) ? nextOrgs.businesses : [])
    .map(record => String(record.name || '').trim().toLowerCase())
    .filter(Boolean));
  const remainingOwnerIds = businessOwnerIds(nextOrgs);
  const removedOwnerIds = new Set();

  for (const business of Array.isArray(previousOrgs?.businesses) ? previousOrgs.businesses : []) {
    const id = String(business.id || '').trim().toLowerCase();
    const name = String(business.name || '').trim().toLowerCase();

    if ((id && nextBusinessIds.has(id)) || (name && nextBusinessNames.has(name))) {
      continue;
    }

    for (const ownerId of splitCommaSeparatedValues(business.ownerId)) {
      if (/^\d{17,20}$/.test(ownerId) && !remainingOwnerIds.has(ownerId)) {
        removedOwnerIds.add(ownerId);
      }
    }
  }

  return [...removedOwnerIds];
}

async function discordRequest(path, options = {}) {
  const discordResponse = await fetch(`https://discord.com/api/v10${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!discordResponse.ok && discordResponse.status !== 404) {
    const text = await discordResponse.text();
    throw new Error(text || `Discord API failed with ${discordResponse.status}`);
  }

  return discordResponse.status === 204 ? null : discordResponse.json().catch(() => null);
}

async function removeDeletedBusinessOwnerRoles(ownerIds) {
  if (!ownerIds.length) {
    return { configured: true, removed: [], failed: [] };
  }

  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    return {
      configured: false,
      removed: [],
      failed: ownerIds.map(ownerId => ({ ownerId, reason: 'Discord bot credentials are not configured on Vercel.' }))
    };
  }

  const roles = await discordRequest(`/guilds/${DISCORD_GUILD_ID}/roles`);
  const businessOwnerRole = roles?.find(role =>
    String(role.name || '').toLowerCase() === BUSINESS_OWNER_ROLE_NAME.toLowerCase()
  );

  if (!businessOwnerRole) {
    return {
      configured: true,
      removed: [],
      failed: ownerIds.map(ownerId => ({ ownerId, reason: 'Business Owner role was not found.' }))
    };
  }

  const result = { configured: true, removed: [], failed: [] };

  for (const ownerId of ownerIds) {
    try {
      await discordRequest(
        `/guilds/${DISCORD_GUILD_ID}/members/${ownerId}/roles/${businessOwnerRole.id}`,
        {
          method: 'DELETE',
          headers: {
            'X-Audit-Log-Reason': encodeURIComponent('Business deleted from Operations website')
          }
        }
      );
      result.removed.push(ownerId);
    } catch (error) {
      result.failed.push({ ownerId, reason: error.message });
    }
  }

  return result;
}

function releaseRemovedOrganizationProperties(properties, previousOrgs, nextOrgs) {
  const previousOrganizations = [
    ...(Array.isArray(previousOrgs?.businesses) ? previousOrgs.businesses : []),
    ...(Array.isArray(previousOrgs?.mafias) ? previousOrgs.mafias : [])
  ];
  const nextIds = new Set([
    ...(Array.isArray(nextOrgs?.businesses) ? nextOrgs.businesses : []),
    ...(Array.isArray(nextOrgs?.mafias) ? nextOrgs.mafias : [])
  ].map(record => String(record.id || '').trim().toLowerCase()).filter(Boolean));
  const nextNames = new Set([
    ...(Array.isArray(nextOrgs?.businesses) ? nextOrgs.businesses : []),
    ...(Array.isArray(nextOrgs?.mafias) ? nextOrgs.mafias : [])
  ].map(record => String(record.name || '').trim().toLowerCase()).filter(Boolean));
  const removedOwnerKeys = new Set();

  for (const organization of previousOrganizations) {
    const id = String(organization.id || '').trim().toLowerCase();
    const name = String(organization.name || '').trim().toLowerCase();

    if ((id && nextIds.has(id)) || (name && nextNames.has(name))) {
      continue;
    }

    for (const key of organizationOwnerKeys(organization)) {
      removedOwnerKeys.add(key);
    }
  }

  if (!removedOwnerKeys.size) {
    return [];
  }

  const released = [];

  for (const property of properties) {
    const owner = String(property.owner || '').trim().toLowerCase();

    if (!removedOwnerKeys.has(owner)) {
      continue;
    }

    released.push({
      id: property.id,
      owner: property.owner
    });
    property.owner = 'N/A';
    property.saleStatus = 'On Sale';
  }

  return released;
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
    const blacklistRegions = normalizeBlacklistRegions(body.blacklistRegions);
    const normalizedOrgs = normalizeDirectories(body.orgs);
    const { orgs, pdfFiles } = prepareDirectoriesForSave(normalizedOrgs);
    let liveData = null;
    const [ref, liveMeta] = await Promise.all([
      githubRequest(`/git/ref/heads/${BRANCH}`),
      hasLiveStore() ? readLiveMeta() : Promise.resolve(null)
    ]);
    const currentVersion = liveMeta?.version || ref.object.sha;

    if (body.baseVersion && body.baseVersion !== currentVersion) {
      jsonResponse(response, 409, {
        error: 'The website changed since this editor loaded. Reload before saving again.',
        version: currentVersion
      });
      return;
    }

    const previousOrgs = await fetchRepoJson('public/orgs.json', ref.object.sha)
      .catch(() => ({ businesses: [], mafias: [] }));
    const releasedProperties = releaseRemovedOrganizationProperties(
      properties,
      previousOrgs,
      orgs
    );
    const deletedBusinessOwnerIds = removedBusinessOwnerIds(previousOrgs, orgs);

    const files = {
      'data/web-properties.json': { content: `${JSON.stringify(properties, null, 2)}\n`, encoding: 'utf-8' },
      'data/property-markers.json': { content: `${JSON.stringify(markers, null, 2)}\n`, encoding: 'utf-8' },
      'data/mafia-turfs.json': { content: `${JSON.stringify(turfs, null, 2)}\n`, encoding: 'utf-8' },
      'data/turf-alignment.json': { content: `${JSON.stringify(turfAlignment, null, 2)}\n`, encoding: 'utf-8' },
      'data/blacklist-regions.json': { content: `${JSON.stringify(blacklistRegions, null, 2)}\n`, encoding: 'utf-8' },
      'data/orgs.json': { content: `${JSON.stringify(orgs, null, 2)}\n`, encoding: 'utf-8' },
      'public/properties.json': { content: `${JSON.stringify(properties, null, 2)}\n`, encoding: 'utf-8' },
      'public/property-markers.json': { content: `${JSON.stringify(markers, null, 2)}\n`, encoding: 'utf-8' },
      'public/mafia-turfs.json': { content: `${JSON.stringify(turfs, null, 2)}\n`, encoding: 'utf-8' },
      'public/turf-alignment.json': { content: `${JSON.stringify(turfAlignment, null, 2)}\n`, encoding: 'utf-8' },
      'public/blacklist-regions.json': { content: `${JSON.stringify(blacklistRegions, null, 2)}\n`, encoding: 'utf-8' },
      'public/orgs.json': { content: `${JSON.stringify(orgs, null, 2)}\n`, encoding: 'utf-8' }
    };

    for (const [path, content] of Object.entries(pdfFiles)) {
      files[path] = { content, encoding: 'base64' };
    }

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
        message: `Update property shapes from editor ${new Date().toISOString()}`,
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

    if (hasLiveStore()) {
      liveData = await writeLiveData({
        properties,
        markers,
        turfs,
        turfAlignment,
        blacklistRegions,
        orgs,
        updatedBy: clientId
      });
    }

    const discordRoleSync = await removeDeletedBusinessOwnerRoles(deletedBusinessOwnerIds);

    jsonResponse(response, 200, {
      ok: true,
      commit: newCommit.sha,
      live: Boolean(liveData),
      updatedAt: liveData?.updatedAt || new Date().toISOString(),
      updatedBy: clientId,
      releasedProperties,
      discordRoleSync,
      version: liveData?.version || newCommit.sha
    });
  } catch (error) {
    jsonResponse(response, 500, {
      error: error.message
    });
  }
};

module.exports.releaseRemovedOrganizationProperties = releaseRemovedOrganizationProperties;
module.exports.removedBusinessOwnerIds = removedBusinessOwnerIds;
