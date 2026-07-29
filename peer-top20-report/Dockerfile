FROM node:20-alpine

WORKDIR /app

COPY peer-top20-extension/package.json peer-top20-extension/package-lock.json ./peer-top20-extension/
RUN cd peer-top20-extension && npm ci

COPY peer-top20-extension/ ./peer-top20-extension/
RUN cd peer-top20-extension && npm run build

COPY peer-top20-report/package.json peer-top20-report/package-lock.json ./peer-top20-report/
RUN cd peer-top20-report && npm ci --omit=dev

COPY peer-top20-report/ ./peer-top20-report/

WORKDIR /app/peer-top20-report

ENV NODE_ENV=production
ENV PORT=3456

EXPOSE 3456

VOLUME ["/app/peer-top20-report/data"]

CMD ["node", "server.js"]
