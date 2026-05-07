const path = require('path');
const { readFilesRecursive } = require('./readFilesRecursive');
const { logger } = require('./logger');

const eventsPath = path.join(__dirname, '..', 'events');

function loadEvents(client) {
  const files = readFilesRecursive(eventsPath);
  let count = 0;

  for (const file of files) {
    delete require.cache[require.resolve(file)];
    const event = require(file);

    if (!event.name || typeof event.execute !== 'function') {
      throw new Error(`Invalid event file: ${file}`);
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }

    count += 1;
  }

  logger.info(`Loaded ${count} event(s).`);
}

module.exports = {
  loadEvents
};
