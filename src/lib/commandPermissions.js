const { MessageFlags } = require('discord.js');

const DEPUTY_DIRECTOR_ROLE_ID = '1445166926006452306';
const DEPUTY_DIRECTOR_ROLE_NAME = 'Deputy Director';

function findDeputyDirectorRole(guild) {
  return guild.roles.cache.get(DEPUTY_DIRECTOR_ROLE_ID) ||
    guild.roles.cache.find(role => role.name.toLowerCase() === DEPUTY_DIRECTOR_ROLE_NAME.toLowerCase()) ||
    null;
}

function isDeputyDirectorOrUp(interaction) {
  if (!interaction.guild || !interaction.member?.roles?.cache) {
    return false;
  }

  if (interaction.member.permissions?.has('Administrator')) {
    return true;
  }

  const deputyDirectorRole = findDeputyDirectorRole(interaction.guild);

  if (!deputyDirectorRole) {
    return false;
  }

  return interaction.member.roles.highest.position >= deputyDirectorRole.position;
}

async function requireDeputyDirectorOrUp(interaction) {
  if (isDeputyDirectorOrUp(interaction)) {
    return true;
  }

  await interaction.reply({
    content: 'Only Deputy Director and above can use this command.',
    flags: MessageFlags.Ephemeral
  });

  return false;
}

module.exports = {
  DEPUTY_DIRECTOR_ROLE_ID,
  isDeputyDirectorOrUp,
  requireDeputyDirectorOrUp
};
