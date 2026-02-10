FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY server/package.json ./server/
RUN npm install --omit=dev --workspace=server 2>/dev/null || npm install --omit=dev

COPY server ./server
COPY app ./app

EXPOSE 8000

CMD ["node", "server/main.js"]
