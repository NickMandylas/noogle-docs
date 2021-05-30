
FROM node:12-alpine

WORKDIR /usr/src/app

RUN apk update && apk add yarn python g++ make && rm -rf /var/cache/apk/*

COPY package.json ./
COPY yarn.lock ./

RUN yarn

COPY . .

RUN yarn build

ENV NODE_ENV production
ENV NODE_PATH ./dist

EXPOSE 8080
CMD ["node", "dist/index.js"]