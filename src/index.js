require('dotenv').config();

const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials
} = require('discord.js');
const { config } = require('./lib/config');
const { loadCommands } = require('./lib/loadCommands');
const { loadComponents } = require('./lib/loadComponents');
const { loadEvents } = require('./lib/loadEvents');
const { logger } = require('./lib/logger');

const intents = [GatewayIntentBits.Guilds];

if (config.enableMessageContentIntent) {
  intents.push(
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  );
}

if (config.enableGuildMembersIntent) {
  intents.push(GatewayIntentBits.GuildMembers);
}

const client = new Client({
  intents,
  partials: [Partials.Channel]
});

client.commands = new Collection();
client.buttons = new Collection();
client.buttonPrefixes = [];
client.modals = new Collection();
client.modalPrefixes = [];
client.selects = new Collection();
client.selectPrefixes = [];

async function main() {
  loadCommands(client);
  loadComponents(client);
  loadEvents(client);

  await client.login(config.token);
}

main().catch(error => {
  logger.error('Failed to start bot:', error);
  process.exitCode = 1;
});
