import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js';
import { Message } from 'discord.js';
import { inject, injectable } from 'inversify';
import { client } from '../app/app';
import { IGuild } from '../app/interface/shared.interface';
import { CommandService } from '../app/service/commands.service';
import { GamesService } from '../app/service/games/games.service';
import { GuildService } from '../app/service/guild.service';
import { LanguageFilter } from '../app/service/languageFilter.service';
import { LoggerService } from '../app/service/logger.service';
import { PortalService } from '../app/service/portal.service';
import { RolesService } from '../app/service/roles/roles.service';
import { FeatureFlagService } from '../app/service/shared/featureFlag.service';
import { WakeService } from '../app/service/wake.service';
import { SharedService } from '../app/shared/shared.service';
import { TYPES } from '../core/inversify.types';
import { EventsServiceHandlers } from '../proto/kitty_chan/EventsService';
import { NoResponse } from '../proto/kitty_chan/NoResponse';
import { RedisService } from '../shared/redis.service';

@injectable()
export class EventsHandler implements EventsServiceHandlers{
    [name: string]: any;
    constructor(
        @inject(TYPES.LanguageFilter) private readonly langFilter: LanguageFilter,
		@inject(TYPES.SharedService) private readonly sharedService: SharedService,
		@inject(TYPES.LoggerService) private readonly loggerService: LoggerService,
		@inject(TYPES.WakeService) private readonly wakeService: WakeService,
		@inject(TYPES.CommandService) private readonly commandService: CommandService,
		@inject(TYPES.FeatureFlagService) private readonly featureFlagService: FeatureFlagService,
		@inject(TYPES.PortalService) private readonly portalService: PortalService,
		@inject(TYPES.GameService) private readonly gameService: GamesService,
		@inject(TYPES.RolesService) private readonly rolesService: RolesService,
		@inject(TYPES.GuildService) private readonly guildService: GuildService,
		@inject(TYPES.RedisService) private readonly redisService: RedisService,
    ) { }
    
    async messageCreate(call: ServerUnaryCall<any, NoResponse>, callback: sendUnaryData<any>) {
    	const guildInfo = call.request as IGuild;
		
    	/**IMPORTANT 
		 * Temp fix until we use custom API methods
		*/
    	const channel = client.channels.cache.get(guildInfo.channelId) as any;
    	const message: Message = await channel.messages.fetch(guildInfo.messageId);
    	guildInfo.payload = message;
    	/**IMPORTANT */
		
    	//Validate if Bot message
    	if (guildInfo.isBot) return callback(null);
			
    	///Log
    	this.loggerService.log_message_count(guildInfo);

    	///Fetch feature flags
    	const featureFlag = await this.featureFlagService.getFeatureFlag(guildInfo);
    	if (!featureFlag) return callback(null);

    	guildInfo.featureFlag = { ...featureFlag };

    	///Check Portal Intent
    	const isPortal = await this.portalService.validate_channel(guildInfo);
    	if (isPortal) return callback(null);

    	///Check Game Intent
    	const isGame = await this.gameService.validateGame(guildInfo);
    	if (isGame) return callback(null);
		
    	///Non-English Detection (Only Detects Hindi)
    	if (guildInfo?.featureFlag?.hindi) {
    		const isNonEnglish = await this.langFilter.non_english_detection(guildInfo);
    		if (isNonEnglish) return callback(null);
    	}

    	if (guildInfo?.featureFlag?.strongLanguage) { 
    		///Strong Language Detection
    		const isStrongLang = await this.langFilter.strong_language_detection(guildInfo);
    		if (isStrongLang) return callback(null);
    	}

    	///Commands
    	const isCommand = await this.commandService.validateCommand(guildInfo);
    	if (isCommand) return callback(null);

    	///Wake Words
    	this.wakeService.validate(guildInfo);

    	///Games
    	this.gameService.call(guildInfo);

    	///Log Good Text Count
    	this.loggerService.text_count_logger(guildInfo);

    	///Close gRPC call
    	callback(null, {message: 'ok'});
    }
 
}