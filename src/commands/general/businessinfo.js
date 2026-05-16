const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { getBusinessRecord } = require('../../lib/businessRecords');
const { getBusinessAutocompleteChoices, getBusinessByName } = require('../../lib/properties');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('businessinfo')
    .setDescription('View website info for a business.')
    .addStringOption(option =>
      option.setName('business').setDescription('Business').setRequired(true).setAutocomplete(true)
    ),
  async autocomplete(interaction) {
    await interaction.respond(await getBusinessAutocompleteChoices(interaction.options.getFocused()));
  },
  async execute(interaction) {
    const businessName = interaction.options.getString('business', true);
    const business = await getBusinessByName(businessName);

    if (!business) {
      await interaction.reply({ content: 'That business was not found on the website.', flags: MessageFlags.Ephemeral });
      return;
    }

    const record = getBusinessRecord(business.name);

    const embed = new EmbedBuilder()
      .setColor(record.status === 'Suspended' ? 0xe74c3c : 0xffffff)
      .setTitle(business.name)
      .addFields(
        { name: 'Owner', value: String(business.owner || 'N/A'), inline: true },
        { name: 'Owner ID', value: String(business.ownerId || 'N/A'), inline: true },
        { name: 'Type', value: String(business.type || 'N/A'), inline: true },
        { name: 'Status', value: record.status || 'Active', inline: true },
        { name: 'Server', value: String(business.server || 'N/A'), inline: false }
      );

    if (business.logo) {
      embed.setThumbnail(business.logo);
    }

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }
};
