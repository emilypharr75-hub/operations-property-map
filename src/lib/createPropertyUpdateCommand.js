const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const {
  CHECK_PROPERTY_CHANNEL_ID,
  formatPropertyLabel,
  getPropertyAutocompleteChoices,
  updatePropertyField
} = require('./properties');

function createPropertyUpdateCommand({
  commandName,
  description,
  field,
  valueOptionName,
  valueOptionDescription,
  updatedLabel
}) {
  return {
    data: new SlashCommandBuilder()
      .setName(commandName)
      .setDescription(description)
      .addStringOption(option =>
        option
          .setName('building')
          .setDescription('Building Name/#')
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addStringOption(option =>
        option
          .setName(valueOptionName)
          .setDescription(valueOptionDescription)
          .setRequired(true)
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

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const buildingId = interaction.options.getString('building');
      const value = interaction.options.getString(valueOptionName);
      let property;

      try {
        property = await updatePropertyField(buildingId, field, value);
      } catch (error) {
        await interaction.editReply(error.message);
        return;
      }

      if (!property) {
        await interaction.editReply('No matching property was found. Pick one of the autocomplete options.');
        return;
      }

      await interaction.editReply([
        `Updated **${updatedLabel}** for **${formatPropertyLabel(property)}**.`,
        `New value: ${value}`
      ].join('\n'));
    }
  };
}

module.exports = {
  createPropertyUpdateCommand
};
