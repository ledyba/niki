import {Connection, RowDataPacket} from "mysql2/promise";
import dayjs from "dayjs";
import CustomParseFormat from 'dayjs/plugin/customParseFormat';
import { Month, Diary } from './Entity'

dayjs.extend(CustomParseFormat);

export default class Repo {
  private conn: Connection;
  constructor(conn: Connection) {
    this.conn = conn;
  }
  async allMonth(): Promise<Array<Month>> {
    // language=MySQL
    const query = "select distinct year(`date`) as `year`, month(`date`) as `month` from texts order by `year`, `month` desc;";
    const result = await this.conn.query(query);
    const rows = result[0] as RowDataPacket[]
    const months: Array<Month> = [];
    rows.forEach((it) => {
      months.push(new Month(it['year'], it['month']));
    });
    return months;
  }

  async readDiaries(year: number, month: number): Promise<Array<Diary>> {
    // language=MySQL
    const query = "select `date`, `text` from texts where (`date` between ? and ?) order by `date` desc;";
    const target = dayjs(new Date(year, month - 1, 1));
    const begin = target
      .format('YYYY/MM/DD');
    const end = target
      .add(1, 'month')
      .subtract(1, `day`)
      .format('YYYY/MM/DD');
    const result = await this.conn.query(query, [begin, end]);
    const rows = result[0] as RowDataPacket[]
    return rows.map((it) => {
      const date = dayjs(it['date']);
      const text = it['text'] as string;
      return new Diary(date.year(), date.month() + 1, date.date(), text);
    });
  }
}
