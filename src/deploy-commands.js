require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { config } = require('./lib/config');
const { getCommandPayloads } = require('./lib/loadCommands');
const { logger } = require('./lib/logger');

async function main() {
  const commands = getCommandPayloads();
  const rest = new REST({ version: '10' }).setToken(config.token);

  logger.info(`Deploying ${commands.length} command(s)...`);

  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands }
  );

  logger.info('Commands deployed successfully.');
}

main().catch(error => {
  logger.error('Failed to deploy commands:', error);
  process.exitCode = 1;
});
