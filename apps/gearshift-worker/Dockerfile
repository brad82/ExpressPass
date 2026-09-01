FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/gearshift-worker/package.json apps/gearshift-worker/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install
COPY . .
RUN npm run build -w packages/shared && npm run build -w apps/gearshift-worker

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/apps/gearshift-worker/package.json apps/gearshift-worker/package.json
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/apps/gearshift-worker/dist apps/gearshift-worker/dist
COPY --from=build /app/packages/shared/dist packages/shared/dist
RUN npm install --omit=dev
CMD ["node", "apps/gearshift-worker/dist/index.js"]
