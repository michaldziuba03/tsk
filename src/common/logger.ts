import { singleton } from "tsyringe";

@singleton()
export class Logger {
  public log(message: string): void {
    console.log(`[LOG] ${new Date().toISOString()}: ${message}`);
  }

  public error(message: string): void {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`);
  }

  public warn(message: string): void {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`);
  }
}
