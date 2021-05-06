import dayjs from 'dayjs';
import CustomParseFormat from 'dayjs/plugin/customParseFormat';
import { Month, Diary } from './Entity'
import Pool from "./Pool";

dayjs.extend(CustomParseFormat);

export default class Repo {
  private pool: Pool;
  constructor(pool: Pool) {
    this.pool = pool;
  }
  async allMonth(): Promise<Array<Month>> {
    // language=PostgreSQL
    const query = `
select distinct date_part('year', date) as year,
                date_part('month', date) as month
                from diaries order by year desc, month desc;
`;
    const rows = await this.pool.query(query);
    const months: Array<Month> = [];
    for await (const row of rows) {
      months.push(new Month(row.get('year') as number, row.get('month') as number));
    }
    return months;
  }

  async readDiaries(year: number, month: number): Promise<Array<Diary>> {
    // language=PostgreSQL
    const query = `
select date, text from diaries
  where (date between TO_DATE($1, 'YYYY/MM/DD') and TO_DATE($2, 'YYYY/MM/DD'))
  order by date desc;
`;
    const target = dayjs(new Date(year, month - 1, 1));
    const begin = target
      .format('YYYY/MM/DD');
    const end = target
      .add(1, 'month')
      .subtract(1, `day`)
      .format('YYYY/MM/DD');
    const result =  await this.pool.query(query, [begin, end]);
    const diaries: Array<Diary> = [];
    for await (const row of result) {
      const date = dayjs(row.get('date') as Date);
      const text = row.get('text') as string;
      diaries.push(new Diary(date.year(), date.month() + 1, date.date(), text));
    }
    return diaries;
  }

  async updateDiary(year: number, month: number, day: number, text: string): Promise<boolean> {
    return await this.pool.use(async (cl) => {
      await cl.query("begin");
      try {
        const target = dayjs(new Date(year, month - 1, 1));
        const begin = target
          .format('YYYY/MM/DD');
        const end = target
          .add(1, 'month')
          .subtract(1, `day`)
          .format('YYYY/MM/DD');
        // language=PostgreSQL
        const counts = await cl.query(`select cast(count(*) as int) as count from diaries where (date between TO_DATE($1, 'YYYY/MM/DD') and TO_DATE($2, 'YYYY/MM/DD'));`, [begin, end]);
        const existedDiaries = counts.rows[0][0] as number;
        // language=PostgreSQL
        const query = `
            insert into diaries (date, text)
            values (TO_DATE($1, 'YYYY/MM/DD'), $2)
            ON CONFLICT (date) DO UPDATE SET text = EXCLUDED.text;
        `;
        const date = `${('0000' + year).slice(-4)}/${('00' + month).slice(-2)}/${('00' + day).slice(-2)}`;
        await cl.query(query, [date, text]);
        await cl.query('COMMIT;');
        return existedDiaries === 0;
      } catch (e) {
        await cl.query('ROLLBACK;')
        throw e;
      }
    });
  }
}
