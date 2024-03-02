FROM node:18-alpine
WORKDIR /usr/src/kittychan_domain
COPY package.json .
RUN npm install -g typescript cpx
RUN npm install

ARG DISCORD_CLIENT_ID
ENV DISCORD_CLIENT_ID $DISCORD_CLIENT_ID

ARG DISCORD_BOT_TOKEN
ENV DISCORD_BOT_TOKEN $DISCORD_BOT_TOKEN

ARG DISCORD_CLIENT_SECRET
ENV DISCORD_CLIENT_SECRET $DISCORD_CLIENT_SECRET

ARG DISCORD_API
ENV DISCORD_API $DISCORD_API

ARG GRPC_URL
ENV GRPC_URL $GRPC_URL

ARG REDIS_HOST
ENV REDIS_HOST $REDIS_HOST

ARG REDIS_PASS
ENV REDIS_PASS $REDIS_PASS

ARG MONGO_URI
ENV MONGO_URI $MONGO_URI

ARG ES_HOST
ENV ES_HOST $ES_HOST

ARG LOAD_LANGUAGE_LIBS
ENV LOAD_LANGUAGE_LIBS $LOAD_LANGUAGE_LIBS

COPY . .
RUN tsc
CMD ["node","./dist/main.js"]
EXPOSE 5030