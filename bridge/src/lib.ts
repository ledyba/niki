export namespace Entity {
  export interface Diary {
    year: number;
    month: number;
    day: number;
    text: string;
  }
}

export namespace Diaries {
  export interface Response {
    months: Array<string>,
    diaries: Array<Entity.Diary>
  }
}

export namespace UpdateDiary {
  export interface RequestBody {
    text: string,
  }
  export interface Response {
    months: Array<string> | undefined
  }
}
