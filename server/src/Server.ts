import fastify, {FastifyInstance, FastifyReply, FastifyRequest, RequestGenericInterface} from 'fastify';
import fastifyStatic from '@fastify/static';
import dayjs from 'dayjs';
import * as protocol from 'protocol';
import Repo from "./repo/Repo";
import Pool from "./repo/Pool";
import path from 'path';

const DATABASE_HOST = process.env['DATABASE_HOST'] || 'localhost';

interface IDiariesRequest extends RequestGenericInterface {
  Params: {
    year: string;
    month: string;
  }
}
interface IUpdateDiaryRequest extends RequestGenericInterface {
  Params: {
    year: string;
    month: string;
    day: string;
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
    this.app.get('/diaries/:year(^[0-9]{4}$)/:month(^[0-9]{2}$)', this.diaries.bind(this));
    this.app.post('/diaries/:year(^[0-9]{4}$)/:month(^[0-9]{2}$)/:day(^[0-9]{2}$)', this.updateDiary.bind(this));

    /**
     * https://www.fastify.io/docs/latest/Routes/
     * > Remember that static routes are always checked before parametric and wildcard.
     */

    // Client files
    const root = path.join(__dirname, '..', '..', 'client', 'dist');
    this.app.register(fastifyStatic, {
      root: root,
      serve: false,
    });
    const kDirRegexp = /^\/[0-9]{4}\/[0-9]{2}/;
    this.app.get('/*', async (req, reply) => {
      if(kDirRegexp.test(req.url)) {
        reply.redirect('/');
      } else {
        reply.sendFile(req.url);
      }
    });
  }

  /* API endpoints */
  private async diaries(req: FastifyRequest<IDiariesRequest>, reply: FastifyReply): Promise<protocol.Diaries.Response> {
    const repo = new Repo(this.db);

    const [year, month] = (()=>{
      const y = parseInt(req.params.year, 10);
      const m = parseInt(req.params.month, 10);
      return (!isNaN(y) && !isNaN(m)) ? [y, m] : [dayjs().year(), (dayjs().month() + 1)];
    })();

    const months = (await repo.allMonth()).map((it) => it.toString());
    const texts = await repo.readDiaries(year, month);
    return {
      months: months,
      diaries: texts,
    };
  }

  private async updateDiary(req: FastifyRequest<IUpdateDiaryRequest>, reply: FastifyReply): Promise<protocol.UpdateDiary.Response | string> {
    const repo = new Repo(this.db);
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const day = parseInt(req.params.day, 10);

    if(isNaN(year) || isNaN(month) || isNaN(day)) {
      reply.header('Content-Type', 'text/plain').status(400);
      return 'Specify date correctly.';
    }
    const body = req.body as protocol.UpdateDiary.RequestBody;
    const changed = await repo.updateDiary(year, month, day, body.text);
    if(changed) {
      const months = (await repo.allMonth()).map((it) => it.toString());
      return {
        months: months,
      } as protocol.UpdateDiary.Response;
    } else {
      return {} as protocol.UpdateDiary.Response;
    }
  }

  /* from out */
  async start(): Promise<string> {
    this.app.ready().then(() => console.log(this.app.printRoutes()));
    return this.app.listen({
      port: this.port,
      host: '::',
    });
  }
}
