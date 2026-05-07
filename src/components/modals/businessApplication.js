const { MessageFlags } = require('discord.js');
const {
  buildApplicationDecisionRows,
  buildApplicationResultEmbed,
  buildBusinessFromApplicationEmbed,
  buildDecidedApplicationEmbed,
  getApplicantIdFromEmbed
} = require('../../lib/businessApplications');
const { upsertBusiness } = require('../../lib/properties');

function parseBusinessApplicationModalId(customId) {
  const [, kind, action, channelId, messageId] = customId.split(':');
  return { action, channelId, kind, messageId };
}

module.exports = {
  customIdPrefix: 'business_application',
  async execute(interaction) {
    const { action, channelId, kind, messageId } = parseBusinessApplicationModalId(interaction.customId);

    if (kind !== 'reason' || !['accept', 'deny'].includes(action) || !channelId || !messageId) {
      await interaction.reply({
        content: 'That application review modal is invalid.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const channel = await interaction.client.channels.fetch(channelId);
    const message = await channel.messages.fetch(messageId);
    const [embed] = message.embeds;

    if (!embed) {
      await interaction.reply({
        content: 'No application embed was found on that message.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const reason = interaction.fields.getTextInputValue('business_application_reason').trim();
    const applicantId = getApplicantIdFromEmbed(embed);
    const user = applicantId ? await interaction.client.users.fetch(applicantId).catch(() => null) : null;

    if (action === 'accept') {
      const business = buildBusinessFromApplicationEmbed(embed);
      const result = await upsertBusiness({
        ...business,
        actorId: interaction.user.id
      });

      if (!result.ok) {
        await interaction.reply({
          content: 'I could not add that business to the website because the application is missing a business name.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }
    }

    if (user) {
      await user.send({
        embeds: [buildApplicationResultEmbed(action, reason)]
      }).catch(() => null);
    }

    await message.edit({
      embeds: [buildDecidedApplicationEmbed(embed, action, reason)],
      components: buildApplicationDecisionRows(true)
    });

    await interaction.reply({
      content: `Application ${action === 'accept' ? 'accepted' : 'denied'} with a reason.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
