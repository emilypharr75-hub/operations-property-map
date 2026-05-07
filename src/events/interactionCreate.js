const { DiscordAPIError, Events, MessageFlags } = require('discord.js');
const { findComponent } = require('../lib/findComponent');
const { logger } = require('../lib/logger');

const UNRESPONSIVE_INTERACTION_CODES = new Set([10062, 40060]);

async function sendErrorResponse(interaction) {
  const response = {
    content: 'Something went wrong while handling that interaction.',
    flags: MessageFlags.Ephemeral
  };

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(response);
      return;
    }

    await interaction.reply(response);
  } catch (error) {
    if (error instanceof DiscordAPIError && UNRESPONSIVE_INTERACTION_CODES.has(error.code)) {
      return;
    }

    throw error;
  }
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isAutocomplete()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command || typeof command.autocomplete !== 'function') {
          return;
        }

        await command.autocomplete(interaction);
        return;
      }

      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
          return;
        }

        await command.execute(interaction);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        const component = findComponent(
          interaction.client.selects,
          interaction.client.selectPrefixes,
          interaction.customId
        );

        if (!component) {
          await interaction.reply({
            content: 'That button is not connected to an active handler.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await component.execute(interaction);
        return;
      }

      if (interaction.isButton()) {
        const component = findComponent(
          interaction.client.buttons,
          interaction.client.buttonPrefixes,
          interaction.customId
        );

        if (!component) {
          return;
        }

        await component.execute(interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        const component = findComponent(
          interaction.client.modals,
          interaction.client.modalPrefixes,
          interaction.customId
        );

        if (!component) {
          return;
        }

        await component.execute(interaction);
      }
    } catch (error) {
      logger.error('Failed to handle interaction:', error);
      await sendErrorResponse(interaction);
    }
  }
};
