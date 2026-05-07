const {
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const {
  CHECK_PROPERTY_CHANNEL_ID,
  formatPropertyLabel,
  getPropertyAutocompleteChoices,
  getPropertiesByIds,
} = require('../../lib/properties');

function buildPropertyEmbed(property) {
  return {
    color: 0xffffff,
    title: formatPropertyLabel(property),
    description: [
      `**Building Type:** ${property.buildingType}`,
      `**Number:** ${property.number}`,
      `**Owner:** ${property.owner}`,
      `**Property Price:** ${property.price}`,
      `**Property Tax:** ${property.tax}`
    ].join('\n')
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkproperty')
    .setDescription('Check Liberty County property information.')
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

    const buildingId = interaction.options.getString('building');
    const [property] = await getPropertiesByIds([buildingId]);

    if (!property) {
      await interaction.editReply({
        content: 'No matching property was found. Pick one of the autocomplete options.'
      });
      return;
    }

    await interaction.editReply({ embeds: [buildPropertyEmbed(property)] });
  }
};
