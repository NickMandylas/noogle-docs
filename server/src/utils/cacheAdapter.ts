import { CacheAdapter } from "@mikro-orm/core";
import { Redis } from "ioredis";

export class RedisCacheAdapter implements CacheAdapter {
  constructor(
    private readonly options: { expiration: number; client: Redis },
  ) {}

  async get<T = any>(name: string): Promise<T | undefined> {
    return new Promise<T | undefined>((ok, fail) => {
      this.options.client.get(name, (err, res) => {
        if (err) return fail(err);
        if (res) {
          return ok(JSON.parse(res));
        }
        return ok(undefined);
      });
    });
  }

  async set(
    name: string,
    data: any,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    origin: string,
    expiration?: number,
  ): Promise<void> {
    return new Promise<void>((ok, fail) => {
      this.options.client.set(
        name,
        JSON.stringify(data),
        "PX",
        expiration ? expiration : this.options.expiration,
        (err: any) => {
          if (err) return fail(err);
          ok();
        },
      );
    });
  }

  async clear(): Promise<void> {
    return new Promise<void>((ok, fail) => {
      this.options.client.flushdb((err) => {
        if (err) return fail(err);
        ok();
      });
    });
  }
}
