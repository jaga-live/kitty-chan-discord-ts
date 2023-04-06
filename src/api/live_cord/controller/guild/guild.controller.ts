import { inject } from 'inversify';
import { controller, httpPatch, httpPost } from 'inversify-express-utils';
import { Req } from '../../../../core/custom_types';
import { TYPES } from '../../../../core/inversify.types';
import { InternalAuthGuard } from '../../../auth/guards/InternalAuthGuard';
import { GuildAPIService } from '../../service/guild.service';


@controller('/live_cord/guild')
export class GuildController {
	constructor(
        @inject(TYPES.GuildAPIService) private readonly guildService: GuildAPIService
	) { }
    
    //**Profile**//
    @httpPost('/profile', InternalAuthGuard)
	async view_guild_features(req: Req) {
		const { discord_id } = req.userData;
		const { guildId } = req.body;

		return this.guildService.fetch_guild_profile(discord_id, guildId);
        
	}

    //**Feature**//
    @httpPatch('/features', InternalAuthGuard)
    async edit_guild_features(req: Req) {
    	const { discord_id } = req.userData;
    	const { guildId, features } = req.body;
    
    	return this.guildService.edit_guild_features(discord_id, guildId, features);
        
    }
}