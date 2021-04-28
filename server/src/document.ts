import WebSocket from "ws";

type DocumentStore = { [key: string]: any };

export default class Document {
  public store: DocumentStore = {};

  public load = (id: string, socket: WebSocket) => {
    const document = this.store[id] || new Set();
    this.store[id] = document;
    document.add(socket);
  };

  public leave = (id: string, socket: WebSocket) => {
    const document = this.store[id];
    if (document) {
      document.delete(socket);
      if (document.size === 0) {
        delete this.store[id];
      }
    }
  };
}
