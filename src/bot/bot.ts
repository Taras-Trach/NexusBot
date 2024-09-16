import TelegramAPI from 'node-telegram-bot-api';
import convertYoutubeVideoToMp3 from '../modules/convertYoutubeVideoToMp3Module';
import { exchangeObnalSchema, exchangeCryptoSchema } from '../modules/testModule';

export function startBot(bot: TelegramAPI) {
    bot.setMyCommands([
        { command: '/convertmp3', description: 'Convert YouTube video to MP3' },
        { command: '/crypto', description: 'Calculate crypto exchange' },
        { command: '/obnal', description: 'Calculate obnal exchange' },
    ]);

    bot.on('message', async (msg: TelegramAPI.Message) => {
        const chatID = msg.chat.id;
        const text = msg.text ?? '';

        try {
            switch (text) {

                case '/convertmp3':
                    bot.sendMessage(chatID, 'Send me a YouTube video link');
                    bot.once('message', async (msg: TelegramAPI.Message) => convertYoutubeVideoToMp3(chatID, bot, msg.text ?? ''));
                    break;

                case '/crypto':
                    exchangeCryptoSchema(chatID, bot, 0.027);
                    break;

                case '/obnal':
                    exchangeObnalSchema(chatID, bot, 'usd');
                    break;

                default:
                    break;
            }
        }
        catch (error: any) {
            console.error('Error handling message:', error);
        }
    });
}
