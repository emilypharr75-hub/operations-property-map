const { MessageFlags } = require('discord.js');
const {
  buildApplicationDecisionRows,
  buildApplicationResultEmbed,
  buildBusinessFromApplicationEmbed,
  buildDecidedApplicationEmbed,
  getApplicantIdFromEmbed,
  getApplicationTypeKeyFromEmbed
} = require('../../lib/businessApplications');
const { logger } = require('../../lib/logger');
const { upsertBusiness } = require('../../lib/properties');
const { giveBusinessOwnerRole } = require('../../lib/taxes');

function parseBusinessApplicationModalId(customId) {
  const [, kind, action, channelId, messageId] = customId.split(':');
  return { action, channelId, kind, messageId };
}

module.exports = {
  customIdPrefix: 'business_application',
  async execute(interaction) {
    const { action, channelId, kind, messageId } = parseBusinessApplicationModalId(interaction.customId);

    if (!['reason', 'accept_type'].includes(kind) || !['accept', 'deny'].includes(action) || !channelId || !messageId) {
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

    const reason = kind === 'reason'
      ? interaction.fields.getTextInputValue('business_application_reason').trim()
      : null;
    const businessType = action === 'accept'
      ? interaction.fields.getTextInputValue('business_application_type').trim()
      : null;
    const applicantId = getApplicantIdFromEmbed(embed);
    const user = applicantId ? await interaction.client.users.fetch(applicantId).catch(() => null) : null;
    const member = applicantId && interaction.guild
      ? await interaction.guild.members.fetch(applicantId).catch(() => null)
      : null;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      if (action === 'accept' && getApplicationTypeKeyFromEmbed(embed) === 'custom_business') {
        const business = buildBusinessFromApplicationEmbed(embed, {
          owner: member?.displayName || user?.globalName || user?.username,
          ownerId: applicantId || '',
          type: businessType
        });
        const result = await upsertBusiness({
          ...business,
          actorId: interaction.user.id
        });

        if (!result.ok) {
          await interaction.editReply('I could not add that business to the website because the application is missing a business name.');
          return;
        }

        if (applicantId && interaction.guild) {
          await giveBusinessOwnerRole(interaction.guild, applicantId);
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

      await interaction.editReply(`Application ${action === 'accept' ? 'accepted' : 'denied'}${reason ? ' with a reason' : ''}.`);
    } catch (error) {
      logger.error('Failed to apply business application reason decision:', error);
      await interaction.editReply('I could not finish accepting that application. The website update may have failed.');
    }
  }
};
