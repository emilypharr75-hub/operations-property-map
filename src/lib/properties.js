const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { logger } = require('./logger');

const CHECK_PROPERTY_CHANNEL_ID = '1491639237693673593';
const PROPERTY_MOVEMENT_LOG_CHANNEL_ID = '1501750254125580430';
const DEFAULT_WEBSITE_BASE_URL = 'https://floridastateoperations.vercel.app';
const WEBSITE_BASE_URL = String(process.env.PROPERTY_WEBSITE_URL || DEFAULT_WEBSITE_BASE_URL).replace(/\/+$/u, '');
const EDIT_PASSWORD = process.env.PROPERTY_EDIT_PASSWORD || 'MoreBusinesses';
const CACHE_MS = 300000;
const FETCH_TIMEOUT_MS = 10000;

const LOCAL_PROPERTIES_PATH = path.join(__dirname, '..', '..', 'public', 'properties.json');
const LOCAL_MARKERS_PATH = path.join(__dirname, '..', '..', 'public', 'property-markers.json');
const LOCAL_ORGS_PATH = path.join(__dirname, '..', '..', 'public', 'orgs.json');
const DATA_PROPERTIES_PATH = path.join(__dirname, '..', '..', 'data', 'web-properties.json');
const DATA_MARKERS_PATH = path.join(__dirname, '..', '..', 'data', 'property-markers.json');
const DATA_ORGS_PATH = path.join(__dirname, '..', '..', 'data', 'orgs.json');
const PROPERTY_HISTORY_PATH = path.join(__dirname, '..', '..', 'data', 'property-history.json');

let cachedData = null;
let cachedAt = 0;

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readPropertyHistory() {
  return readJson(PROPERTY_HISTORY_PATH, {});
}

function writePropertyHistory(history) {
  writeJson(PROPERTY_HISTORY_PATH, history);
}

