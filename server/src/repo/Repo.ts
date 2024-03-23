import dayjs from 'dayjs';
import CustomParseFormat from 'dayjs/plugin/customParseFormat';
import { Month, Diary } from './Entity'
import Pool from './Pool';

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
      months.push(new Month(row['year'] as number, row['month'] as number));
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
      const date = dayjs(row['date'] as Date);
      const text = row['text'] as string;
      diaries.push(new Diary(date.year(), date.month() + 1, date.date(), text));
    }
    return diaries;
  }

  async updateDiary(year: number, month: number, day: number, text: string): Promise<boolean> {
    text = text.trim();
    const date = `${('0000' + year).slice(-4)}/${('00' + month).slice(-2)}/${('00' + day).slice(-2)}`;
    if(text.length === 0) {
      return await this.pool.use(async (conn) => {
        // language=PostgreSQL
        const query = `
            delete from diaries where date = TO_DATE($1, 'YYYY/MM/DD');
        `;
        conn.query(query, [date]);
        return true;
      });
    }
    return await this.pool.use(async (conn) => {
      await conn.query("begin");
      try {
        const target = dayjs(new Date(year, month - 1, 1));
        const begin = target
          .format('YYYY/MM/DD');
        const end = target
          .add(1, 'month')
          .subtract(1, `day`)
          .format('YYYY/MM/DD');
        // language=PostgreSQL
        const counts = await conn.query(`select cast(count(*) as int) as count from diaries where (date between TO_DATE($1, 'YYYY/MM/DD') and TO_DATE($2, 'YYYY/MM/DD'));`, [begin, end]).one();
        const existedDiaries = counts['count'] as number;
        // language=PostgreSQL
        const query = `
            insert into diaries (date, text)
            values (TO_DATE($1, 'YYYY/MM/DD'), $2)
            ON CONFLICT (date) DO UPDATE SET text = EXCLUDED.text;
        `;
        await conn.query(query, [date, text]);
        await conn.query('COMMIT;');
        return existedDiaries === 0;
      } catch (e) {
        await conn.query('ROLLBACK;')
        throw e;
      }
    });
  }
}
