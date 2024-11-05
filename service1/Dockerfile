FROM node:20

USER root

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8199

CMD ["node", "app.js"]