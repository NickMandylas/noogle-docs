import { IncomingMessage, Server, ServerResponse } from "http";
import { fastify, FastifyInstance } from "fastify";
import { __prod__ } from "./constants";
import fastifyCors from "fastify-cors";
import fastifyWebsocket from "fastify-websocket";
import Document from "./document";
// import { v4 } from "uuid";

type NoogleMessage = {
  type: string;
  message: any;
};

export default class Application {
  public host: FastifyInstance<Server, IncomingMessage, ServerResponse>;
  public documents: Document;

  public init = async (): Promise<void> => {
    this.host = fastify({
      logger: {
        prettyPrint: !__prod__,
      },
      trustProxy: __prod__ ? 1 : 0,
    });

    this.host.register(fastifyCors, { origin: true, credentials: true });

    this.host.register(fastifyWebsocket);
    // this.socketMap = new Map();
    this.documents = new Document();

    this.host.get("/", { websocket: true }, (connection) => {
      // connection.socket.on("connection", () => {
      //   const id = v4();
      //   this.socketMap.set(connection.socket, id);
      // });

      connection.socket.on("message", (message: string) => {
        const data: NoogleMessage = JSON.parse(message);
        console.log(data);

        switch (data.type) {
          case "send-updates":
            this.host.websocketServer.clients.forEach((client) => {
              if (client.readyState === 1 && client != connection.socket) {
                client.send(
                  JSON.stringify({
                    type: "received-updates",
                    delta: data.message,
                  }),
                );
              }
            });
            break;

          case "retrieve-document":
            const document = "";

            this.documents.load(message, connection.socket);
            connection.socket.send(
              JSON.stringify({
                type: "load-document",
                data: document,
              }),
            );
            break;
        }
      });
    });

    try {
      const PORT = process.env.PORT || 4000;
      await this.host.listen(PORT, "0.0.0.0").then((address) => {
        console.log(`[noogle] Launched on address ${address}`);
      });
    } catch (err) {
      this.host.log.error(err);
      process.exit();
    }
  };
}
