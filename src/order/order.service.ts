import { inject, injectable } from "tsyringe";
import { formatDate } from "date-fns";
import { env } from "../config";
import { Logger } from "../common/logger";
import { OrderRepository } from "./order.repository";
import { IOrder, IOrderFilters, IPaginatedResponse } from "./order.types";

@injectable()
export class OrderService {
  constructor(
    @inject(Logger)
    private readonly logger: Logger,
    @inject(OrderRepository)
    private readonly orderRepository: OrderRepository
  ) {}

  private readonly ORDERS_SEARCH_URL = `https://${env.DOMAIN}/api/admin/v5/orders/orders/search`;

  public getOrderById(id: string) {
    return this.orderRepository.findById(id);
  }

  public getOrdersIter(filters: IOrderFilters, batchSize: number) {
    return this.orderRepository.getIterator(filters, batchSize);
  }

  private formatRangeDate(date?: Date) {
    if (!date) {
      return undefined;
    }
    return formatDate(date, "yyyy-MM-dd HH:mm:ss");
  }

  public async onInit() {
    try {
      const lastSyncAttempt = await this.orderRepository.lastSyncAttempt();
      if (!lastSyncAttempt) {
        this.logger.log("No previous sync attempt found. Starting sync...");
        await this.syncOrders();
      } else {
        this.logger.log(
          `Last sync attempt was on ${lastSyncAttempt.toISOString()}`
        );
      }
    } catch (err) {
      this.logger.error(`Error during initialization: ${err}`);
      console.error(err);
    }
  }

  public async syncOrders() {
    this.logger.log("Syncing orders...");
    const from = await this.orderRepository.lastSyncAttempt();
    const now = new Date();

    const date = {
      to: this.formatRangeDate(now),
      from: this.formatRangeDate(from),
    };

    console.log(date);

    let page = 0;
    let hasMore = true;
    let count = 0;

    try {
      while (hasMore) {
        const response = await this.fetchOrders(date, page);
        const orders = response.data;
        hasMore = response.hasMore;
        count += orders.length;

        if (orders.length === 0) {
          break;
        }

        if (!hasMore) {
          break;
        }

        const insertedCount = await this.orderRepository.batchInsert(orders);
        this.logger.log(
          `Inserted ${insertedCount} orders in batch ${page + 1}`
        );
        page++;
      }

      this.logger.log(`Total inserted orders: ${count}`);
      await this.orderRepository.insertSyncAttempt(now, "finished");
    } catch (err) {
      this.logger.error(`Error while syncing orders: ${err}`);
      await this.orderRepository.insertSyncAttempt(now, "error");
      throw err;
    }
  }

  public async fetchOrders(date: { from?: string; to?: string }, page: number) {
    const body = {
      params: {
        resultsPage: page,
        resultsLimit: 100,
        ordersRange: {
          ordersDateRange: {
            ordersDateType: "add",
            ordersDateBegin: date.from,
            ordersDateEnd: date.to,
          },
        },
        ordersBy: [
          {
            elementName: "adding_time",
            sortDirection: "ASC",
          },
        ],
      },
    };

    const response = await fetch(this.ORDERS_SEARCH_URL, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": env.API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error with status: ${response.status}`);
    }

    const json = await response.json();
    if (json.errors && json.errors.faultCode === 2) {
      return { data: [], hasMore: false };
    }

    const result: IPaginatedResponse<IOrder> = {
      data: this.mapOrders(json.Results),
      hasMore: true,
    };

    if (page >= json.resultsNumberPage) {
      result.hasMore = false;
    }

    return result;
  }

  private mapOrders(results: any[]) {
    return results.map((order) => ({
      orderID: order.orderId,
      products: this.mapProducts(order.orderDetails.productsResults),
      orderWorth: this.calculateOrderWorth(order),
    }));
  }

  private mapProducts(productsResults: any[]) {
    return productsResults.map((product) => ({
      productID: product.productId,
      quantity: product.productQuantity,
    }));
  }

  private calculateOrderWorth(order: any) {
    const baseCurrency = order.orderDetails.payments.orderBaseCurrency;

    const productCost = baseCurrency.orderProductsCost || 0;
    const deliveryCost = baseCurrency.orderDeliveryCost || 0;
    const payformCost = baseCurrency.orderPayformCost || 0;
    const insuranceCost = baseCurrency.orderInsuranceCost || 0;

    return productCost + deliveryCost + payformCost + insuranceCost;
  }
}