function addPropertyHistoryEntry(propertyId, entry) {
  const history = readPropertyHistory();
  const entries = Array.isArray(history[propertyId]) ? history[propertyId] : [];

  entries.push({
    ...entry,
    at: new Date().toISOString()
  });

  history[propertyId] = entries;
  writePropertyHistory(history);
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text.slice(0, 240) || `Request failed with ${response.status}` };
    }

    if (!response.ok) {
      throw new Error(data.error || `Request failed with ${response.status}`);
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeBuildingType(value) {
  const text = String(value || '').trim().toLowerCase();

  if (text === 'office building') {
    return 'Office Building';
  }

  if (text === 'government') {
    return 'Government';
  }

  if (text === 'house') {
    return 'House';
  }

  if (text === 'mafia') {
    return 'Mafia';
  }

  return text ? text.replace(/\b\w/g, letter => letter.toUpperCase()) : 'Building';
}

function normalizeProperty(property) {
  const price = String(property.price || 'Not for sale');
  const tax = String(property.tax || 'Not for sale');

  return {
    id: String(property.id),
    name: String(property.name || property.number || property.id),
    number: String(property.number || 'N/A'),
    buildingType: normalizeBuildingType(property.buildingType),
    owner: String(property.owner || 'N/A'),
    saleStatus: normalizeSaleStatus(property.saleStatus),
    price: price.toLowerCase() === 'n/a' ? 'Not for sale' : price,
    tax: tax.toLowerCase() === 'n/a' ? 'Not for sale' : tax,
    custom: Boolean(property.custom)
  };
}

function normalizeSaleStatus(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[-_]+/g, ' ');
  return normalized === 'off sale' ? 'Off Sale' : 'On Sale';
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

function normalizeDirectoryRecord(record) {
  const ownerParts = splitOwnerLabelAndId(record.owner, record.ownerId);

  return {
    ...record,
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

function normalizeDataset(data) {
  const orgs = data.orgs || {};

  return {
    properties: Array.isArray(data.properties) ? data.properties.map(normalizeProperty) : [],
    markers: Array.isArray(data.markers) ? data.markers : [],
    orgs: {
      ...orgs,
      businesses: Array.isArray(orgs.businesses) ? orgs.businesses.map(normalizeDirectoryRecord) : [],
      mafias: Array.isArray(orgs.mafias) ? orgs.mafias.map(normalizeDirectoryRecord) : []
    },
    turfs: Array.isArray(data.turfs) ? data.turfs : [],
    turfAlignment: data.turfAlignment || { scale: 0.94, offsetX: 0, offsetY: 0 },
    blacklistRegions: Array.isArray(data.blacklistRegions) ? data.blacklistRegions : []
  };
}

function readLocalDataset() {
  return normalizeDataset({
    properties: readJson(LOCAL_PROPERTIES_PATH, readJson(DATA_PROPERTIES_PATH, [])),
    markers: readJson(LOCAL_MARKERS_PATH, readJson(DATA_MARKERS_PATH, [])),
    orgs: readJson(LOCAL_ORGS_PATH, readJson(DATA_ORGS_PATH, {}))
  });
}

function writeLocalDataset(data) {
  writeJson(LOCAL_PROPERTIES_PATH, data.properties);
  writeJson(DATA_PROPERTIES_PATH, data.properties);
  writeJson(LOCAL_MARKERS_PATH, data.markers);
  writeJson(DATA_MARKERS_PATH, data.markers);
  writeJson(LOCAL_ORGS_PATH, data.orgs);
  writeJson(DATA_ORGS_PATH, data.orgs);
}

async function fetchWebsiteDataset() {
  if (!WEBSITE_BASE_URL) {
    throw new Error('PROPERTY_WEBSITE_URL is not configured');
  }

  const data = await fetchJson(`${WEBSITE_BASE_URL}/api/live-data?full=1&t=${Date.now()}`, {
    headers: {
      'Cache-Control': 'no-store'
    }
  });

  return normalizeDataset(data);
}

async function getPropertyDataset({ forceRefresh = false } = {}) {
  const now = Date.now();

  if (!forceRefresh && cachedData && now - cachedAt < CACHE_MS) {
    return cachedData;
  }

  try {
    cachedData = await fetchWebsiteDataset();
  } catch {
    cachedData = readLocalDataset();
  }

  cachedAt = now;
  return cachedData;
}

function formatPropertyLabel(property) {
  const name = property.name || property.buildingType || 'Property';
  return `${name} (${property.number})`;
}

function formatOwnerMention(owner) {
  const value = String(owner || 'N/A');
  return /^\d{17,20}$/.test(value) ? `<@${value}>` : `**${value}**`;
}

function formatMovementAction(action) {
  if (action === 'bought-property') {
    return 'Bought Property';
  }

  if (action === 'transfer') {
    return 'Transfer Property';
  }

  return action
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Property Movement';
}

async function logPropertyMovement({
  action,
  actor,
  client,
  newOwner,
  previousOwner,
  property
}) {
  try {
    const channel = await client.channels.fetch(PROPERTY_MOVEMENT_LOG_CHANNEL_ID);

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffffff)
          .setTitle('Property Movement')
          .addFields(
            {
              name: 'Property',
              value: `**${formatPropertyLabel(property)}**`,
              inline: false
            },
            {
              name: 'Previous Owner',
              value: formatOwnerMention(previousOwner),
              inline: true
            },
            {
              name: 'New Owner',
              value: formatOwnerMention(newOwner),
              inline: true
            },
            {
              name: 'Action',
              value: formatMovementAction(action),
              inline: true
            },
            {
              name: 'Handled By',
              value: `${actor} (${actor.id})`,
              inline: false
            }
          )
          .setTimestamp()
      ],
      allowedMentions: { parse: [] }
    });
  } catch (error) {
    logger.warn('Failed to log property movement:', error);
  }
}

async function getProperties(options) {
  const data = await getPropertyDataset(options);
  return data.properties;
}

async function getBusinesses(options) {
  const data = await getPropertyDataset(options);
  return Array.isArray(data.orgs.businesses) ? data.orgs.businesses : [];
}

async function getPropertyById(id, options) {
  const properties = await getProperties(options);
  return properties.find(property => property.id === id) || null;
}

