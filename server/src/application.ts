import { IncomingMessage, Server, ServerResponse } from "http";
import { fastify, FastifyInstance } from "fastify";
import { __prod__ } from "./utils/constants";
import fastifyCors from "fastify-cors";
import fastifyWebsocket from "fastify-websocket";
import { Connection, IDatabaseDriver, MikroORM } from "@mikro-orm/core";
import ormConfig from "./orm.config";
import { Document } from "./entities/Document";
import redis from "./utils/redis";
import ClientStore from "./utils/clients";
import validator from "validator";
import WebsocketEx from "./types/websocket";

type NoogleMessage = {
  type: string;
  message: any;
};

export default class Application {
  public orm: MikroORM<IDatabaseDriver<Connection>>;
  public host: FastifyInstance<Server, IncomingMessage, ServerResponse>;
  public clients: ClientStore = new ClientStore();

  /*
   *
   * Method - Connect
   * @description MikroORM establishes conneciton to DB.
   * @return Promise<void>
   *
   */
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

  /*
   *
   * Method - Init
   * @description Fastify initialisation.
   * @return Promise<void>
   *
   */
  public init = async (): Promise<void> => {
    this.host = fastify({
      logger: {
        prettyPrint: !__prod__,
      },
      trustProxy: __prod__ ? 1 : 0,
    });

    this.host.register(fastifyCors, { origin: true, credentials: true });

    this.host.register(fastifyWebsocket);

    this.host.get("/", { websocket: true }, (connection) => {
      const socket = connection.socket as unknown as WebsocketEx;

      // Socket Close -- Remove Cursor from other connected document connections.
      socket.on("close", () => {
        this.clients.leave(socket.documentId, socket);

        if (this.clients.store[socket.documentId] === undefined) return; // If connection has no document associated.

        for (const client of this.clients.store[socket.documentId!]) {
          client.send(
            JSON.stringify({
              type: "remove-cursor",
              cursor: {
                id: socket.userId,
                name: socket.userName,
              },
            }),
          );
        }
      });

      // Socket Receive Event
      socket.on("message", async (message: string) => {
        const data: NoogleMessage = JSON.parse(message);
        const em = this.orm.em.fork();

        switch (data.type) {
          // Send changes to all connected to document.
          case "send-updates": {
            for (const client of this.clients.store[data.message.id]) {
              if (client != socket) {
                client.send(
                  JSON.stringify({
                    type: "received-updates",
                    delta: data.message.delta,
                  }),
                );
              }
            }
            break;
          }

          // Send updated cursor positions to document.
          case "send-cursor": {
            for (const client of this.clients.store[data.message.id]) {
              if (client != socket) {
                client.send(
                  JSON.stringify({
                    type: "received-cursor",
                    cursor: {
                      range: data.message.range,
                      id: data.message.userId,
                      name: data.message.name,
                    },
                  }),
                );
              }
            }
            break;
          }

          // On first load, retrieve document data from DB.
          case "retrieve-document": {
            if (!validator.isUUID(data.message.id)) {
              socket.send(
                JSON.stringify({
                  type: "invalid-document",
                  delta: {},
                }),
              );
              break;
            }

            const document = await em.findOne(Document, {
              id: data.message.id,
            });

            if (!document) {
              const newDocument = em.create(Document, {
                id: data.message.id,
                delta: "",
              });

              await em.persistAndFlush(newDocument);
            }

            socket.userId = data.message.userId;
            socket.userName = data.message.name;
            socket.documentId = data.message.id;

            this.clients.join(data.message.id, socket);

            socket.send(
              JSON.stringify({
                type: "load-document",
                delta: !!document ? document.delta : "",
              }),
            );

            for (const client of this.clients.store[data.message.id]) {
              if (client != socket) {
                client.send(
                  JSON.stringify({
                    type: "new-cursor",
                    cursor: {
                      id: data.message.userId,
                      name: data.message.name,
                    },
                  }),
                );
              }
            }

            break;
          }

          // Save documnent to DB.
          case "save-document": {
            const cache = await redis().get(`DOCUMENT_${data.message.id}`);
            const deltaJSON = JSON.stringify(data.message.delta);

            if (cache) {
              if (cache != deltaJSON) {
                const document = await em.findOne(Document, {
                  id: data.message.id,
                });

                if (document) {
                  document.delta = data.message.delta;

                  await em.persistAndFlush(document);
                  await redis().set(
                    `DOCUMENT_${data.message.id}`,
                    deltaJSON,
                    "EX",
                    60 * 60 * 24,
                  );
                }
              }
            } else {
              await redis().set(
                `DOCUMENT_${data.message.id}`,
                deltaJSON,
                "EX",
                60 * 60 * 24,
              );
            }

            break;
          }
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
