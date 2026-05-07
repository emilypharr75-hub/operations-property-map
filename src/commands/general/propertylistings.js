const {
  MessageFlags,
  SlashCommandBuilder
} = require('discord.js');
const {
  CHECK_PROPERTY_CHANNEL_ID,
  formatPropertyLabel,
  getProperties
} = require('../../lib/properties');

const PAGE_SIZE = 10;

function formatOwner(owner) {
  return /^\d{17,20}$/.test(owner) ? `<@${owner}>` : owner;
}

function formatListing(property) {
  return [
    `**${formatPropertyLabel(property)}**`,
    `Owner: ${formatOwner(property.owner)}`,
    `Price: ${property.price}`,
    `Tax: ${property.tax}`
  ].join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('propertylistings')
    .setDescription('View property listings.')
    .addIntegerOption(option =>
      option
        .setName('page')
        .setDescription('Page number')
        .setMinValue(1)
    ),
  async execute(interaction) {
    if (interaction.channelId !== CHECK_PROPERTY_CHANNEL_ID) {
      await interaction.reply({
        content: `This command can only be used in <#${CHECK_PROPERTY_CHANNEL_ID}>.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply();

    const properties = (await getProperties())
      .slice()
      .sort((a, b) => formatPropertyLabel(a).localeCompare(formatPropertyLabel(b), undefined, { numeric: true }));
    const totalPages = Math.max(1, Math.ceil(properties.length / PAGE_SIZE));
    const page = Math.min(interaction.options.getInteger('page') || 1, totalPages);
    const start = (page - 1) * PAGE_SIZE;
    const pageProperties = properties.slice(start, start + PAGE_SIZE);

    await interaction.editReply({
      embeds: [
        {
          color: 0xffffff,
          title: 'Property Listings',
          description: pageProperties.map(formatListing).join('\n\n') || 'No properties found.',
          footer: { text: `Page ${page} of ${totalPages}` }
        }
      ]
    });
  }
};
