namespace Index {
  export interface Response {
    months: [string],
  }
}

namespace Post {
  export interface Request {
    month: string,
    body: string,
  }
  export interface Response {
    months: [string],
  }
}