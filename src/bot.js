'use strict'

const fileHandler = require('./file-handler');
const constants = require("./constants");
const { COMING, MAYBE_COMING, NOT_COMING, NO, YES, MAYBE } = constants;

const { TOKEN, CHAT_ID } = process.env;
const Telegram = require('telegram-node-bot')
const TelegramBaseController = Telegram.TelegramBaseController

const DELIMITER = ' ';

let practicesCollection = {};

class Controller extends TelegramBaseController {

    buildUser(message) {
        const { firstName, lastName, id } = message.from;
        const fullName = `${firstName} ${lastName || ""}`;

        return { id, fullName };
    }

    buildPracticeReply(user, practiceDetails, status) {
        return `*${practiceDetails}*, _${status}_ - ${user.fullName} `;
    }

    createNewPratice(practiceId, details) {
        const newPractice = {};
        newPractice.details = details;
        newPractice.answerId = null;
        newPractice[COMING] = [];
        newPractice[NOT_COMING] = [];
        newPractice[MAYBE_COMING] = [];

        // Get practices
        const practicesCollection = fileHandler.read();
        practicesCollection[practiceId] = details;
        // Save in practices list
        fileHandler.write(practicesCollection);

        // Save a file for new practice
        const newFileName = fileHandler.buildPracticePath(practiceId);
        fileHandler.createFile(newFileName, newPractice);
    }

    addToGroup({ practice, user, group, unwantedGroups = [] }) {
        const isPresentInGroup = practice[group].find(item => item.id === user.id);

        if (isPresentInGroup) {
            return;
        }

        // Check if user is in different group
        unwantedGroups.forEach(unwantedGroup => {
            const index = practice[unwantedGroup].findIndex(item => item.id === user.id);
            if (index > -1) {
                practice[unwantedGroup] = [
                    ...practice[unwantedGroup].slice(0, index),
                    ...practice[unwantedGroup].slice(index + 1)
                ];
            }
        });

        // Add the user to the group
        practice[group].push(user);
    }

    sendPracticeReply(practiceId, practice, $) {
        const message = `*${practice.details}*\n\ncoming - ${practice[COMING].length} \nmaybe coming - ${practice[MAYBE_COMING].length} \n not coming - ${practice[NOT_COMING].length} `;

        if (practice.answerId) {
            fileHandler.updatePractice(practiceId, practice);
            return $.api.editMessageText(this.getListMessage(practice), {
                chat_id: CHAT_ID,
                message_id: practice.answerId,
                parse_mode: 'Markdown',
            });
        }

        // practicesCollection[practiceId].answerId = 'temp';
        $.sendMessage(this.getListMessage(practice), {
            parse_mode: 'Markdown',
            chat_id: CHAT_ID
        })
            .then(result => {
                    practice.answerId = result.messageId;
                    fileHandler.updatePractice(practiceId, practice);
            });
    }

    /**
     * @param {Scope} $
     */
    newPracticeHandler($) {
        // Save to DB the new practice

        // Get the practice ID
        const { text, messageId: practiceId } = $.message;

        const words = text.split(DELIMITER);
        words.shift();
        const relavantText = words.join(DELIMITER);

        this.createNewPratice(practiceId, relavantText);

        $.runInlineMenu({
            layout: 3,
            method: 'sendMessage',
            params: [relavantText, { chat_id: CHAT_ID }], //here you must pass the parameters for that method
            menu: [
                {
                    text: NO, //text of the button
                    callback: (callbackQuery, message) => { //to your callback will be passed callbackQuery and response from method
                        const user = this.buildUser(callbackQuery);
                        const practice = fileHandler.getPracticeDetails(practiceId);
                        this.addToGroup({
                            practice,
                            user,
                            group: NOT_COMING,
                            unwantedGroups: [COMING, MAYBE_COMING]
                        });
                        const replyText = this.buildPracticeReply(user, relavantText, 'לא באה');
                        this.sendPracticeReply(practiceId, practice, $);
                    }
                },
                {
                    text: MAYBE,
                    callback: (callbackQuery, message) => {
                        const user = this.buildUser(callbackQuery);
                        const practice = fileHandler.getPracticeDetails(practiceId);
                        this.addToGroup({
                            practice,
                            user,
                            group: MAYBE_COMING,
                            unwantedGroups: [COMING, NOT_COMING]
                        });
                        const replyText = this.buildPracticeReply(user, relavantText, 'אולי');
                        this.sendPracticeReply(practiceId, practice, $);
                    }
                },
                {
                    text: YES,
                    callback: (callbackQuery, message) => {
                        const user = this.buildUser(callbackQuery);
                        const practice = fileHandler.getPracticeDetails(practiceId);
                        this.addToGroup({
                            practice,
                            user,
                            group: COMING,
                            unwantedGroups: [NOT_COMING, MAYBE_COMING]
                        });
                        const replyText = this.buildPracticeReply(user, relavantText, 'באה');
                        this.sendPracticeReply(practiceId, practice, $);
                    }
                }]
        })
    }

