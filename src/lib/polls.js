const fs = require('fs');
const path = require('path');

const POLLS_DATA_PATH = path.join(__dirname, '..', '..', 'data', 'polls.json');

function ensurePollDataFile() {
  fs.mkdirSync(path.dirname(POLLS_DATA_PATH), { recursive: true });

  if (!fs.existsSync(POLLS_DATA_PATH)) {
    fs.writeFileSync(POLLS_DATA_PATH, '{}\n');
  }
}

function readPolls() {
  ensurePollDataFile();

  try {
    return JSON.parse(fs.readFileSync(POLLS_DATA_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writePolls(polls) {
  ensurePollDataFile();
  fs.writeFileSync(POLLS_DATA_PATH, `${JSON.stringify(polls, null, 2)}\n`);
}

function getPoll(messageId) {
  return readPolls()[messageId] ?? null;
}

function savePoll(messageId, poll) {
  const polls = readPolls();
  polls[messageId] = {
    ...poll,
    messageId
  };
  writePolls(polls);
}

function createPoll({ authorId, question }) {
  return {
    authorId,
    question,
    yesVotes: [],
    noVotes: []
  };
}

function buildPollEmbed(poll) {
  return {
    color: 0xffffff,
    title: 'Poll',
    description: poll.question,
    fields: [
      {
        name: 'Results so far',
        value: [
          `Yes: ${poll.yesVotes.length}`,
          `No: ${poll.noVotes.length}`
        ].join('\n')
      }
    ],
    footer: { text: `Started by ${poll.authorId}` }
  };
}

module.exports = {
  buildPollEmbed,
  createPoll,
  getPoll,
  savePoll
};
