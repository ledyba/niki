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
    this.app.get('^/diaries/:year([0-9]{4})/:month([0-9]{2})', this.diaries.bind(this));
    this.app.post('/diaries/:year([0-9]{4})/:month([0-9]{2})/:day([0-9]{2})', this.updateDiary.bind(this));

    // Client files
    this.app.use('^/:year([0-9]{4})/:month([0-9]{2})', express.static("../client/dist", {
      etag: false
    }));
    this.app.use(express.static("../client/dist", {
      etag: false
    }));
  }

  /* API endpoints */
  private async diaries(req: express.Request, resp: express.Response) {
    const repo = new Repo(this.db);

    const [year, month] = (()=>{
      const y = parseInt(req.params['year'] as string || '');
      const m = parseInt(req.params['month'] as string || '');
      return (!isNaN(y) && !isNaN(m)) ? [y, m] : [dayjs().year(), (dayjs().month() + 1)];
    })();

    const months = (await repo.allMonth()).map((it) => it.toString());
    const texts =await repo.readDiaries(year, month);
    const r: bridge.Diaries.Response = {
      months: months,
      diaries: texts,
    };
    resp.send(r);
  }
  private async updateDiary(req: express.Request, resp: express.Response) {
    const repo = new Repo(this.db);
    const year = parseInt(req.params['year'] as string || '');
    const month = parseInt(req.params['month'] as string || '');
    const day = parseInt(req.params['day'] as string || '');
    if(isNaN(year) || isNaN(month) || isNaN(day)) {
      resp.status(400);
      resp.send("Specify date correctly.");
      return;
    }
    const body = req.body as bridge.UpdateDiary.RequestBody;
    await repo.updateDiary(year, month, day, body.text);

    const months = (await repo.allMonth()).map((it) => it.toString());
    const r: bridge.UpdateDiary.Response = {
      months: months,
    };
    resp.send(r);
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
