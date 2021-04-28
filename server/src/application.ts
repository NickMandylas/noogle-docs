import { IncomingMessage, Server, ServerResponse } from "http";
import { fastify, FastifyInstance } from "fastify";
import { __prod__ } from "./constants";
import fastifyCors from "fastify-cors";
import fastifyWebsocket, { SocketStream } from "fastify-websocket";

type NoogleMessage = {
  type: string;
  delta: any;
};

export default class Application {
  public host: FastifyInstance<Server, IncomingMessage, ServerResponse>;

  public init = async (): Promise<void> => {
    this.host = fastify({
      logger: {
        prettyPrint: !__prod__,
      },
      trustProxy: __prod__ ? 1 : 0,
    });

    this.host.register(fastifyCors, { origin: true, credentials: true });
    this.host.register(fastifyWebsocket);

    this.host.get("/", { websocket: true }, (connection: SocketStream) => {
      connection.socket.on("message", (message: string) => {
        const data: NoogleMessage = JSON.parse(message);

        this.host.websocketServer.clients.forEach((client) => {
          client.send(
            JSON.stringify({
              type: "received-updates",
              delta: data.delta,
            }),
          );
        });
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
