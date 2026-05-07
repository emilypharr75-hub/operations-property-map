const {
  MessageFlags,
  SlashCommandBuilder
} = require('discord.js');
const {
  CHECK_PROPERTY_CHANNEL_ID,
  formatPropertyLabel,
  getPropertiesByIds,
  getPropertyAutocompleteChoices,
  getPropertyHistory
} = require('../../lib/properties');

function formatOwner(owner) {
  return /^\d{17,20}$/.test(owner) ? `<@${owner}>` : owner;
}

function formatHistoryEntry(entry) {
  const when = Math.floor(new Date(entry.at).getTime() / 1000);
  const actor = entry.actorId && /^\d{17,20}$/.test(entry.actorId) ? `<@${entry.actorId}>` : entry.actorId || 'system';

  if (entry.action === 'transfer' || entry.action === 'owner-id-sync') {
    return [
      `<t:${when}:f>`,
      `Action: ${entry.action}`,
      `From: ${formatOwner(entry.fromOwner)}`,
      `To: ${formatOwner(entry.toOwner)}`,
      `By: ${actor}`
    ].join('\n');
  }

  return `<t:${when}:f> - ${entry.action || 'update'}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('propertyhistory')
    .setDescription('View transfer history for a property.')
    .addStringOption(option =>
      option
        .setName('building')
        .setDescription('Building Name/#')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  async autocomplete(interaction) {
    await interaction.respond(await getPropertyAutocompleteChoices(interaction.options.getFocused()));
  },
  async execute(interaction) {
    if (interaction.channelId !== CHECK_PROPERTY_CHANNEL_ID) {
      await interaction.reply({
        content: `This command can only be used in <#${CHECK_PROPERTY_CHANNEL_ID}>.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply();

    const buildingId = interaction.options.getString('building', true);
    const [property] = await getPropertiesByIds([buildingId]);

    if (!property) {
      await interaction.editReply('No matching property was found. Pick one of the autocomplete options.');
      return;
    }

    const history = getPropertyHistory(buildingId).slice(-10).reverse();

    await interaction.editReply({
      embeds: [
        {
          color: 0xffffff,
          title: `Property History: ${formatPropertyLabel(property)}`,
          description: history.map(formatHistoryEntry).join('\n\n') || 'No history has been recorded for this property yet.'
        }
      ]
    });
  }
};
