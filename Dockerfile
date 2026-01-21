# --- Stage 1: Build ---
FROM node:25-alpine3.22 AS builder

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run bundle

# --- Stage 2: Runtime ---
# Stage 2: Build a minimal distroless image
FROM alpine:3.22
# Set environment variables
ENV NODE_ENV=production
ENV DATA_PATH=/data
ENV SESSION_FILE=/data/session.json

# Install minimal Node.js runtime (no npm)
RUN apk add --no-cache \
    nodejs \
    ca-certificates \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

WORKDIR /usr/src/app
RUN mkdir /data
COPY --from=builder /usr/src/app/dist/index.js ./index.js

CMD ["node", "index.js"]