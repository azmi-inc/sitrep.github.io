FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY data ./data
COPY public ./public
USER node
EXPOSE 8787
CMD ["node", "server.js"]
