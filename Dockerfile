# Stage 1: Build environment with dependencies
FROM node:18 AS builder

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Stage 2: Runtime environment with Chromium
FROM node:18-slim

# Set working directory
WORKDIR /app

# Create a non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && mkdir -p /app && chown appuser:appuser /app

# Install system dependencies and Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    chromium \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy built dependencies and source code
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Switch to non-root user
USER appuser

# Run the application
CMD ["node", "index.js"]