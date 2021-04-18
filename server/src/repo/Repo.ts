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
                from diaries order by year, month desc;
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
    const result =  await this.pool.prepare(query, [begin, end]);
    const diaries: Array<Diary> = [];
    for await (const row of result) {
      const date = dayjs(row.get('date') as Date);
      const text = row.get('text') as string;
      diaries.push(new Diary(date.year(), date.month() + 1, date.date(), text));
    }
    return diaries;
  }
}
