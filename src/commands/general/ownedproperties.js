const {
  MessageFlags,
  SlashCommandBuilder
} = require('discord.js');
const {
  CHECK_PROPERTY_CHANNEL_ID,
  formatPropertyLabel,
  getBusinessAutocompleteChoices,
  getBusinessByName,
  getProperties
} = require('../../lib/properties');

function formatProperty(property) {
  return [
    `**${formatPropertyLabel(property)}**`,
    `Price: ${property.price}`,
    `Tax: ${property.tax}`
  ].join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ownedproperties')
    .setDescription('View properties owned by a Discord user or business.')
    .addUserOption(option =>
      option
        .setName('person')
        .setDescription('Person to check')
    )
    .addStringOption(option =>
      option
        .setName('business')
        .setDescription('Business to check')
        .setAutocomplete(true)
    ),
  async autocomplete(interaction) {
    await interaction.respond(await getBusinessAutocompleteChoices(interaction.options.getFocused()));
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

    const person = interaction.options.getUser('person');
    const businessName = interaction.options.getString('business');

    if (person && businessName) {
      await interaction.editReply('Please choose either a person or a business, not both.');
      return;
    }

    const business = businessName ? await getBusinessByName(businessName) : null;
    const ownerId = business ? business.name : (person || interaction.user).id;
    const ownerLabel = business ? business.name : `${person || interaction.user}`;
    const properties = (await getProperties())
      .filter(property => property.owner === ownerId || (business && property.owner === business.id))
      .sort((a, b) => formatPropertyLabel(a).localeCompare(formatPropertyLabel(b), undefined, { numeric: true }));

    await interaction.editReply({
      embeds: [
        {
          color: 0xffffff,
          title: `${business ? business.name : (person || interaction.user).username}'s Owned Properties`,
          description: properties.map(formatProperty).join('\n\n') || `${ownerLabel} does not own any listed properties.`,
          footer: { text: business ? `Business: ${business.name}` : `Owner ID: ${(person || interaction.user).id}` }
        }
      ]
    });
  }
};
