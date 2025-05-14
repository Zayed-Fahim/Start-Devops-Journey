ARG NODE_VERSION=22-alpine
FROM node:${NODE_VERSION} 

WORKDIR /home/app

COPY package.json yarn.lock ./
RUN yarn install

COPY . .

CMD ["yarn", "dev"]