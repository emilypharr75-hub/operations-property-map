const path = require('path');
const { readFilesRecursive } = require('./readFilesRecursive');
const { logger } = require('./logger');

const commandsPath = path.join(__dirname, '..', 'commands');

function loadCommandFile(filePath) {
  delete require.cache[require.resolve(filePath)];
  const command = require(filePath);

  if (!command?.data?.name || typeof command.execute !== 'function') {
    throw new Error(`Invalid command file: ${filePath}`);
  }

  return command;
}

function loadCommands(client) {
  const files = readFilesRecursive(commandsPath);

  for (const file of files) {
    const command = loadCommandFile(file);
    client.commands.set(command.data.name, command);
  }

  logger.info(`Loaded ${client.commands.size} command(s).`);
}

function getCommandPayloads() {
  return readFilesRecursive(commandsPath).map(file => loadCommandFile(file).data.toJSON());
}

module.exports = {
  getCommandPayloads,
  loadCommands
};
