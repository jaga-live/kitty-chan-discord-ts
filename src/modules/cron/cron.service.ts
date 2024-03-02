import { CronJob, Task, ToadScheduler } from 'toad-scheduler';
import { CronModuleTypes } from './enum/cron-modules.enum';
import { AutoSailService } from '../auto-sail/auto-sail.service';
import { RedisService } from 'src/common/services/connectivity/redis.service';
import { Injectable, Inject } from '@nestjs/common';
import { ICronCreate } from 'src/modules/cron/interface/cron.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from 'src/modules/cron/models/cron.model';
import { Model } from 'mongoose';
import { DeploymentMode } from 'src/common/enum/deployment-mode.enum';

@Injectable()
export class CronService {
  private deploymentMode = process.env.DEPLOYMENT_MODE;
  private leaderProcessRedisKey = 'domain-cron-leader-process';
  private cronJobQueueRedisKey = 'domain-cron-queue-key';
  private cronJobs: any[];
  private scheduler: ToadScheduler;

  constructor(
    @Inject(RedisService) private readonly redisService: RedisService,
    @Inject(AutoSailService)
    private readonly autoSailService: AutoSailService,
    @InjectModel(Cron.name) private readonly cronModel: Model<Cron>,
  ) {
    this.scheduler = new ToadScheduler();
    this.bootstrap();
  }

  async createCron({ id, expression }: ICronCreate) {
    const task = new Task('cron', async () => {
      await this.handle(id);
    });
    const job = new CronJob({ cronExpression: expression }, task, { id });

    this.scheduler.addCronJob(job);
  }

  async updateCron({ id, expression }: ICronCreate) {
    this.deleteCron(id);
    this.createCron({ id, expression });
  }

  async deleteCron(id: string) {
    this.scheduler.removeById(id);
  }

  private async handle(id: string) {
    const getCron = await this.cronModel.findOne({ _id: id });

    if (!getCron) {
      this.scheduler.removeById(id);
    }

    switch (getCron.module) {
      case CronModuleTypes.AUTOSAIL: {
        this.autoSailService.handleCron(id);
      }
    }
  }

  /**Load and sync cron jobs */
  private async bootstrap() {
    //Standalone environment
    if (this.deploymentMode === DeploymentMode.STANDALONE) {
      this.cronJobs = await this.cronModel.find(
        { isActive: true },
        { expression: 1 },
      );

      for (const cron of this.cronJobs) {
        await this.createCron({ id: cron._id, expression: cron.expression });
      }

      return;
    }

    //Load Balanced environment
    const isLeaderProcess = await this.redisService.get(
      this.leaderProcessRedisKey,
    );

    if (!isLeaderProcess) {
      //Leader process
      await this.redisService.setWithExpiry(
        this.leaderProcessRedisKey,
        'true',
        20,
      );

      this.cronJobs = await this.cronModel.find(
        { isActive: true },
        { expression: 1 },
      );

      for (const cron of this.cronJobs) {
        await this.redisService.rightPush(
          this.cronJobQueueRedisKey,
          JSON.stringify({
            id: cron._id,
            expression: cron.expression,
          }),
        );
      }

      await this.redisService.expire(this.cronJobQueueRedisKey, 60);
    } else {
      /**
       * TODO: Wait for the leader process to finish
       */
      setTimeout(() => {}, 2000);

      let isQueueEmpty = false;

      while (!isQueueEmpty) {
        let getJob: any = await this.redisService.leftPop(
          this.cronJobQueueRedisKey,
        );

        if (!getJob) {
          isQueueEmpty = true;

          break;
        }

        getJob = JSON.parse(getJob);
        await this.createCron({ id: getJob.id, expression: getJob.expression });
      }
    }
  }
}