    getListOfPractices() {
        let practices = "";
        Object.keys(practicesCollection).forEach(practiceId => {
            practices += `\n${practiceId} - ${practicesCollection[practiceId].details}`;
        });

        return practices;
    }

    isListEmpty() {
        return Object.keys(practicesCollection).length === 0;
    }

    deleteHandler($) {
        if (this.isListEmpty()) {
            return $.sendMessage('There are no practices');
        }

        const messagePrefix = 'Choose a practice ID:';
        const message = `${messagePrefix} \n${this.getListOfPractices()}`;
        $.sendMessage(message);
        $.waitForRequest
            .then($ => {
                const requestedId = $.message.text;
                const practice = practicesCollection[requestedId];

                // See if the practiceId exist
                if (!practice) {
                    return $.sendMessage(`Didn't find practice ID: ${requestedId}`);
                }

                const validationMessage = `Are you sure you want to delete practice ${practice.details}`;
                $.runInlineMenu({
                    layout: 2,
                    method: 'sendMessage',
                    params: [validationMessage],
                    menu: [{
                            text: 'Yes',
                            callback: (callbackQuery, message) => {
                                delete practicesCollection[requestedId];
                                $.sendMessage('Practice deleted');
                            }
                        }, {
                            text: 'No',
                            callback: (callbackQuery, message) => {
                                $.sendMessage('No action was done');
                            }
                        }]
                })
            });
    }

    getListMessage(practice) {
        let coming = `The list of girls who are coming to practice \n*${practice.details}*:\n`;
        if (practice[COMING].length === 0) {
            coming += " - \n";
        } else {
            practice[COMING].forEach((user, index) => coming += `${index+1}. ${user.fullName}\n`);
        }

        let maybeComing = `Girls who are maybe coming to practice:\n`;
        if (practice[MAYBE_COMING].length === 0) {
            maybeComing += " - \n";
        } else {
            practice[MAYBE_COMING].forEach((user, index) => maybeComing += `${index+1}. ${user.fullName}\n`);
        }

        let notComing = `Girls who are not coming to practice:\n`;
        if (practice[NOT_COMING].length === 0) {
            notComing += " - \n";
        } else {
            practice[NOT_COMING].forEach((user, index) => notComing += `${index+1}. ${user.fullName}\n`);
        }

        return `${coming}\n${maybeComing}\n${notComing}`;
    }

    listHandler($) {
        if (this.isListEmpty()) {
            return $.sendMessage('There are no practices');
        }

        const messagePrefix = 'Choose a practice ID:';
        const message = `${messagePrefix} \n${this.getListOfPractices()}`;
        $.sendMessage(message);
        $.waitForRequest
        .then($ => {
            const requestedId = $.message.text;
            const practice = practicesCollection[requestedId];

            // See if the practiceId exist
            if (!practice) {
                return $.sendMessage(`Didn't find practice ID: ${requestedId}`);
            }

            $.sendMessage(this.getListMessage(requestedId), { parse_mode: 'Markdown' })
        })
    }

    startHandler($) {
        $.sendMessage('Bot has started')
    }

    get routes() {
        return {
            'deleteCommand': 'deleteHandler',
            'listCommand': 'listHandler',
            'newPracticeCommand': 'newPracticeHandler',
            'startCommand': 'startHandler',
        }
    }
}

module.exports = Controller;
