FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx next build --webpack

FROM node:24-alpine AS runner

LABEL org.opencontainers.image.title="JasMail"
LABEL org.opencontainers.image.description="JasMail — JMAP webmail with duplicate detection (fork of jmap-webmail)"
LABEL org.opencontainers.image.source="https://github.com/jasincanada/JasMail"
LABEL org.opencontainers.image.url="https://github.com/jasincanada/JasMail"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.vendor="jasincanada"

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk upgrade --no-cache && \
    npm uninstall -g npm && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npx && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
