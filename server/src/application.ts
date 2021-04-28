import { IncomingMessage, Server, ServerResponse } from "http";
import { fastify, FastifyInstance } from "fastify";
import { __prod__ } from "./utils/constants";
import fastifyCors from "fastify-cors";
import fastifyWebsocket from "fastify-websocket";
import Document from "./document";
import { Connection, IDatabaseDriver, MikroORM } from "@mikro-orm/core";
import ormConfig from "./orm.config";

type NoogleMessage = {
  type: string;
  message: any;
};

export default class Application {
  public orm: MikroORM<IDatabaseDriver<Connection>>;
  public host: FastifyInstance<Server, IncomingMessage, ServerResponse>;
  public documents: Document;

  public connect = async (): Promise<void> => {
    try {
      this.orm = await MikroORM.init(ormConfig);
      const migrator = this.orm.getMigrator();
      const migrations = await migrator.getPendingMigrations();
      if (migrations && migrations.length > 0) {
        await migrator.up();
      }
    } catch (error) {
      console.log(`[noogle] ERROR – Unable to connect to database!`, error);
      throw Error(error);
    }
  };

  public init = async (): Promise<void> => {
    this.host = fastify({
      logger: {
        prettyPrint: !__prod__,
      },
      trustProxy: __prod__ ? 1 : 0,
    });

    this.host.register(fastifyCors, { origin: true, credentials: true });

    this.host.register(fastifyWebsocket);

    this.documents = new Document();

    this.host.get("/", { websocket: true }, (connection) => {
      connection.socket.on("message", (message: string) => {
        const data: NoogleMessage = JSON.parse(message);

        switch (data.type) {
          case "send-updates":
            for (const client of this.documents.store[data.message.id]) {
              if (client != connection.socket) {
                client.send(
                  JSON.stringify({
                    type: "received-updates",
                    delta: data.message.delta,
                  }),
                );
              }
            }
            break;

          case "retrieve-document":
            const document = "";

            this.documents.load(data.message.id, connection.socket);
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
