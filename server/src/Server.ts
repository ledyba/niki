import express from 'express';
import * as sqlite from 'sqlite';
import sqlite3 from 'sqlite3';

import mysql from 'promise-mysql';

/**
# express docs
http://expressjs.com/ja/4x/api.html
 */

/**
 * Server
 */
export default class Server {
  private readonly hostname: string
  private readonly port: number;
  private app: express.Express;
  private db: sqlite.Database;
  private constructor(db: sqlite.Database, hostname: string, port: number) {
    this.hostname = hostname;
    this.port = port;
    this.app = express();
    this.db = db;
    this.setup();
  }

  private setup() {
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: true }));

    // API endpoints
    this.app.use('/api/list', this.list.bind(this))

    // Client files
    this.app.use(express.static("../client/dist"))
  }

  /* API endpoints */
  private list(req: express.Request, resp: express.Response) {
    resp.send({"test": "test"});
  }

  /* from out */
  async start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this.app.listen(this.port, this.hostname, () => { resolve(); });
      } catch (err) {
        reject(err)
      }
    });
  }
  static async create(hostname: string, port: number): Promise<Server> {
    const db = await sqlite.open({
      filename: ":memory:",
      driver: sqlite3.Database,
    });
    return new Server(db, hostname, port);
  }
}
