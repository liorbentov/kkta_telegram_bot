'use strict'

const { TOKEN, CHAT_ID } = process.env;
const Telegram = require('telegram-node-bot')
const TelegramBaseController = Telegram.TelegramBaseController
const TextCommand = Telegram.TextCommand
const tg = new Telegram.Telegram(TOKEN, { workers: 1 })

let practicesCollection = {};

class PingController extends TelegramBaseController {
    /**
     * @param {Scope} $
     */
    pingHandler($) {
        // Save to DB the new practice

        // Get the practice ID
        const { chat, text, messageId: practiceId } = $.message;
        const chatId = chat.id;

        const words = text.split(' ');
        words.shift();
        const relavantText = words.join(' ');

        practicesCollection[practiceId] = {};
        practicesCollection[practiceId].details = relavantText;
        practicesCollection[practiceId].coming = [];

        $.runInlineMenu({
            layout: 2,
            method: 'sendMessage',
            params: [relavantText, { chat_id: CHAT_ID }], //here you must pass the parameters for that method
            menu: [
                {
                    text: 'לא באה', //text of the button
                    callback: (callbackQuery, message) => { //to your callback will be passed callbackQuery and response from method
                        const { firstName, lastName, id } = callbackQuery.from;
                        const fullName = `${firstName} ${lastName}`;
                        const fullUser = { [id] : fullName };
                        const replyText = ` *${relavantText}*, _לא באה_ - ${fullName} `;
                        $.sendMessage(replyText, {
                            parse_mode: 'Markdown'
                        }/*, { reply_to_message_id: message.messageId }*/);
                    }
                },
                {
                    text: 'באה',
                    callback: (callbackQuery, message) => {
                        const { firstName, lastName, id } = callbackQuery.from;
                        const fullName = `${firstName} ${lastName}`;
                        const fullUser = { [id] : fullName };
                        practicesCollection[practiceId].coming.push(fullUser);
                        const replyText = ` *${relavantText}*, _באה_ - ${fullName} `;
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


    listHandler($) {
        const keys = Object.keys(practicesCollection);
        const messagePrefix = 'Choose a practice ID:';
        const message = `${messagePrefix} \n${keys.join('\n')}`;
        $.sendMessage(message);
        $.waitForRequest
        .then($ => {
            const requestedId = $.message.text;

            // See if the practiceId exist
            if (!practicesCollection[requestedId]) {
                $.sendMessage(`Didn't find practice ID: ${requestedId}`);
            }

            $.sendMessage(practicesCollection[requestedId])
        })
    }

    startHandler($) {
        $.sendMessage('Bot has started')
    }

    get routes() {
        return {
            'newPracticeCommand': 'newPracticeHandler',
            'pingCommand': 'pingHandler',
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
    new TextCommand('ping', 'pingCommand'),
    pingController
)
