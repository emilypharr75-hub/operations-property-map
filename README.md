# Operations Bot

Discord property tools plus a static Liberty County property map website.

## Website

The website is in `public/` and is ready for Vercel. Vercel serves the static files from `public/`, and `npm run build` refreshes the exported property data before deployment.

Important files:

- `public/index.html`: website shell.
- `public/app.js`: map, search, zoom, property selection, and edit mode.
- `public/styles.css`: website styles.
- `public/properties.json`: exported property data for the website.
- `public/property-markers.json`: property box positions.
- `public/assets/erlc-map.svg`: map image.

Vercel settings:

- Build command: `npm run build`
- Output directory: `public`

Live box saving uses the `/api/save-boxes` Vercel function. Add these Vercel environment variables for automatic GitHub commits:

- `GITHUB_TOKEN`: GitHub token with contents read/write access to this repository.
- `EDIT_PASSWORD`: the edit-mode password.
- `GITHUB_REPO`: optional, defaults to `emilypharr75-hub/operations-property-map`.
- `GITHUB_BRANCH`: optional, defaults to `main`.

## Setup

1. Run `npm install`.
2. Copy `.env.example` to `.env`.
3. Fill in `TOKEN`, `CLIENT_ID`, and `GUILD_ID`.
4. Run `npm run deploy` to deploy slash commands.
5. Run `npm start` to start the bot.

## Folders

- `src/commands`: slash commands.
- `src/events`: Discord client events.
- `src/lib`: shared framework utilities.

## Add A Command

Create a file in `src/commands/category/name.js`:

```js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('example')
    .setDescription('Example command.'),
  async execute(interaction) {
    await interaction.reply('Example response.');
  }
};
```

Then run `npm run deploy`.
