import "dotenv/config";
import path from "path";
import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./utils/constants";

export default {
  migrations: {
    path: path.join(__dirname, "./migrations"),
    pattern: /^[\w-]+\d+\.[tj]s$/,
    tableName: "migrations",
    transactional: true,
  },
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dbName: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: 5432,
  tsNode: !__prod__,
  entities: ["./dist/entities/**/*.js"],
  entitiesTs: ["./src/entities/**/*.ts"],
  type: "postgresql",
  debug: !__prod__,
} as Parameters<typeof MikroORM.init>[0];
