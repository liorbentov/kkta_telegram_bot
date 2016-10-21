'use strict'

const { TOKEN, CHAT_ID } = process.env;
const Telegram = require('telegram-node-bot')
const TelegramBaseController = Telegram.TelegramBaseController
const TextCommand = Telegram.TextCommand
const tg = new Telegram.Telegram(TOKEN, { workers: 1 })

const COMING = 'COMING';
const MAYBE_COMING = 'MAYBE_COMING';
const NOT_COMING = 'NOT_COMING';

const DELIMITER = ' ';

let practicesCollection = {};

class PingController extends TelegramBaseController {

    buildUser(message) {
        const { firstName, lastName, id } = message.from;
        const fullName = `${firstName} ${lastName}`;

        return { id, fullName };
    }

    buildPracticeReply(user, practiceDetails, status) {
        return `*${practiceDetails}*, _${status}_ - ${user.fullName} `;
    }

    /**
     * @param {Scope} $
     */
    newPracticeHandler($) {
        // Save to DB the new practice

        // Get the practice ID
        const { chat, text, messageId: practiceId } = $.message;
        const chatId = chat.id;

        const words = text.split(DELIMITER);
        words.shift();
        const relavantText = words.join(DELIMITER);

        practicesCollection[practiceId] = {};
        practicesCollection[practiceId].details = relavantText;
        practicesCollection[practiceId][COMING] = [];
        practicesCollection[practiceId][NOT_COMING] = [];
        practicesCollection[practiceId][MAYBE_COMING] = [];

        $.runInlineMenu({
            layout: 3,
            method: 'sendMessage',
            params: [relavantText, { chat_id: CHAT_ID }], //here you must pass the parameters for that method
            menu: [
                {
                    text: 'לא', //text of the button
                    callback: (callbackQuery, message) => { //to your callback will be passed callbackQuery and response from method
                        const user = this.buildUser(callbackQuery);
                        practicesCollection[practiceId][NOT_COMING].push(user);
                        const replyText = this.buildPracticeReply(user, relavantText, 'לא באה');
                        $.sendMessage(replyText, {
                            parse_mode: 'Markdown'
                        }/*, { reply_to_message_id: message.messageId }*/);
                    }
                },
                {
                    text: 'אולי',
                    callback: (callbackQuery, message) => {
                        const user = this.buildUser(callbackQuery);
                        practicesCollection[practiceId][MAYBE_COMING].push(user);
                        const replyText = this.buildPracticeReply(user, relavantText, 'אולי');
                        $.sendMessage(replyText, {
                            parse_mode: 'Markdown'
                        }/*, { reply_to_message_id: message.messageId }*/);
                    }
                },
                {
                    text: 'כן',
                    callback: (callbackQuery, message) => {
                        const user = this.buildUser(callbackQuery);
                        practicesCollection[practiceId][COMING].push(user);
                        const replyText = this.buildPracticeReply(user, relavantText, 'באה');
                        $.sendMessage(replyText, {
                            parse_mode: 'Markdown'
                        }/*, { reply_to_message_id: message.messageId }*/);
                    }
                }]
        })
        /*$.runMenu({
            layout: [2],
            message: 'Select:',
            oneTimeKeyboard: true,
            options: {
                parse_mode: 'Markdown' // in options field you can pass some additional data, like parse_mode
            },
            'כן': () => {
                const { firstName, lastName, id } = $.message.from;
                const fullUser = { [id] : `${firstName} ${lastName}` };
                practicesCollection[practiceId].coming.push(fullUser);
                $.sendMessage(`תודה ${firstName} ${lastName}, נתראה באימון ${relavantText}`, { reply_to_message_id: $.message.messageId })
            },
            'לא': () => {
                $.sendMessage(`${practiceId} - או.קיי, לא נורא, נתראה באימון הבא!`, { reply_to_message_id: $.message.messageId });
            }
        })*/
    }

    getListOfPractices() {
        let practices = "";
        Object.keys(practicesCollection).forEach(practiceId => {
            practices += `\n${practiceId} - ${practicesCollection[practiceId].details}`;
        });

        return practices;
    }

    listHandler($) {
        const messagePrefix = 'Choose a practice ID:';
        const message = `${messagePrefix} \n${this.getListOfPractices()}`;
        $.sendMessage(message);
        $.waitForRequest
        .then($ => {
            const requestedId = $.message.text;
            const practice = practicesCollection[requestedId];

            // See if the practiceId exist
            if (!practice) {
                $.sendMessage(`Didn't find practice ID: ${requestedId}`);
            }

            let coming = `The list of girls who are coming to practice \n*${practice.details} (${requestedId})*:\n`;
            practice[COMING].forEach(user => coming += `\n${user.fullName} (${user.id})`);
            $.sendMessage(coming, { parse_mode: 'Markdown' })
        })
    }

    startHandler($) {
        $.sendMessage('Bot has started')
    }

    get routes() {
        return {
            'newPracticeCommand': 'newPracticeHandler',
            'startCommand': 'startHandler',
            'listCommand': 'listHandler',
        }
    }
}

const pingController = new PingController();

tg.router
.when(
    new TextCommand('/start', 'startCommand'),
    pingController
)
.when(
    new TextCommand('list', 'listCommand'),
    pingController
)
.when(
    new TextCommand('new', 'newPracticeCommand'),
    pingController
)
