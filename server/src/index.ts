import Application from "./application";

export const app = new Application();

(async () => {
  await app.connect();
  await app.init();
})();
