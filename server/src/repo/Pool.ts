import * as genericPool from 'generic-pool';
import {Client, ResultIterator, ResultRecord, connect} from "ts-postgres";

export default class Pool {
  private pool: genericPool.Pool<Client>
  constructor(hostname: string) {
    const opt = {
      host: hostname,
      port: 5432,
      user: 'niki',
      password: 'niki',
      database: 'niki',
    };
    this.pool = genericPool.createPool({
      create: async (): Promise<Client> => await connect(opt),
      destroy: async (client: Client) => {
        return client.end().then(() => { })
      },
      validate: (client: Client) => {
        return Promise.resolve(!client.closed);
      }
    }, { testOnBorrow: true });
  }
  async use<T>(fn: (cl: Client) => T | Promise<T>): Promise<T> {
    return await this.pool.use(fn);
  }
  async query(query: string, args?: any[]): Promise<ResultIterator<ResultRecord<any>>> {
    return await this.pool.use(async (cl) => {
      return cl.query(query, args);
    });
  }
}
