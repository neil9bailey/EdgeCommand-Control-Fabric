FROM node:24-alpine

WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY apps/web-console/package.json apps/web-console/package.json
COPY services/api-gateway/package.json services/api-gateway/package.json

RUN npm install

COPY packages packages
COPY apps/web-console apps/web-console

WORKDIR /workspace/apps/web-console
EXPOSE 5174

CMD ["npm", "run", "dev"]

