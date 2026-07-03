FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack install --global pnpm@11.5.2
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
RUN pnpm install --frozen-lockfile --filter api...
COPY api api
RUN pnpm --filter api build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack install --global pnpm@11.5.2
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/api/node_modules ./api/node_modules
COPY --from=build /app/api/package.json ./api/package.json
COPY --from=build /app/api/dist ./api/dist
COPY --from=build /app/api/drizzle.config.ts ./api/drizzle.config.ts
COPY --from=build /app/api/drizzle ./api/drizzle
CMD ["sh", "-c", "cd /app/api && ./node_modules/.bin/drizzle-kit migrate && node dist/main.js"]
