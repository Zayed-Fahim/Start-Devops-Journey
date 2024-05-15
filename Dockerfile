FROM node:18-alpine

ENV MONGODB_USERNAME=admin \
    MONGODB_PASSWORD=pass \
    MONGODB_PORT=27017 \
    MONGODB_HOST=localhost

WORKDIR /devops
COPY . .

RUN npm install

CMD ["node", "server.js"]
