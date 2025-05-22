import { Request, Response } from "express";
import * as csv from "csv";
import { inject, injectable } from "tsyringe";
import { OrderService } from "./order.service";
import { Logger } from "../common/logger";
import { IOrder, IOrderFlatten } from "./order.types";
import { env } from "../config";

@injectable()
export class OrderController {
  constructor(
    @inject(OrderService)
    private orderService: OrderService,
    @inject(Logger)
    private logger: Logger
  ) {}

  private flattenOrders(orders: IOrder[]): IOrderFlatten[] {
    const result: IOrderFlatten[] = [];
    for (const order of orders) {
      for (const product of order.products) {
        result.push({
          orderID: order.orderID,
          orderWorth: order.orderWorth,
          productID: product.productID,
          quantity: product.quantity,
        });
      }
    }
    return result;
  }

  public getOrdersList = async (req: Request, res: Response) => {
    this.logger.log("Fetching orders list");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=orders.csv");

    const filters = {
      minWorth: parseFloat(req.query.minWorth as string) || 0,
      maxWorth: parseFloat(req.query.maxWorth as string) || undefined,
    };
    const iter = this.orderService.getOrdersIter(filters, env.BATCH_SIZE);
    let batchesCount = 0;
    let ordersCount = 0;

    const stringifier = csv.stringify({ header: true });
    stringifier.pipe(res);

    for await (const batch of iter) {
      const orders = this.flattenOrders(batch);

      for (const order of orders) {
        const overWatermark = stringifier.write(order);
        if (!overWatermark) {
          await new Promise((resolve) => stringifier.once("drain", resolve));
        }
      }

      ordersCount += batch.length;
      batchesCount++;
    }

    this.logger.log(`Fetched ${ordersCount} orders in ${batchesCount} batches`);
    stringifier.end();
  };

  public getOrderById = async (req: Request, res: Response) => {
    this.logger.log("Fetching order by ID");
    const orderId = req.params.orderId;
    const order = await this.orderService.getOrderById(orderId);
    if (!order) {
      res.status(404).json({
        message: "Order not found",
        orderId,
      });
      return;
    }

    res.status(200).json(order);
  };
}
