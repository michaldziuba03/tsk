import { inject, injectable } from "tsyringe";
import { IOrder, IOrderFilters } from "./order.types";
import { Database } from "../common/db";

@injectable()
export class OrderRepository {
  constructor(@inject(Database) private readonly db: Database) {}

  public async *getIterator(
    filters: IOrderFilters,
    batchSize: number
  ){
    const sql = this.db.getDriver()
    const query = sql<IOrder[]>`SELECT "orderID", "orderWorth", "products" FROM orders WHERE ${
      sql`"orderWorth" >= ${filters.minWorth || 0} ${filters.maxWorth ? sql`AND "orderWorth" <= ${filters.maxWorth}` : sql``}`
    }`;
    const cursor = query.cursor(batchSize);

    for await (const batch of cursor) {
      yield batch;
    }
  }

  public async findById(id: string) {
    const sql = this.db.getDriver()
    const result = await sql<IOrder[]>`SELECT "orderID", "orderWorth", "products" FROM orders WHERE "orderID" = ${id} LIMIT 1`;

    if (result.length === 0) {
      return;
    }

    return result[0];
  }

  public async batchInsert(orders: IOrder[]) {
    if (orders.length === 0) {
      return 0;
    }
    const sql = this.db.getDriver();
    const result = await sql.begin(tx => tx`
        INSERT INTO orders ${ tx(orders, 'orderID', 'orderWorth', 'products') } ON CONFLICT ("orderID") DO NOTHING`
    );

    return result.count
  }

  public async insertSyncAttempt(timestamp: Date, status: "finished" | "error") {
    const sql = this.db.getDriver();
    await sql`INSERT INTO sync_attempts ("createdAt", "status") VALUES (${timestamp.toISOString()}, ${status})`;
  }

  public async lastSyncAttempt(): Promise<Date | undefined> {
    const sql = this.db.getDriver();
    const result = await sql`SELECT "createdAt" FROM sync_attempts WHERE "status" = 'finished' ORDER BY "createdAt" DESC LIMIT 1`;

    if (result.length === 0) {
      return;
    }

    return result[0].createdAt;
  }
}
