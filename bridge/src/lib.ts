export namespace Entity {
  export interface Diary {
    year: number;
    month: number;
    day: number;
    text: string;
  }
}

export namespace Index {
  export interface Response {
    months: Array<string>,
    diaries: Array<Entity.Diary>
  }
}

export namespace List {
  export interface Response {
    year: number,
    month: number,
    diaries: Array<Entity.Diary>
  }
}