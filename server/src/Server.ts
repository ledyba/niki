import express from 'express';
import mysql, {RowDataPacket} from 'mysql2/promise';
import dayjs from 'dayjs';
import * as bridge from 'bridge';
import Repo from "./repo/Repo";

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
    this.app.set('etag', false);
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // API endpoints
    this.app.use('/api/index', this.index.bind(this));
    this.app.use('/api/list', this.list.bind(this));

    // Client files
    this.app.use(express.static("../client/dist", {
      etag: false
    }));
  }

  /* API endpoints */
  private async index(req: express.Request, resp: express.Response) {
    const conn = await this.db.getConnection()
    const repo = new Repo(conn);
    const now = dayjs();
    const months = (await repo.allMonth()).map((it) => it.toString());
    const texts =await repo.readDiaries(now.year(), now.month() + 1);
    const r: bridge.Index.Response = {
      months: months,
      texts: texts,
    };
    resp.send(r);
  }
  private async list(req: express.Request, resp: express.Response) {
    const conn = await this.db.getConnection()
    // language=MySQL
    const result = await conn.query("select `date`, `text` from texts");
    const rows = result[0] as RowDataPacket[]
    const obj: Array<any> = [];
    rows.forEach((it) => {
      const date = dayjs(it["date"] as Date);
      obj.push({
        text: it["text"] as string,
        date: date.format("YYYY/MM/DD"),
      });
    })
    resp.send(obj);
  }

  /* from out */
  start(): Promise<void> {
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
