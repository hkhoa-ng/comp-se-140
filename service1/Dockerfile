
FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Expose port 8199
EXPOSE 8199

CMD ["node", "app.js"]
