FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
ENV HOST=0.0.0.0 PORT=8787
USER node
EXPOSE 8787
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/health || exit 1
CMD ["node", "src/server.js"]
