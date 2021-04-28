import { Migration } from '@mikro-orm/migrations';

export class Migration20210428173434 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "document" ("id" uuid not null, "delta" jsonb not null);');
    this.addSql('alter table "document" add constraint "document_pkey" primary key ("id");');
  }

}
