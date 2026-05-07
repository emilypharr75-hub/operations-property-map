const requiredEnv = ['TOKEN', 'CLIENT_ID', 'GUILD_ID'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing ${key} in .env`);
  }
}

function readBoolean(value) {
  return String(value).toLowerCase() === 'true';
}

const config = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  enableMessageContentIntent: readBoolean(process.env.ENABLE_MESSAGE_CONTENT_INTENT),
  enableGuildMembersIntent: readBoolean(process.env.ENABLE_GUILD_MEMBERS_INTENT)
};

module.exports = {
  config
};
