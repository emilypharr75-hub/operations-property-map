const LIVE_DATA_KEY = 'operations-property-map:live-data';
const LIVE_META_KEY = 'operations-property-map:live-meta';

function hasLiveStore() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function liveStoreHeaders(contentType) {
  return {
    Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
    ...(contentType ? { 'Content-Type': contentType } : {})
  };
}

async function kvGet(key) {
  if (!hasLiveStore()) {
    return null;
  }

  const response = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
    headers: liveStoreHeaders()
  });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || `Live store failed with ${response.status}`);
  }

  return data.result;
}

async function kvSet(key, value) {
  if (!hasLiveStore()) {
    return null;
  }

  const response = await fetch(`${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: liveStoreHeaders('text/plain'),
    body: value
  });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || `Live store failed with ${response.status}`);
  }

  return data.result;
}

async function readLiveData() {
  const value = await kvGet(LIVE_DATA_KEY);

  if (!value) {
    return null;
  }

  return typeof value === 'string' ? JSON.parse(value) : value;
}

async function readLiveMeta() {
  const value = await kvGet(LIVE_META_KEY);

  if (!value) {
    return null;
  }

  return typeof value === 'string' ? JSON.parse(value) : value;
}

async function writeLiveData(data) {
  const updatedAt = new Date().toISOString();
  const payload = {
    ...data,
    updatedAt,
    version: updatedAt
  };
  const meta = {
    version: payload.version,
    updatedAt,
    updatedBy: data.updatedBy || ''
  };

  await kvSet(LIVE_DATA_KEY, JSON.stringify(payload));
  await kvSet(LIVE_META_KEY, JSON.stringify(meta));
  return payload;
}

module.exports = {
  hasLiveStore,
  readLiveData,
  readLiveMeta,
  writeLiveData
};
