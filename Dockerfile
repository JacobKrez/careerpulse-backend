FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN apt-get update && \
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
    xdg-utils && \
    apt-get install -y chromium

CMD ["node", "index.js"]
```

* **Render Configuration:**
* In your Render dashboard, go to your `careerpulse-backend` service.
* Go to the "Settings" tab.
* Change the "Environment" to "Docker".
* Render will automatically detect and use your `Dockerfile`.
* **Remove install-chrome.sh:**
* Since the Dockerfile handles the Chromium installation, you can remove the `install-chrome.sh` file.
* **Commit and Push:**
* Commit the `Dockerfile` and the removal of `install-chrome.sh` to your `careerpulse-backend` repository.
* `git add Dockerfile`
* `git rm install-chrome.sh`
* `git commit -m "Use Dockerfile for Chromium installation"`
* `git push origin main`

* **Netlify Solution: Fix Backend First**
* Once the Render backend is working, we can then re-add the submodule to the front end.

**4. Next Steps**

* **Implement Dockerfile:**
* Create the `Dockerfile` in your `careerpulse-backend` repository.
* Configure Render to use Docker.
* Remove the install-chrome.sh file.
* Commit and push the changes.
* **Monitor Render Deployment:**
* Monitor the Render deployment logs to ensure the Docker build is successful and Chromium is installed.
* **Test Backend Endpoints:**
* Once the backend is deployed, test the API endpoints.
* **Address Netlify Submodule Issues:**
* Once the backend is confirmed working, then we will address the front end submodule issues.

By using a Dockerfile, you'll have a more controlled and reliable environment for your backend, resolving the permission errors and ensuring Chromium is installed correctly.