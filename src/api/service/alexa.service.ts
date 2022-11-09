import { inject, injectable } from 'inversify';
import { REPLY } from '../../app/enum/reply';
import { ResponseService } from '../../app/service/shared/response.service';
import { TYPES } from '../../core/inversify.types';
import { TEXT } from '../types/text.types';

@injectable()
export class AlexaService{
	constructor(
        @inject(TYPES.ResponseService) private readonly responseService: ResponseService
	) { }
    
	async textServer(message: string, username: string, messageType: string) {
        
		const buildMessage = await this.buildMessage(message, username, messageType);

		await this.responseService.respond({
			type: REPLY.sendMessage,
			guild: {
				channelId: '1039519997778739250' ///Need to change to dynamic - TODO
			},
			body: {
				content: buildMessage
			}
		});
	}

	private async buildMessage(message: string, username: string, messageType: string) {
		let buildMessage: string;

		switch (messageType) {
			case TEXT.message:
				buildMessage = `[ ${username} from Alexa ]: ${message}`
				break;
		
			case TEXT.playGame:
				buildMessage = `[ ${username} from Alexa ]: ${username} wants to play VALORANT now!`
				break;
		
			default:
				break;
		}

		return buildMessage
	}
}