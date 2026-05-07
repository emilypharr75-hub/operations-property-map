const { Events } = require('discord.js');
const {
  BUSINESS_APPLICATION_TIMEOUT_MS,
  buildCancelRows,
  buildQuestionEditEmbed,
  buildQuestionEmbed,
  buildReviewEmbed,
  buildReviewRows,
  endApplication,
  getActiveApplication,
  recordAnswer
} = require('../lib/businessApplications');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) {
      return;
    }

    const session = getActiveApplication(message.author.id);

    if (!session || session.channelId !== message.channelId) {
      return;
    }

    if (Date.now() - session.startedAt > BUSINESS_APPLICATION_TIMEOUT_MS) {
      endApplication(message.author.id);
      await message.reply('Your business application expired. Please restart if you still want to apply.');
      return;
    }

    if (session.reviewing && session.editingQuestionIndex === null) {
      return;
    }

    const completed = recordAnswer(session, message);

    if (!completed) {
      await message.channel.send({
        embeds: [
          session.editingQuestionIndex !== null
            ? buildQuestionEditEmbed(session)
            : buildQuestionEmbed(session)
        ],
        components: buildCancelRows(message.author.id)
      });
      return;
    }

    session.reviewing = true;

    await message.channel.send({
      embeds: [buildReviewEmbed(session)],
      components: buildReviewRows(message.author.id)
    });
  }
};
