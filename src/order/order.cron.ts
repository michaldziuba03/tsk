import { CronJob } from "cron";
import { container } from "tsyringe";
import { OrderService } from "./order.service";
import { Logger } from "../common/logger";

const logger = container.resolve(Logger);
const orderService = container.resolve(OrderService);
orderService.onInit();

export const syncJob = CronJob.from({
  cronTime: "0 0 * * *",
  onTick: async function () {
    /*
      Jeżeli zachcemy odaplić tego CRONa na wielu maszynach / procesach to warto rozważyć 
      mechanizmy distributed lock oparte na TTL jak Redlock w Redisie itd.
    */
    try {
      logger.log("Running daily sync task...");
      await orderService.syncOrders();
    } catch (err) {
      logger.error("Daily sync task failed");
      console.error(err);
    }
  },
});
