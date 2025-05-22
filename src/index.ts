import "reflect-metadata";
import express from "express";
import { container } from "tsyringe";
import { OrderController } from "./order/order.controller";
import { Logger } from "./common/logger";
import { env } from './config';
import { asyncHandler, basicAuth, errorHandler, httpLogger, notFoundHandler } from "./common/middleware";
import { Database } from "./common/db";
import { syncJob } from "./order/order.cron";

const orderController = container.resolve(OrderController);
const logger = container.resolve(Logger);
const db = container.resolve(Database);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);

app.get("/orders", basicAuth, asyncHandler(orderController.getOrdersList));
app.get("/orders/:orderId", basicAuth, asyncHandler(orderController.getOrderById));

app.use(notFoundHandler);
app.use(errorHandler);

syncJob.start();
app.listen(env.PORT, () => {
  logger.log(`Server is running on port ${env.PORT}`);
});

function onShutdown() {
  logger.log("Closing application...");
  db.cleanup();
  process.exit(0);
}

process.on('SIGINT', onShutdown);
