const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const BUSINESS_APPLICATION_CHANNEL_ID = '1481858406460424192';
const BUSINESS_APPLICATION_LOG_CHANNEL_ID = '1473127273623457914';
const BUSINESS_OPERATIONS_ROLE_NAME = 'business operations team';
const BUSINESS_APPLICATION_COLOR = 0xffffff;
const BUSINESS_APPLICATION_SUBMITTED_COLOR = 0xe67e22;
const BUSINESS_APPLICATION_ACCEPTED_COLOR = 0x2ecc71;
const BUSINESS_APPLICATION_DENIED_COLOR = 0xe74c3c;
const BUSINESS_APPLICATION_VOID_COLOR = 0x95a5a6;
const BUSINESS_APPLICATION_TIMEOUT_MS = 3 * 60 * 60 * 1000;

const QUESTIONS = [
  'What is your Discord ID?',
  'What is your Roblox ID?',
  'Where would your business operate? (If not at a location, give a postal code)',
  'What is the name of your business?',
  'What is your business going to be doing?',
  'Send your business logo.',
  'Send your Discord link. (Must have Civilian Admin Role with Admin perms.)'
];

const activeApplications = new Map();

function buildApplicationPanelEmbed() {
  return {
    color: BUSINESS_APPLICATION_COLOR,
    author: {
      name: 'Florida State Operations Business Entry'
    },
    title: 'FSRP | Florida State Operations Business Entry',
    description: [
      'Civilian Operations - Business Entry Application.',
      '',
      'Click the button below to begin your Entry process.',
      '',
      'Applications will now be read each Thursday from 4 PM+.'
    ].join('\n')
  };
}

function buildApplicationPanelRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('business_application:open')
        .setLabel('Custom Business Application')
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function buildConfirmationEmbed() {
  return {
    color: BUSINESS_APPLICATION_COLOR,
    title: 'Custom Business Application',
    description: [
      'Are you sure you want to apply?',
      '',
      'Once you start the application I will send you a series of questions. You will have 3 hours to complete the application. If you do not complete the application in time, you will have to restart. If you wish to stop the application feel free to click the cancel button at any time.'
    ].join('\n')
  };
}

function buildConfirmationRows(userId, guildId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`business_application:start:${userId}:${guildId}`)
        .setLabel('Start application')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`business_application:cancel:${userId}`)
        .setLabel('Cancel application')
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function buildQuestionEmbed(session) {
  return {
    color: BUSINESS_APPLICATION_COLOR,
    title: 'Custom Business Application',
    description: [
      `${session.currentQuestionIndex + 1}/${QUESTIONS.length}. ${QUESTIONS[session.currentQuestionIndex]}`,
      '',
      'To answer this question, please send a message to the bot with your response.'
    ].join('\n')
  };
}

function buildQuestionEditEmbed(session) {
  const questionIndex = session.editingQuestionIndex;

  return {
    color: BUSINESS_APPLICATION_COLOR,
    title: 'Custom Business Application',
    description: [
      `Changing ${questionIndex + 1}/${QUESTIONS.length}. ${QUESTIONS[questionIndex]}`,
      '',
      'To update this answer, please send a message to the bot with your response.'
    ].join('\n')
  };
}

function buildReviewEmbed(session) {
  const answerLines = session.answers.map((answer, index) =>
    `### ${index + 1}. ${answer.question}\n${answer.attachmentUrl ? `[View attachment](${answer.attachmentUrl})` : answer.value}`
  );

  return {
    color: BUSINESS_APPLICATION_COLOR,
    title: 'Custom Business Application',
    description: [
      'Review your answers before submitting.',
      answerLines.join('\n')
    ].join('\n')
  };
}

function buildReviewRows(userId) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`business_application:edit:${userId}`)
        .setPlaceholder('Select answers to change')
        .setMinValues(1)
        .setMaxValues(QUESTIONS.length)
        .addOptions(QUESTIONS.map((question, index) => ({
          label: `Question ${index + 1}`,
          description: question.slice(0, 100),
          value: String(index)
        })))
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`business_application:submit:${userId}`)
        .setLabel('Submit application')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`business_application:cancel:${userId}`)
        .setLabel('Cancel application')
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function buildCancelRows(userId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`business_application:cancel:${userId}`)
        .setLabel('Cancel application')
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function getActiveApplication(userId) {
  return activeApplications.get(userId) ?? null;
}

