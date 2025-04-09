FROM node:18-alpine

# Install minimal development dependencies
RUN apk add --no-cache git curl bash

# Set up development environment
WORKDIR /app

# Install global development tools (minimized set)
RUN npm install -g typescript ts-node nodemon

# Create development user
RUN addgroup -S developer && adduser -S -G developer developer
RUN mkdir -p /home/developer/.npm && chown -R developer:developer /home/developer

# Set environment variables 
ENV NODE_ENV=development
ENV PATH="/app/node_modules/.bin:${PATH}"
# Nodemon settings for reduced CPU usage
ENV NODEMON_LEGACY_WATCH=true
ENV NODEMON_DELAY=2500
# NPM settings for reduced memory usage
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV NPM_CONFIG_LOGLEVEL=warn

# Use developer user for all subsequent operations
USER developer

# Default command starts a shell
CMD ["bash"]