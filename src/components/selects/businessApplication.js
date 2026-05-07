const { MessageFlags } = require('discord.js');
const {
  buildCancelRows,
  buildQuestionEditEmbed,
  getActiveApplication,
  startAnswerEdits
} = require('../../lib/businessApplications');

function parseBusinessApplicationSelectId(customId) {
  const [, action, userId] = customId.split(':');
  return { action, userId };
}

module.exports = {
  customIdPrefix: 'business_application',
  async execute(interaction) {
    const { action, userId } = parseBusinessApplicationSelectId(interaction.customId);

    if (action !== 'edit') {
      await interaction.reply({
        content: 'That application menu is invalid.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (userId !== interaction.user.id) {
      await interaction.reply({
        content: 'That application menu is not for you.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const session = getActiveApplication(interaction.user.id);

    if (!session) {
      await interaction.reply({
        content: 'No active application was found.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (!startAnswerEdits(session, interaction.values)) {
      await interaction.reply({
        content: 'No answers were selected to change.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.update({
      content: 'Answer changes started.',
      embeds: [],
      components: []
    });

    await interaction.channel.send({
      embeds: [buildQuestionEditEmbed(session)],
      components: buildCancelRows(interaction.user.id)
    });
  }
};
