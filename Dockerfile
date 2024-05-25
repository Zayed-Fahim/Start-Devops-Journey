FROM node:18-alpine

ENV MONGODB_USERNAME=admin \
    MONGODB_PASSWORD=pass \
    MONGODB_PORT=27017 \
    MONGODB_HOST=mongodb

WORKDIR /devops
COPY . .

RUN yarn

CMD ["node", "server.js"]
