# --- Stage 1: Build ---
FROM node:20-slim AS builder

WORKDIR /usr/src/app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# --- Stage 2: Runtime ---
FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /usr/src/app

# Copy production dependencies and compiled code
COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /usr/src/app/dist ./dist

# Create data directory for session persistence
RUN mkdir -p /data && chown -R pwuser:pwuser /data

# Set environment variables
ENV NODE_ENV=production
ENV DATA_PATH=/data
ENV SESSION_FILE=/data/session.json

# Use non-root user from Playwright image
USER pwuser

CMD ["node", "dist/index.js"]
