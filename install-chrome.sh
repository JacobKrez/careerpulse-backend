#!/bin/bash
echo "Installing Chrome dependencies for Puppeteer..."
apt-get update
apt-get install -y \
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
    xdg-utils
echo "Installing Chromium..."
# Try installing chromium-browser, fall back to chromium, or use snap
apt-get install -y chromium-browser || apt-get install -y chromium || (apt-get install -y snapd && snap install chromium)
CHROME_PATH=$(which chromium-browser || which chromium || echo 'Not found')
if [ "$CHROME_PATH" = "Not found" ]; then
  echo "Chromium installation failed!"
  exit 1
fi
echo "Chromium installed at: $CHROME_PATH"