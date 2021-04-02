import express from 'express';
import mysql from 'mysql2/promise';

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
  private db: mysql.Pool;
  private constructor(db: mysql.Pool, hostname: string, port: number) {
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
  private async list(req: express.Request, resp: express.Response) {
    const conn = await this.db.getConnection()
    const result = await conn.query("select * from texts");
    result.map(it => console.log(it));
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
    const db = await mysql.createPool({
      host: "localhost",
      port: 3306,
      user: "niki",
      password: "niki",
      database: "niki",
    });
    return new Server(db, hostname, port);
  }
}
