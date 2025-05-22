import postgres, { Sql } from "postgres";
import { env } from "../config";
import { injectable } from "tsyringe";

@injectable()
export class Database {
  private readonly driver: Sql;

  constructor() {
    this.driver = postgres(env.DATABASE_URL);
  }

  getDriver(): Sql {
    return this.driver;
  }

  cleanup(): void {
    this.driver.end();
  }
}
