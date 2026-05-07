const path = require('path');
const { readFilesRecursive } = require('./readFilesRecursive');
const { logger } = require('./logger');

function loadComponentFile(filePath) {
  delete require.cache[require.resolve(filePath)];
  return require(filePath);
}

function loadComponentGroup({ directory, exactCollection, prefixCollection, label }) {
  const files = readFilesRecursive(directory);
  let count = 0;

  for (const file of files) {
    const component = loadComponentFile(file);

    if (component.customId && typeof component.execute === 'function') {
      exactCollection.set(component.customId, component);
      count += 1;
      continue;
    }

    if (component.customIdPrefix && typeof component.execute === 'function') {
      prefixCollection.push(component);
      count += 1;
      continue;
    }

    throw new Error(`Invalid ${label} component file: ${file}`);
  }

  logger.info(`Loaded ${count} ${label} handler(s).`);
}

function loadComponents(client) {
  const componentsPath = path.join(__dirname, '..', 'components');

  loadComponentGroup({
    directory: path.join(componentsPath, 'buttons'),
    exactCollection: client.buttons,
    prefixCollection: client.buttonPrefixes,
    label: 'button'
  });

  loadComponentGroup({
    directory: path.join(componentsPath, 'modals'),
    exactCollection: client.modals,
    prefixCollection: client.modalPrefixes,
    label: 'modal'
  });

  loadComponentGroup({
    directory: path.join(componentsPath, 'selects'),
    exactCollection: client.selects,
    prefixCollection: client.selectPrefixes,
    label: 'select'
  });
}

module.exports = {
  loadComponents
};