function startApplication({ channelId, guildId, messageId, userId }) {
  const session = {
    answers: [],
    channelId,
    currentQuestionIndex: 0,
    editQueue: [],
    editingQuestionIndex: null,
    guildId,
    messageId,
    reviewing: false,
    startedAt: Date.now(),
    userId
  };

  activeApplications.set(userId, session);
  return session;
}

function endApplication(userId) {
  return activeApplications.delete(userId);
}

function recordAnswer(session, message) {
  const attachment = message.attachments.first();
  const answer = attachment?.url || message.content.trim();
  const questionIndex = session.editingQuestionIndex ?? session.currentQuestionIndex;

  session.answers[questionIndex] = {
    attachmentUrl: attachment?.url || null,
    question: QUESTIONS[questionIndex],
    value: answer || 'No response'
  };

  if (session.editingQuestionIndex !== null) {
    session.editingQuestionIndex = session.editQueue.shift() ?? null;
    return session.editingQuestionIndex === null;
  }

  session.currentQuestionIndex += 1;
  return session.currentQuestionIndex >= QUESTIONS.length;
}

function startAnswerEdits(session, questionIndexes) {
  session.editQueue = questionIndexes
    .map(index => Number(index))
    .filter(index => Number.isInteger(index) && index >= 0 && index < QUESTIONS.length);
  session.editingQuestionIndex = session.editQueue.shift() ?? null;
  session.reviewing = false;
  return session.editingQuestionIndex !== null;
}

function formatDuration(ms) {
  return `${Math.max(1, Math.round(ms / 1000))}s`;
}

function formatJoinedGuild(member) {
  if (!member?.joinedTimestamp) {
    return 'Unknown';
  }

  const seconds = Math.floor(member.joinedTimestamp / 1000);
  return `<t:${seconds}:R>`;
}

function buildSubmissionEmbed({ member, session, user }) {
  const duration = formatDuration(Date.now() - session.startedAt);
  const answerLines = session.answers.map((answer, index) =>
    `### ${index + 1}. ${answer.question}\n${answer.attachmentUrl ? `[View attachment](${answer.attachmentUrl})` : answer.value}`
  );

  return {
    color: BUSINESS_APPLICATION_COLOR,
    title: `${user.username}'s 'Custom Business Application' Application Submitted`,
    description: [
      answerLines.join('\n'),
      '',
      '**Submission stats**',
      `UserId: ${user.id}`,
      `Username: ${user.username}`,
      `User: ${user}`,
      `Duration: ${duration}`,
      `Joined guild: ${formatJoinedGuild(member)}`
    ].join('\n'),
    thumbnail: {
      url: user.displayAvatarURL({ size: 128 })
    },
    footer: { text: `Applicant ID: ${user.id}` }
  };
}

function buildSubmittedConfirmationEmbed() {
  return {
    color: BUSINESS_APPLICATION_SUBMITTED_COLOR,
    title: 'Application Submitted',
    description: 'Your Custom Business Application has been submitted.'
  };
}

function buildApplicationDecisionRows(disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('business_application:accept')
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('business_application:deny')
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('business_application:accept_reason')
        .setLabel('Accept with reason')
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('business_application:deny_reason')
        .setLabel('Deny with reason')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('business_application:void')
        .setLabel('Void')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    )
  ];
}

function getApplicationDecisionColor(action) {
  if (action === 'accept') {
    return BUSINESS_APPLICATION_ACCEPTED_COLOR;
  }

  if (action === 'deny') {
    return BUSINESS_APPLICATION_DENIED_COLOR;
  }

  return BUSINESS_APPLICATION_VOID_COLOR;
}

function getApplicationDecisionLabel(action) {
  if (action === 'accept') {
    return 'Accepted';
  }

  if (action === 'deny') {
    return 'Denied';
  }

  return 'Voided';
}

