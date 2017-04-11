'use strict'

const Telegram = require('telegram-node-bot')
const Controller = require('./src/bot');

const { TOKEN, CHAT_ID } = process.env;

const TextCommand = Telegram.TextCommand
const tg = new Telegram.Telegram(TOKEN, { workers: 1 })

const controller = new Controller();

tg.router
.when(
    new TextCommand('/start', 'startCommand'),
    controller
)
.when(
    new TextCommand('list', 'listCommand'),
    controller
)
.when(
    new TextCommand('new', 'newPracticeCommand'),
    controller
)
.when(
    new TextCommand('delete', 'deleteCommand'),
    controller
)
