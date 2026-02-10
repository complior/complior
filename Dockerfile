FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY src/package.json ./src/
RUN npm install --omit=dev --workspace=src 2>/dev/null || npm install --omit=dev

COPY src ./src

EXPOSE 8000

CMD ["node", "src/main.js"]
