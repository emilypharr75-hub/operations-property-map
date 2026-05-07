const fs = require('fs');
const path = require('path');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const SUGGESTION_COMMAND_CHANNEL_ID = '1491639237693673593';
const SUGGESTION_POST_CHANNEL_ID = '1501570812140851241';
const SUGGESTION_REVIEWER_ID = '1100251673542279279';
const SUGGESTION_DATA_PATH = path.join(__dirname, '..', '..', 'data', 'suggestions.json');
const REASON_SEPARATOR = '------------------------------------------------------------';

function ensureSuggestionDataFile() {
  fs.mkdirSync(path.dirname(SUGGESTION_DATA_PATH), { recursive: true });

  if (!fs.existsSync(SUGGESTION_DATA_PATH)) {
    fs.writeFileSync(SUGGESTION_DATA_PATH, '{}\n');
  }
}

function readSuggestions() {
  ensureSuggestionDataFile();

  try {
    return JSON.parse(fs.readFileSync(SUGGESTION_DATA_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeSuggestions(suggestions) {
  ensureSuggestionDataFile();
  fs.writeFileSync(SUGGESTION_DATA_PATH, `${JSON.stringify(suggestions, null, 2)}\n`);
}

function getSuggestion(messageId) {
  return readSuggestions()[messageId] ?? null;
}

function saveSuggestion(messageId, suggestion) {
  const suggestions = readSuggestions();
  suggestions[messageId] = {
    ...suggestion,
    messageId
  };
  writeSuggestions(suggestions);
}

function createPendingSuggestion({ authorAvatarUrl, authorId, authorName, text }) {
  return {
    authorAvatarUrl,
    authorId,
    authorName,
    text,
    status: 'pending',
    yesVotes: [],
    noVotes: [],
    reason: null
  };
}

function buildSuggestionFooter(suggestion) {
  const footerParts = [`User ID: ${suggestion.authorId}`];

  if (suggestion.messageId) {
    footerParts.push(`sID: ${suggestion.messageId}`);
  }

  return { text: footerParts.join(' | ') };
}

function buildBaseSuggestionEmbed(suggestion) {
  const embed = {
    footer: buildSuggestionFooter(suggestion)
  };

  if (suggestion.authorAvatarUrl) {
    embed.thumbnail = { url: suggestion.authorAvatarUrl };
  }

  return embed;
}

function buildSuggestionEmbed(suggestion) {
  const submitter = suggestion.authorName || `<@${suggestion.authorId}>`;
  const baseEmbed = buildBaseSuggestionEmbed(suggestion);

  if (suggestion.status === 'accepted' || suggestion.status === 'denied') {
    const accepted = suggestion.status === 'accepted';

    return {
      ...baseEmbed,
      color: accepted ? 0x2ecc71 : 0xe74c3c,
      title: accepted ? 'Suggestion Accepted' : 'Suggestion Denied',
      fields: [
        {
          name: 'Submitter',
          value: submitter
        },
        {
          name: 'Suggestion',
          value: suggestion.text
        },
        {
          name: 'Reason',
          value: `${REASON_SEPARATOR}\n${suggestion.reason}`
        }
      ]
    };
  }

  return {
    ...baseEmbed,
    color: 0xffffff,
    fields: [
      {
        name: 'Submitter',
        value: submitter
      },
      {
        name: 'Suggestion',
        value: suggestion.text
      },
      {
        name: 'Results so far',
        value: [
          `\u2705 : ${suggestion.yesVotes.length}`,
          `\u274c : ${suggestion.noVotes.length}`
        ].join('\n')
      }
    ]
  };
}

function buildSuggestionRows(messageId, disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`suggestion:vote:yes:${messageId}`)
        .setEmoji('\u2705')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(`suggestion:vote:no:${messageId}`)
        .setEmoji('\u274c')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`suggestion:review:accept:${messageId}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(`suggestion:review:deny:${messageId}`)
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled)
    )
  ];
}

function buildClosedSuggestionRows(messageId) {
  return buildSuggestionRows(messageId, true);
}

module.exports = {
  SUGGESTION_COMMAND_CHANNEL_ID,
  SUGGESTION_POST_CHANNEL_ID,
  SUGGESTION_REVIEWER_ID,
  buildClosedSuggestionRows,
  buildSuggestionEmbed,
  buildSuggestionRows,
  createPendingSuggestion,
  getSuggestion,
  saveSuggestion
};
