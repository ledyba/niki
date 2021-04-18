import express from 'express';
import dayjs from 'dayjs';
import * as bridge from 'bridge';
import Repo from "./repo/Repo";
import Pool from "./repo/Pool";

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
  private readonly app: express.Express;
  private readonly db: Pool;

  constructor(hostname: string, port: number) {
    this.hostname = hostname;
    this.port = port;
    this.app = express();
    this.db = new Pool('localhost');
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
    const repo = new Repo(this.db);
    const now = dayjs();
    const months = (await repo.allMonth()).map((it) => it.toString());
    const texts =await repo.readDiaries(now.year(), now.month() + 1);
    const r: bridge.Index.Response = {
      months: months,
      diaries: texts,
    };
    resp.send(r);
  }
  private async list(req: express.Request, resp: express.Response) {
    const repo = new Repo(this.db);

    const [year, month] = (()=>{
      const y = parseInt(req.query['year'] as string | undefined ?? '');
      const m = parseInt(req.query['month'] as string | undefined ?? '');
      return (!isNaN(y) && !isNaN(m)) ? [y, m] : [dayjs().year(), (dayjs().month() + 1)];
    })();
    const result = await repo.readDiaries(year, month);

    const diaries = result.map((it) => {
      const diary: bridge.Entity.Diary = {
        year: it.year,
        month: it.month,
        day: it.day,
        text: it.text
      };
      return diary;
    });
    resp.send({
      year: year,
      month: month,
      diaries: diaries
    } as bridge.List.Response);
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
}
