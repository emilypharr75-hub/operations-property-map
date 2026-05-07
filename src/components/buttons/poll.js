const { MessageFlags } = require('discord.js');
const {
  buildPollEmbed,
  getPoll,
  savePoll
} = require('../../lib/polls');

function parsePollButtonId(customId) {
  const [, action, messageId] = customId.split(':');
  return { action, messageId };
}

module.exports = {
  customIdPrefix: 'poll',
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { action, messageId } = parsePollButtonId(interaction.customId);

    if (!['yes', 'no'].includes(action) || !messageId) {
      await interaction.editReply('That poll button is invalid.');
      return;
    }

    const poll = getPoll(messageId);

    if (!poll) {
      await interaction.editReply('That poll could not be found.');
      return;
    }

    if (poll.yesVotes.includes(interaction.user.id) || poll.noVotes.includes(interaction.user.id)) {
      await interaction.editReply('You already voted on this poll.');
      return;
    }

    const votes = action === 'yes' ? poll.yesVotes : poll.noVotes;
    votes.push(interaction.user.id);
    savePoll(messageId, poll);

    await interaction.message.edit({
      embeds: [buildPollEmbed(poll)]
    });

    await interaction.editReply('Your vote has been recorded.');
  }
};
