const { requireDeputyDirectorOrUp } = require('../../lib/commandPermissions');
const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { getBusinessAutocompleteChoices, getBusinessByName, setBusinessOwner } = require('../../lib/properties');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transferbusiness')
    .setDescription('Transfer a business to a person.')
    .addStringOption(option =>
      option.setName('business').setDescription('Business').setRequired(true).setAutocomplete(true)
    )
    .addUserOption(option =>
      option.setName('person').setDescription('New owner').setRequired(true)
    ),
  async autocomplete(interaction) {
    await interaction.respond(await getBusinessAutocompleteChoices(interaction.options.getFocused()));
  },
  async execute(interaction) {
    if (!await requireDeputyDirectorOrUp(interaction)) {
      return;
    }

    const businessName = interaction.options.getString('business', true);
    const person = interaction.options.getUser('person', true);
    const member = interaction.guild
      ? await interaction.guild.members.fetch(person.id).catch(() => null)
      : null;
    const business = await getBusinessByName(businessName);

    if (!business) {
      await interaction.reply({ content: 'That business was not found on the website.', flags: MessageFlags.Ephemeral });
      return;
    }

    const result = await setBusinessOwner({
      actorId: interaction.user.id,
      name: business.name,
      owner: member?.displayName || person.globalName || person.username,
      ownerId: person.id
    });

    await interaction.reply({
      content: `Transferred **${business.name}** to ${person}.\nPrevious owner: ${result.previousOwner}`,
      flags: MessageFlags.Ephemeral
    });
  }
};
