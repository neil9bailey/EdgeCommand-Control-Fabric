FROM node:24-alpine

WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY services/api-gateway/package.json services/api-gateway/package.json
COPY apps/web-console/package.json apps/web-console/package.json

RUN npm install

COPY packages packages
COPY services/api-gateway services/api-gateway

WORKDIR /workspace/services/api-gateway
EXPOSE 3101

CMD ["npm", "run", "start"]

