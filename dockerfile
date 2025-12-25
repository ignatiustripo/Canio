# ============================================
# DOCKERFILE FOR HEROKU WHATSAPP BOT
# Copy this file to your repository and deploy
# ============================================

# Use Heroku's official Node.js 18 runtime
FROM registry.heroku.com/nodejs:18

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set environment for Heroku
ENV NPM_CONFIG_PRODUCTION=false \
    NODE_ENV=production \
    NODE_MODULES_CACHE=true \
    NODE_VERBOSE=false \
    TZ=UTC

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --no-audit

# Copy app source
COPY . .

# Create session directory
RUN mkdir -p /app/session

# Expose Heroku port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Start command for Heroku
CMD ["npm", "start"]
