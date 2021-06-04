import fastify, {FastifyRequest, FastifyReply, FastifyInstance, RequestGenericInterface } from 'fastify';
import fastifyStatic from 'fastify-static'
import dayjs from 'dayjs';
import * as bridge from 'bridge';
import Repo from "./repo/Repo";
import Pool from "./repo/Pool";
import path from 'path';

const DATABASE_HOST = process.env['DATABASE_HOST'] || 'localhost';

interface IDiariesRequest extends RequestGenericInterface {
  Params: {
    yaer: number;
    month: number;
  }
}
interface IUpdateDiaryRequest extends RequestGenericInterface {
  Params: {
    yaer: number;
    month: number;
    day: number;
  }
}

/**
 * Server
 */
export default class Server {
  private readonly port: number;
  private readonly app: FastifyInstance;
  private readonly db: Pool;

  constructor(port: number) {
    this.port = port;
    this.app = fastify({
      logger: true,
      bodyLimit: 256*1024*1024,
      maxParamLength: 1024*1024,
    });
    this.db = new Pool(DATABASE_HOST);
    this.setup();
  }

  private setup() {
    // API endpoints
    this.app.get('/diaries/:year([0-9]{4})/:month([0-9]{2})', this.diaries.bind(this));
    this.app.post('/diaries/:year([0-9]{4})/:month([0-9]{2})/:day([0-9]{2})', this.updateDiary.bind(this));

    // Client files
    this.app.register(fastifyStatic, {
      root:  path.join(__dirname, '..', '..', 'client', 'dist'),
      prefix: '/',
      etag: false,
    });
  }

  /* API endpoints */
  private async diaries(req: FastifyRequest<IDiariesRequest>, reply: FastifyReply) {
    const repo = new Repo(this.db);

    const [year, month] = (()=>{
      const y = req.params.yaer;
      const m = req.params.month;
      return (!isNaN(y) && !isNaN(m)) ? [y, m] : [dayjs().year(), (dayjs().month() + 1)];
    })();

    const months = (await repo.allMonth()).map((it) => it.toString());
    const texts =await repo.readDiaries(year, month);
    const r: bridge.Diaries.Response = {
      months: months,
      diaries: texts,
    };
    reply.send(r);
  }
  private async updateDiary(req: FastifyRequest<IUpdateDiaryRequest>, reply: FastifyReply) {
    const repo = new Repo(this.db);
    const year = req.params.yaer;
    const month = req.params.month;
    const day = req.params.day;
    if(isNaN(year) || isNaN(month) || isNaN(day)) {
      reply.status(400);
      reply.send("Specify date correctly.");
      return;
    }
    const body = req.body as bridge.UpdateDiary.RequestBody;
    const changed = await repo.updateDiary(year, month, day, body.text);
    if(changed) {
      const months = (await repo.allMonth()).map((it) => it.toString());
      const r: bridge.UpdateDiary.Response = {
        months: months,
      };
      reply.send(r);
    } else {
      reply.send({} as bridge.UpdateDiary.Response);
    }
  }

  /* from out */
  async start(): Promise<string> {
    return this.app.listen(this.port, '::');
  }
}