function buildDecidedApplicationEmbed(embed, action, reason) {
  const data = embed.toJSON ? embed.toJSON() : { ...embed };
  const label = getApplicationDecisionLabel(action);
  const descriptionParts = [
    data.description || '',
    '',
    `**Application status**`,
    label
  ];

  if (reason) {
    descriptionParts.push(`Reason: ${reason}`);
  }

  return {
    ...data,
    color: getApplicationDecisionColor(action),
    title: `${(data.title || 'Application').replace(/ Application (Submitted|Accepted|Denied|Voided)$/u, '')} Application ${label}`,
    description: descriptionParts.join('\n')
  };
}

function getApplicantIdFromEmbed(embed) {
  const data = embed.toJSON ? embed.toJSON() : embed;
  const footerText = data.footer?.text || '';
  const match = footerText.match(/Applicant ID:\s*(\d{17,20})/);

  return match?.[1] || null;
}

function cleanApplicationAnswer(value) {
  const attachmentMatch = String(value || '').match(/\[View attachment\]\(([^)]+)\)/);

  return attachmentMatch?.[1] || String(value || '').trim();
}

function getApplicationAnswersFromEmbed(embed) {
  const data = embed.toJSON ? embed.toJSON() : embed;
  const lines = String(data.description || '').split('\n');
  const answers = {};
  let currentIndex = null;

  for (const line of lines) {
    const questionMatch = line.match(/^###\s+(\d+)\.\s+(.+)$/);

    if (questionMatch) {
      currentIndex = Number(questionMatch[1]);
      answers[currentIndex] = {
        question: questionMatch[2],
        value: ''
      };
      continue;
    }

    if (line === '**Submission stats**' || line === '**Application status**') {
      currentIndex = null;
      continue;
    }

    if (currentIndex && !answers[currentIndex].value && line.trim()) {
      answers[currentIndex].value = cleanApplicationAnswer(line);
    }
  }

  return answers;
}

function buildBusinessFromApplicationEmbed(embed) {
  const answers = getApplicationAnswersFromEmbed(embed);

  return {
    logo: answers[6]?.value || '',
    name: answers[4]?.value || '',
    owner: answers[2]?.value || answers[1]?.value || 'N/A',
    server: answers[7]?.value || '',
    type: answers[5]?.value || 'General'
  };
}

function buildApplicationResultEmbed(action, reason = null) {
  const accepted = action === 'accept';
  const voided = action === 'void';
  const title = voided
    ? 'Application Voided'
    : `Application ${accepted ? 'Accepted' : 'Denied'}`;
  const description = reason
    ? `Your Custom Business Application was ${accepted ? 'accepted' : 'denied'}.\n\nReason: ${reason}`
    : `Your Custom Business Application was ${voided ? 'voided' : accepted ? 'accepted' : 'denied'}.`;

  return {
    color: accepted ? BUSINESS_APPLICATION_ACCEPTED_COLOR : voided ? BUSINESS_APPLICATION_VOID_COLOR : BUSINESS_APPLICATION_DENIED_COLOR,
    title,
    description
  };
}

function findBusinessOperationsRole(guild) {
  return guild.roles.cache.find(role =>
    role.name.toLowerCase() === BUSINESS_OPERATIONS_ROLE_NAME
  ) || null;
}

module.exports = {
  BUSINESS_APPLICATION_CHANNEL_ID,
  BUSINESS_APPLICATION_LOG_CHANNEL_ID,
  BUSINESS_APPLICATION_TIMEOUT_MS,
  buildApplicationDecisionRows,
  buildApplicationPanelEmbed,
  buildApplicationPanelRows,
  buildCancelRows,
  buildConfirmationEmbed,
  buildConfirmationRows,
  buildQuestionEmbed,
  buildQuestionEditEmbed,
  buildReviewEmbed,
  buildReviewRows,
  buildDecidedApplicationEmbed,
  buildApplicationResultEmbed,
  buildSubmittedConfirmationEmbed,
  buildSubmissionEmbed,
  endApplication,
  findBusinessOperationsRole,
  getActiveApplication,
  getApplicantIdFromEmbed,
  buildBusinessFromApplicationEmbed,
  recordAnswer,
  startAnswerEdits,
  startApplication
};
