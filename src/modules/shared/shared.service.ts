import axios from 'axios';
import { GuildMember, Message } from 'discord.js';
import { injectable } from 'inversify';
import {
  IGuild,
  IGuildMember,
  IGuildMessage,
  IMessageReaction,
} from '../interface/shared.interface';

interface axiosConfig {
  method: string;
  route: string;
  body?: any;
}

@injectable()
export class SharedService {
  /////Global Axios Config
  async axiosInstance(payload: axiosConfig): Promise<any> {
    const { method, route } = payload;
    const headers = {
      Authorization: `Bot ${process.env.KITTY_CHAN_TOKEN}`,
      'content-type': 'application/json',
    };
    const data = {
      ...payload.body,
    };

    const axiosConfig: any = {
      method,
      url: `${process.env.DISCORD_API}${route}`,
      headers,
    };

    if (['put', 'post', 'patch'].includes(method)) axiosConfig.data = data;

    // console.log(axiosConfig)

    let resData: any;
    await axios(axiosConfig)
      .then((res) => {
        resData = res.data;
      })
      .catch((err) => {
        console.log(err.message);
      });
    return resData;
  }

  ////Extract users and channel info
  extractGuildInfo(content: Message) {
    const guild = new IGuild(
      content.guildId,
      content.guild.name,
      content.channelId,
      content.id,
      content.author.id,
      content.author.username,
      content.author.avatar,
      content.content,
      content.author.bot,
      content,
      {},
    );

    return guild;
  }
  ////Extract users and channel info
  extractGuildFromMember(member: GuildMember) {
    const guildMember: IGuildMember = {
      guildId: member.guild.id,
      userId: member.user.id,
    };
    return guildMember;
  }

  ////Extract Info from raw events
  extractGuildFromRaw(event) {
    const isBot = process.env.KITTY_CHAN_ID === event.d.user_id;
    const guild = {
      guildId: event.d.guild_id,
      channelId: event.d.channel_id,
      messageId: event.d.message_id,
      userId: event.d.user_id,
      emoji: event?.d?.emoji,
      isBot,
    } as IMessageReaction;

    return guild;
  }

  async filterWebLinks(message: IGuildMessage) {
    const trustedDomains = ['jaga.live', 'tenor.com'];
    const res = {
      isLink: false,
      isTrustable: false,
      domain: '',
    };

    const links =
      message.messageContent.match(/(https?:\/\/|www\.)\S+/gi) || [];

    for (const link of links) {
      res.isLink = true;
      const url = new URL(link);
      const domain = url.hostname.replace(/^www\./i, '');

      if (trustedDomains.includes(domain)) {
        res.isTrustable = true;
        res.domain = domain;
      }
    }

    return res;
  }
}