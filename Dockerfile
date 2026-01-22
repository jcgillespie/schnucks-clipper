# --- Stage 1: Build ---
FROM node:24-alpine3.23 AS builder

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run bundle

# --- Stage 2: Runtime ---
# Stage 2: Build a minimal distroless image
FROM alpine:3.23
# Set environment variables
ENV NODE_ENV=production
ENV DATA_PATH=/data
ENV SESSION_FILE=/data/session.json

RUN apk add --no-cache \
    nodejs \
    ca-certificates \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

WORKDIR /usr/src/app
RUN mkdir /data
COPY --from=builder /usr/src/app/dist/index.cjs ./index.cjs

CMD ["node", "index.cjs"]