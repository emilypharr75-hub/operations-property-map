const {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const {
  BUSINESS_APPLICATION_CHANNEL_ID,
  BUSINESS_APPLICATION_LOG_CHANNEL_ID,
  buildCancelRows,
  buildConfirmationEmbed,
  buildConfirmationRows,
  buildApplicationDecisionRows,
  buildApplicationResultEmbed,
  buildBusinessFromApplicationEmbed,
  buildDecidedApplicationEmbed,
  buildQuestionEmbed,
  buildSubmittedConfirmationEmbed,
  buildSubmissionEmbed,
  endApplication,
  findBusinessOperationsRole,
  getActiveApplication,
  getApplicantIdFromEmbed,
  startApplication
} = require('../../lib/businessApplications');
const { logger } = require('../../lib/logger');
const { upsertBusiness } = require('../../lib/properties');

function parseBusinessApplicationButtonId(customId) {
  const [, action, userId, guildId] = customId.split(':');
  return { action, guildId, userId };
}

async function submitApplication(interaction, session) {
  try {
    const logChannel = await interaction.client.channels.fetch(BUSINESS_APPLICATION_LOG_CHANNEL_ID);
    const guild = await interaction.client.guilds.fetch(session.guildId);
    await guild.roles.fetch();
    const role = findBusinessOperationsRole(guild);
    const member = await guild.members.fetch(interaction.user.id).catch(() => null);

    await logChannel.send({
      content: role ? `${role}` : '@business operations team',
      embeds: [
        buildSubmissionEmbed({
          member,
          session,
          user: interaction.user
        })
      ],
      components: buildApplicationDecisionRows(),
      allowedMentions: role ? { roles: [role.id] } : { parse: [] }
    });
  } catch (error) {
    logger.error('Failed to log business application:', error);
    await interaction.update({
      content: 'Your application was completed, but I could not post the staff log.',
      embeds: [],
      components: []
    });
    return;
  }

  endApplication(interaction.user.id);

  await interaction.update({
    content: null,
    embeds: [buildSubmittedConfirmationEmbed()],
    components: []
  });
}

async function sendApplicationResult(interaction, embed, action, reason = null) {
  const applicantId = getApplicantIdFromEmbed(embed);

  if (!applicantId || action === 'void') {
    return;
  }

  const user = await interaction.client.users.fetch(applicantId).catch(() => null);

  if (!user) {
    return;
  }

  await user.send({
    embeds: [buildApplicationResultEmbed(action, reason)]
  }).catch(() => null);
}

async function applyApplicationDecision(interaction, action, reason = null) {
  const [embed] = interaction.message.embeds;

  if (!embed) {
    await interaction.reply({
      content: 'No application embed was found on this message.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

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

  await sendApplicationResult(interaction, embed, action, reason);

  await interaction.update({
    embeds: [buildDecidedApplicationEmbed(embed, action, reason)],
    components: buildApplicationDecisionRows(true)
  });
}

async function showReasonModal(interaction, action) {
  const reasonInput = new TextInputBuilder()
    .setCustomId('business_application_reason')
    .setLabel('Reason')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(1)
    .setMaxLength(1000)
    .setRequired(true);
  const modal = new ModalBuilder()
    .setCustomId(`business_application:reason:${action}:${interaction.channelId}:${interaction.message.id}`)
    .setTitle(action === 'accept' ? 'Accept Application' : 'Deny Application')
    .addComponents(new ActionRowBuilder().addComponents(reasonInput));

  await interaction.showModal(modal);
}

module.exports = {
  customIdPrefix: 'business_application',
  async execute(interaction) {
    const { action, guildId, userId } = parseBusinessApplicationButtonId(interaction.customId);
    const decisionActions = new Set(['accept', 'deny', 'accept_reason', 'deny_reason', 'void']);

    if (decisionActions.has(action)) {
      if (action === 'accept_reason') {
        await showReasonModal(interaction, 'accept');
        return;
      }

      if (action === 'deny_reason') {
        await showReasonModal(interaction, 'deny');
        return;
      }

      await applyApplicationDecision(interaction, action);
      return;
    }

    if (action === 'open' && interaction.channelId !== BUSINESS_APPLICATION_CHANNEL_ID) {
      await interaction.reply({
        content: `Business applications can only be started in <#${BUSINESS_APPLICATION_CHANNEL_ID}>.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (action === 'open') {
      if (getActiveApplication(interaction.user.id)) {
        await interaction.reply({
          content: 'You already have an active business application.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const dm = await interaction.user.createDM();
      await dm.send({
        embeds: [buildConfirmationEmbed()],
        components: buildConfirmationRows(interaction.user.id, interaction.guildId)
      });

      await interaction.reply({
        content: 'I sent the application start confirmation to your DMs.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (userId !== interaction.user.id) {
      await interaction.reply({
        content: 'That application button is not for you.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (action === 'cancel') {
      endApplication(interaction.user.id);

      await interaction.update({
        content: 'Your business application has been cancelled.',
        embeds: [],
        components: []
      });
      return;
    }

    if (action === 'start') {
      if (getActiveApplication(interaction.user.id)) {
        await interaction.reply({
          content: 'You already have an active business application.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const dm = await interaction.user.createDM();
      const session = startApplication({
        channelId: dm.id,
        guildId,
        messageId: interaction.message.id,
        userId: interaction.user.id
      });

      await interaction.deferUpdate();
      await interaction.deleteReply().catch(() => null);

      await interaction.channel.send({
        embeds: [buildQuestionEmbed(session)],
        components: buildCancelRows(interaction.user.id)
      });
      return;
    }

    if (action === 'submit') {
      const session = getActiveApplication(interaction.user.id);

      if (!session) {
        await interaction.reply({
          content: 'No active application was found.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await submitApplication(interaction, session);
    }
  }
};
