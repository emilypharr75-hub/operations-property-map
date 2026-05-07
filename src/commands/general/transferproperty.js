const {
  MessageFlags,
  SlashCommandBuilder
} = require('discord.js');
const {
  CHECK_PROPERTY_CHANNEL_ID,
  formatPropertyLabel,
  getBusinessAutocompleteChoices,
  getBusinessByName,
  getPropertyAutocompleteChoices,
  logPropertyMovement,
  transferPropertyOwnership
} = require('../../lib/properties');

function formatOwner(owner) {
  return /^\d{17,20}$/.test(owner) ? `<@${owner}>` : owner;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transferproperty')
    .setDescription('Transfer one of your properties to a person or business.')
    .addStringOption(option =>
      option
        .setName('building')
        .setDescription('Building Name/#')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addUserOption(option =>
      option
        .setName('person')
        .setDescription('New person owner')
    )
    .addStringOption(option =>
      option
        .setName('business')
        .setDescription('New business owner')
        .setAutocomplete(true)
    ),
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'business') {
      await interaction.respond(await getBusinessAutocompleteChoices(focused.value));
      return;
    }

    await interaction.respond(await getPropertyAutocompleteChoices(focused.value));
  },
  async execute(interaction) {
    if (interaction.channelId !== CHECK_PROPERTY_CHANNEL_ID) {
      await interaction.reply({
        content: `This command can only be used in <#${CHECK_PROPERTY_CHANNEL_ID}>.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const buildingId = interaction.options.getString('building', true);
    const person = interaction.options.getUser('person');
    const businessName = interaction.options.getString('business');

    if (!person && !businessName) {
      await interaction.editReply('Please choose either a person or a business to transfer the property to.');
      return;
    }

    if (person && businessName) {
      await interaction.editReply('Please choose either a person or a business, not both.');
      return;
    }

    const business = businessName ? await getBusinessByName(businessName) : null;

    if (businessName && !business) {
      await interaction.editReply('That business was not found on the website. Pick one of the autocomplete options.');
      return;
    }

    const newOwnerId = business ? business.name : person.id;
    const newOwnerLabel = business ? `**${business.name}**` : `${person}`;
    const result = await transferPropertyOwnership({
      actorId: interaction.user.id,
      fromOwnerId: interaction.user.id,
      id: buildingId,
      toOwnerId: newOwnerId
    });

    if (!result.ok && result.reason === 'not_found') {
      await interaction.editReply('No matching property was found. Pick one of the autocomplete options.');
      return;
    }

    if (!result.ok && result.reason === 'not_owner') {
      await interaction.editReply('You can only transfer properties that you currently own.');
      return;
    }

    await interaction.editReply([
      `Transferred **${formatPropertyLabel(result.property)}** to ${newOwnerLabel}.`,
      `Previous owner: ${formatOwner(result.previousOwner)}`
    ].join('\n'));

    await logPropertyMovement({
      action: 'transfer',
      actor: interaction.user,
      client: interaction.client,
      newOwner: newOwnerId,
      previousOwner: result.previousOwner,
      property: result.property
    });
  }
};
