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
    texts: Array<Entity.Diary>
  }
}

export namespace Post {
  export interface Request {
    month: string,
    body: string,
  }
  export interface Response {
    months: [string],
  }
}