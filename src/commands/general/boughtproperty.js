const {
  MessageFlags,
  SlashCommandBuilder
} = require('discord.js');
const {
  formatPropertyLabel,
  getBusinessAutocompleteChoices,
  getBusinessByName,
  getPropertyAutocompleteChoices,
  logPropertyMovement,
  setPropertyOwner
} = require('../../lib/properties');

const BOUGHT_PROPERTY_ROLE_ID = '997883108768620554';

function formatOwner(owner) {
  return /^\d{17,20}$/.test(owner) ? `<@${owner}>` : owner;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boughtproperty')
    .setDescription('Mark a property as bought and update its owner.')
    .addStringOption(option =>
      option
        .setName('property')
        .setDescription('Property that was bought')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addUserOption(option =>
      option
        .setName('person')
        .setDescription('Person who bought the property')
    )
    .addStringOption(option =>
      option
        .setName('business')
        .setDescription('Business that bought the property')
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
    if (!interaction.member?.roles?.cache?.has(BOUGHT_PROPERTY_ROLE_ID)) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const propertyId = interaction.options.getString('property', true);
    const person = interaction.options.getUser('person');
    const businessName = interaction.options.getString('business');

    if (!person && !businessName) {
      await interaction.editReply('Please choose either a person or a business owner.');
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

    const ownerId = business ? business.name : person.id;
    const ownerLabel = business ? `**${business.name}**` : `${person}`;
    const result = await setPropertyOwner({
      action: 'bought-property',
      actorId: interaction.user.id,
      id: propertyId,
      ownerId
    });

    if (!result.ok && result.reason === 'not_found') {
      await interaction.editReply('No matching property was found. Pick one of the autocomplete options.');
      return;
    }

    await interaction.editReply([
      `Marked **${formatPropertyLabel(result.property)}** as bought by ${ownerLabel}.`,
      `Previous owner: ${formatOwner(result.previousOwner)}`
    ].join('\n'));

    await logPropertyMovement({
      action: 'bought-property',
      actor: interaction.user,
      client: interaction.client,
      newOwner: ownerId,
      previousOwner: result.previousOwner,
      property: result.property
    });
  }
};
