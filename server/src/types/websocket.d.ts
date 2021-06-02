import WebSocket from "ws";

export default interface WebsocketEx extends WebSocket {
  documentId: string;
  userId: string;
  userName: string;
}
