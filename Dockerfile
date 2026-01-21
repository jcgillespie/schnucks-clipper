# --- Stage 1: Build ---
FROM node:25-alpine3.22 AS builder

WORKDIR /usr/src/app
RUN mkdir /data

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# --- Stage 2: Runtime ---
# Stage 2: Build a minimal distroless image
FROM alpine:3.22
# Set environment variables
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production
ENV DATA_PATH=/data
ENV SESSION_FILE=/data/session.json

# Install Chromium and dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont \
    nodejs \
    npm \
    ca-certificates \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

WORKDIR /usr/src/app
RUN mkdir /data
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./

# Only copy specific required dependencies
RUN npm ci --include=prod

CMD ["node", "dist/index.js"]