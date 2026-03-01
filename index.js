const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const reminders = [];

client.on('ready', () => {
  console.log(`TickTock is online!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // !remind 10m take a break
  if (message.content.startsWith('!remind')) {
    const args = message.content.split(' ');
    const timeArg = args[1];
    const reminderMsg = args.slice(2).join(' ');

    if (!timeArg || !reminderMsg) {
      return message.reply('Usage: `!remind <time> <message>` — example: `!remind 10m take a break`');
    }

    const ms = parseTime(timeArg);
    if (!ms) return message.reply('Invalid time! Use formats like `10s`, `5m`, `2h`, `1d`');

    const id = reminders.length + 1;
    const triggerAt = Date.now() + ms;

    reminders.push({ id, userId: message.author.id, channelId: message.channel.id, msg: reminderMsg, triggerAt, done: false });

    message.reply(`Got it! I'll remind you to **${reminderMsg}** in **${timeArg}** ⏰`);
  }

  // !reminders
  else if (message.content === '!reminders') {
    const userReminders = reminders.filter(r => r.userId === message.author.id && !r.done);
    if (userReminders.length === 0) return message.reply('You have no active reminders!');

    const list = userReminders.map(r => {
      const timeLeft = Math.round((r.triggerAt - Date.now()) / 1000 / 60);
      return `**#${r.id}** — ${r.msg} (in ~${timeLeft}m)`;
    }).join('\n');

    message.reply(`Your reminders:\n${list}`);
  }

  // !cancel 3
  else if (message.content.startsWith('!cancel')) {
    const id = parseInt(message.content.split(' ')[1]);
    const index = reminders.findIndex(r => r.id === id && r.userId === message.author.id);
    if (index === -1) return message.reply('Reminder not found!');
    reminders.splice(index, 1);
    message.reply(`Reminder #${id} cancelled!`);
  }

  // !snooze 3 10m
  else if (message.content.startsWith('!snooze')) {
    const args = message.content.split(' ');
    const id = parseInt(args[1]);
    const timeArg = args[2];
    const ms = parseTime(timeArg);
    const reminder = reminders.find(r => r.id === id && r.userId === message.author.id);
    if (!reminder) return message.reply('Reminder not found!');
    if (!ms) return message.reply('Invalid time!');
    reminder.triggerAt += ms;
    message.reply(`Reminder #${id} snoozed by ${timeArg}!`);
  }
});

// Check reminders every 10 seconds
setInterval(() => {
  const now = Date.now();
  reminders.forEach(async (r) => {
    if (!r.done && now >= r.triggerAt) {
      r.done = true;
      const channel = await client.channels.fetch(r.channelId);
      channel.send(`<@${r.userId}> ⏰ Reminder: **${r.msg}**`);
    }
  });
}, 10000);

function parseTime(str) {
  const unit = str.slice(-1);
  const value = parseInt(str.slice(0, -1));
  if (isNaN(value)) return null;
  if (unit === 's') return value * 1000;
  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  if (unit === 'd') return value * 24 * 60 * 60 * 1000;
  return null;
}

client.login(process.env.TOKEN);
