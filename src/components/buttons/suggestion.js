const {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const {
  SUGGESTION_REVIEWER_ID,
  buildSuggestionEmbed,
  buildSuggestionRows,
  getSuggestion,
  saveSuggestion
} = require('../../lib/suggestions');

function parseSuggestionButtonId(customId) {
  const [, group, action, messageId] = customId.split(':');
  return { group, action, messageId };
}

async function handleVote(interaction, action, messageId) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const suggestion = getSuggestion(messageId);

  if (!suggestion || suggestion.status !== 'pending') {
    await interaction.editReply('That suggestion is no longer open for voting.');
    return;
  }

  if (suggestion.authorId === interaction.user.id) {
    await interaction.editReply('You cannot vote on your own suggestion.');
    return;
  }

  if (suggestion.yesVotes.includes(interaction.user.id) || suggestion.noVotes.includes(interaction.user.id)) {
    await interaction.editReply('You already voted on this suggestion.');
    return;
  }

  const voteList = action === 'yes' ? suggestion.yesVotes : suggestion.noVotes;
  voteList.push(interaction.user.id);
  saveSuggestion(messageId, suggestion);

  try {
    await interaction.message.edit({
      embeds: [buildSuggestionEmbed(suggestion)],
      components: buildSuggestionRows(messageId)
    });
  } catch {
    await interaction.editReply('Your vote was saved, but I could not update the suggestion message.');
    return;
  }

  await interaction.editReply('Your vote has been recorded.');
}

async function handleReview(interaction, action, messageId) {
  if (interaction.user.id !== SUGGESTION_REVIEWER_ID) {
    await interaction.reply({
      content: 'Only the suggestion reviewer can use that button.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const suggestion = getSuggestion(messageId);

  if (!suggestion || suggestion.status !== 'pending') {
    await interaction.reply({
      content: 'That suggestion has already been reviewed.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const reasonInput = new TextInputBuilder()
    .setCustomId('suggestion_reason')
    .setLabel('Reason')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(1)
    .setMaxLength(1000)
    .setRequired(true);

  const modal = new ModalBuilder()
    .setCustomId(`suggestion:decision:${action}:${messageId}`)
    .setTitle(action === 'accept' ? 'Accept Suggestion' : 'Deny Suggestion')
    .addComponents(new ActionRowBuilder().addComponents(reasonInput));

  await interaction.showModal(modal);
}

module.exports = {
  customIdPrefix: 'suggestion',
  async execute(interaction) {
    const { group, action, messageId } = parseSuggestionButtonId(interaction.customId);

    if (!group || !action || !messageId) {
      await interaction.reply({
        content: 'That suggestion button is invalid. Please use a newer suggestion post.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (group === 'vote') {
      await handleVote(interaction, action, messageId);
      return;
    }

    if (group === 'review') {
      await handleReview(interaction, action, messageId);
      return;
    }

    await interaction.reply({
      content: 'That suggestion button is invalid. Please use a newer suggestion post.',
      flags: MessageFlags.Ephemeral
    });
  }
};
