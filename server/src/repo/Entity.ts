export class Month {
  year: number;
  month: number;
  constructor(year: number, month: number) {
    this.year = year
    this.month = month;
  }
  toString(): string {
    return `0000${this.year}`.slice(-4) + '/' + `00${this.month}`.slice(-2);
  }
}

export class Diary {
  year: number;
  month: number;
  day: number;
  text: string;
  constructor(year: number, month: number, day: number, text: string) {
    this.year = year;
    this.month = month;
    this.day = day;
    this.text = text;
  }
}
