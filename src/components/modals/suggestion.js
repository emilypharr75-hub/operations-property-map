const { MessageFlags } = require('discord.js');
const {
  buildClosedSuggestionRows,
  buildSuggestionEmbed,
  getSuggestion,
  saveSuggestion
} = require('../../lib/suggestions');

function parseDecisionModalId(customId) {
  const [, , action, messageId] = customId.split(':');
  return { action, messageId };
}

async function handleDecision(interaction) {
  const { action, messageId } = parseDecisionModalId(interaction.customId);
  const suggestion = getSuggestion(messageId);

  if (!suggestion || suggestion.status !== 'pending') {
    await interaction.reply({
      content: 'That suggestion has already been reviewed.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  suggestion.status = action === 'accept' ? 'accepted' : 'denied';
  suggestion.reason = interaction.fields.getTextInputValue('suggestion_reason').trim();
  suggestion.yesVotes = [];
  suggestion.noVotes = [];

  saveSuggestion(messageId, suggestion);

  await interaction.update({
    embeds: [buildSuggestionEmbed(suggestion)],
    components: buildClosedSuggestionRows(messageId)
  });
}

module.exports = {
  customIdPrefix: 'suggestion',
  async execute(interaction) {
    if (interaction.customId.startsWith('suggestion:decision:')) {
      await handleDecision(interaction);
    }
  }
};
