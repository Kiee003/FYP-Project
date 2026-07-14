# ==============================================================================
# Web Performance Dashboard — single-container, multi-stage build
# Build context MUST be the project root (where client/ and server/ live).
# ==============================================================================

# ---- Stage 1: build the React frontend ----------------------------------------
FROM node:22-alpine AS client-build
WORKDIR /client

# Install client dependencies (cached unless package.json changes)
COPY client/package*.json ./
RUN npm install

# Build the production bundle -> /client/build
COPY client/ ./
RUN npm run build

# ---- Stage 2: the server (also serves the built frontend) ---------------------
FROM node:22-alpine
WORKDIR /app

# Chromium for Lighthouse audits
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV CHROME_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install server dependencies (production only)
COPY server/package*.json ./
RUN npm install --production

# Copy server source
COPY server/ ./

# Copy the compiled React build from stage 1 into the folder Express serves
COPY --from=client-build /client/build ./public

EXPOSE 5001
CMD ["node", "server.js"]