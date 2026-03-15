const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const clientId = process.env.CLIENT_ID || "1404793124991139850";
const guildId = process.env.GUILD_ID || "757207847883767948";
const token = process.env.TOKEN || "MTQwNDc5MzEyNDk5MTEzOTg1MA.GlsLdo.04Gmfonwe5BVOGd9WnIV3yb9MZ6h2rA3XlQeLE";

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data) commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`🔄 Refreshing ${commands.length} slash commands...`);
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✅ Slash commands deployed!');
  } catch (error) {
    console.error(error);
  }
})();
