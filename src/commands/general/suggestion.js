const {
  MessageFlags,
  SlashCommandBuilder
} = require('discord.js');
const {
  SUGGESTION_COMMAND_CHANNEL_ID,
  SUGGESTION_POST_CHANNEL_ID,
  buildSuggestionEmbed,
  buildSuggestionRows,
  createPendingSuggestion,
  saveSuggestion
} = require('../../lib/suggestions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion.')
    .addStringOption(option =>
      option
        .setName('suggestion')
        .setDescription('Your suggestion')
        .setMinLength(1)
        .setMaxLength(1000)
        .setRequired(true)
    ),
  async execute(interaction) {
    if (interaction.channelId !== SUGGESTION_COMMAND_CHANNEL_ID) {
      await interaction.reply({
        content: `This command can only be used in <#${SUGGESTION_COMMAND_CHANNEL_ID}>.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const text = interaction.options.getString('suggestion', true).trim();

    if (!text) {
      await interaction.reply({
        content: 'Please include a suggestion before submitting.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const suggestion = createPendingSuggestion({
      authorAvatarUrl: interaction.user.displayAvatarURL({ size: 128 }),
      authorId: interaction.user.id,
      authorName: interaction.member?.displayName || interaction.user.username,
      text
    });
    const channel = await interaction.client.channels.fetch(SUGGESTION_POST_CHANNEL_ID);
    const message = await channel.send({
      embeds: [buildSuggestionEmbed(suggestion)]
    });

    saveSuggestion(message.id, suggestion);
    suggestion.messageId = message.id;

    await message.edit({
      embeds: [buildSuggestionEmbed(suggestion)],
      components: buildSuggestionRows(message.id)
    });

    await interaction.reply({
      content: `Your suggestion was posted in <#${SUGGESTION_POST_CHANNEL_ID}>.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