async function getPropertiesByIds(ids, options) {
  const properties = await getProperties(options);
  const byId = new Map(properties.map(property => [property.id, property]));
  return ids.map(id => byId.get(id)).filter(Boolean);
}

function matchesPropertySearch(property, search) {
  const searchableText = [
    formatPropertyLabel(property),
    property.number,
    property.name,
    property.buildingType,
    property.id
  ].join(' ').toLowerCase();
  const terms = search.split(/\s+/).filter(Boolean);

  if (!terms.length) {
    return true;
  }

  return terms.every(term => searchableText.includes(term));
}

async function getPropertyAutocompleteChoices(focusedValue) {
  const search = String(focusedValue || '').toLowerCase();
  const properties = await getProperties();

  return properties
    .filter(property => matchesPropertySearch(property, search))
    .sort((a, b) => formatPropertyLabel(a).localeCompare(formatPropertyLabel(b), undefined, { numeric: true }))
    .slice(0, 25)
    .map(property => ({
      name: formatPropertyLabel(property).slice(0, 100),
      value: property.id.slice(0, 100)
    }));
}

async function getBusinessAutocompleteChoices(focusedValue) {
  const search = String(focusedValue || '').toLowerCase();
  const businesses = await getBusinesses();

  return businesses
    .filter(business => {
      const searchableText = [
        business.name,
        business.owner,
        business.ownerId,
        business.type,
        business.id
      ].join(' ').toLowerCase();

      return !search || searchableText.includes(search);
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true }))
    .slice(0, 25)
    .map(business => ({
      name: String(business.name).slice(0, 100),
      value: String(business.name).slice(0, 100)
    }));
}

async function getBusinessByName(name, options) {
  const businesses = await getBusinesses(options);
  return businesses.find(business => business.name === name) || null;
}

async function updatePropertyField(id, field, value) {
  const data = await getPropertyDataset({ forceRefresh: true });
  const property = data.properties.find(entry => entry.id === id);

  if (!property) {
    return null;
  }

  property[field] = field === 'buildingType' ? normalizeBuildingType(value) : String(value);
  writeLocalDataset(data);
  cachedData = data;
  cachedAt = Date.now();

  try {
    await fetchJson(`${WEBSITE_BASE_URL}/api/save-boxes`, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        password: EDIT_PASSWORD,
        clientId: 'discord-bot'
      })
    });
  } catch (error) {
    error.message = `Updated locally, but website sync failed: ${error.message}`;
    throw error;
  }

  return property;
}

async function syncPropertyDataset(data) {
  if (!WEBSITE_BASE_URL) {
    throw new Error('PROPERTY_WEBSITE_URL is not configured');
  }

  writeLocalDataset(data);
  cachedData = data;
  cachedAt = Date.now();

  try {
    await fetchJson(`${WEBSITE_BASE_URL}/api/save-boxes`, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        password: EDIT_PASSWORD,
        clientId: 'discord-bot'
      })
    });
  } catch (error) {
    error.message = `Updated locally, but website sync failed: ${error.message}`;
    throw error;
  }
}

async function transferPropertyOwnership({ actorId, fromOwnerId, id, toOwnerId }) {
  const data = await getPropertyDataset({ forceRefresh: true });
  const property = data.properties.find(entry => entry.id === id);

  if (!property) {
    return { ok: false, reason: 'not_found' };
  }

  if (property.owner !== fromOwnerId) {
    return { ok: false, reason: 'not_owner', property };
  }

  const previousOwner = property.owner;
  property.owner = String(toOwnerId);

  await syncPropertyDataset(data);

  addPropertyHistoryEntry(property.id, {
    action: 'transfer',
    actorId,
    fromOwner: previousOwner,
    toOwner: property.owner
  });

  return { ok: true, property, previousOwner };
}

