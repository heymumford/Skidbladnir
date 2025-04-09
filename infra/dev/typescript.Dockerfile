FROM node:18-alpine

# Install development dependencies
RUN apk add --no-cache git curl bash jq openssh-client

# Set up development environment
WORKDIR /app

# Install global development tools
RUN npm install -g typescript ts-node nodemon jest ts-jest npm-check

# Create development user
RUN addgroup -S developer && adduser -S -G developer developer
RUN mkdir -p /home/developer/.npm && chown -R developer:developer /home/developer

# Set environment variables
ENV NODE_ENV=development
ENV PATH="/app/node_modules/.bin:${PATH}"

# Use developer user for all subsequent operations
USER developer

# Default command starts a shell
CMD ["bash"]