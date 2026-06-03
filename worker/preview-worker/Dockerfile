FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY tsconfig.json ./
COPY src ./src
RUN npm install typescript && npx tsc -p tsconfig.json && npm uninstall typescript

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