async function setPropertyOwner({ action = 'owner-update', actorId, id, ownerId }) {
  const data = await getPropertyDataset({ forceRefresh: true });
  const property = data.properties.find(entry => entry.id === id);

  if (!property) {
    return { ok: false, reason: 'not_found' };
  }

  const previousOwner = property.owner;
  property.owner = String(ownerId);

  await syncPropertyDataset(data);

  addPropertyHistoryEntry(property.id, {
    action,
    actorId,
    fromOwner: previousOwner,
    toOwner: property.owner
  });

  return { ok: true, property, previousOwner };
}

async function upsertBusiness({ actorId, logo, name, owner, ownerId, server, type }) {
  const data = await getPropertyDataset({ forceRefresh: true });
  data.orgs = data.orgs || {};
  data.orgs.businesses = Array.isArray(data.orgs.businesses) ? data.orgs.businesses : [];

  const businessName = String(name || '').trim();

  if (!businessName) {
    return { ok: false, reason: 'missing_name' };
  }

  const existing = data.orgs.businesses.find(business =>
    String(business.name || '').toLowerCase() === businessName.toLowerCase()
  );
  const business = existing || {
    id: `businesses-${Date.now()}`,
    registeredAt: new Date().toISOString()
  };

  business.name = businessName;
  const ownerParts = splitOwnerLabelAndId(owner, ownerId);
  business.owner = ownerParts.owner || 'N/A';
  business.ownerId = ownerParts.ownerId;
  business.type = String(type || 'General').trim() || 'General';
  business.server = String(server || '').trim();
  business.logo = String(logo || '').trim();
  business.registeredAt = business.registeredAt || business.createdAt || new Date().toISOString();

  if (!existing) {
    data.orgs.businesses.push(business);
  }

  await syncPropertyDataset(data);

  return {
    business,
    created: !existing,
    ok: true,
    updatedBy: actorId
  };
}

async function setBusinessOwner({ actorId, name, owner, ownerId }) {
  const data = await getPropertyDataset({ forceRefresh: true });
  data.orgs = data.orgs || {};
  data.orgs.businesses = Array.isArray(data.orgs.businesses) ? data.orgs.businesses : [];

  const business = data.orgs.businesses.find(entry => entry.name === name);

  if (!business) {
    return { ok: false, reason: 'not_found' };
  }

  const previousOwner = business.ownerId
    ? `${business.owner || 'N/A'} (${business.ownerId})`
    : business.owner || 'N/A';
  business.owner = String(owner || business.owner || 'N/A').trim() || 'N/A';
  business.ownerId = String(ownerId || '').trim();

  await syncPropertyDataset(data);

  return {
    business,
    ok: true,
    previousOwner,
    updatedBy: actorId
  };
}

async function replacePropertyOwners(ownerMap, actorId = 'system') {
  const data = await getPropertyDataset({ forceRefresh: true });
  const changed = [];

  for (const property of data.properties) {
    const nextOwner = ownerMap[property.owner];

    if (!nextOwner || nextOwner === property.owner) {
      continue;
    }

    const previousOwner = property.owner;
    property.owner = String(nextOwner);
    changed.push({ property, previousOwner });
  }

  if (!changed.length) {
    return [];
  }

  await syncPropertyDataset(data);

  for (const change of changed) {
    addPropertyHistoryEntry(change.property.id, {
      action: 'owner-id-sync',
      actorId,
      fromOwner: change.previousOwner,
      toOwner: change.property.owner
    });
  }

  return changed;
}

function getPropertyHistory(propertyId) {
  const history = readPropertyHistory();
  return Array.isArray(history[propertyId]) ? history[propertyId] : [];
}

module.exports = {
  CHECK_PROPERTY_CHANNEL_ID,
  PROPERTY_MOVEMENT_LOG_CHANNEL_ID,
  formatPropertyLabel,
  getBusinessAutocompleteChoices,
  getBusinessByName,
  getBusinesses,
  getProperties,
  getPropertyAutocompleteChoices,
  getPropertiesByIds,
  getPropertyHistory,
  logPropertyMovement,
  replacePropertyOwners,
  setPropertyOwner,
  setBusinessOwner,
  transferPropertyOwnership,
  upsertBusiness,
  updatePropertyField
};
