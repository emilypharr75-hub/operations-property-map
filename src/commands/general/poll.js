const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder
} = require('discord.js');
const {
  buildPollEmbed,
  createPoll,
  savePoll
} = require('../../lib/polls');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a simple yes/no poll.')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('Poll question')
        .setRequired(true)
        .setMaxLength(250)
    ),
  async execute(interaction) {
    const question = interaction.options.getString('question', true).trim();

    if (!question) {
      await interaction.reply({
        content: 'Please include a poll question.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const poll = createPoll({
      authorId: interaction.user.id,
      question
    });

    await interaction.reply({
      embeds: [buildPollEmbed(poll)],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('poll:yes:pending')
            .setLabel('Yes')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('poll:no:pending')
            .setLabel('No')
            .setStyle(ButtonStyle.Danger)
        )
      ]
    });
    const message = await interaction.fetchReply();

    savePoll(message.id, poll);

    await message.edit({
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`poll:yes:${message.id}`)
            .setLabel('Yes')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`poll:no:${message.id}`)
            .setLabel('No')
            .setStyle(ButtonStyle.Danger)
        )
      ]
    });
  }
};
