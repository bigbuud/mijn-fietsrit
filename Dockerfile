# ---- bouwen ----
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile
COPY . .
ENV NITRO_PRESET=node-server
RUN bun run build

# ---- draaien ----
FROM node:22-slim
WORKDIR /app
COPY --from=build /app/.output ./.output
# /data bevat ritten, account en sessiesleutel; eigenaar = standaard node-gebruiker (uid 1000)
RUN mkdir -p /data && chown 1000:1000 /data
ENV NODE_ENV=production PORT=5252 DATA_DIR=/data
VOLUME /data
EXPOSE 5252
USER 1000:1000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/auth/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
