import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity()
export class Document {
  @PrimaryKey({ type: "uuid" })
  id: string;

  @Property({ type: "json" })
  delta: {};
}
