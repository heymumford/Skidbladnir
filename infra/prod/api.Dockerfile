FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

# Set up build environment
WORKDIR /app

# Copy package files
COPY package.json ./
COPY packages/common/package*.json ./packages/common/
COPY packages/providers/package*.json ./packages/providers/
COPY packages/translation-layer/package*.json ./packages/translation-layer/

# Install dependencies
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY packages/common ./packages/common/
COPY packages/providers ./packages/providers/
COPY packages/translation-layer ./packages/translation-layer/

# Build TypeScript code
RUN npm run build

# Create production image
FROM node:18-alpine

# Set up production environment
WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Create non-root user
RUN addgroup -S appuser && adduser -S -G appuser appuser
USER appuser

# Set environment variables
ENV NODE_ENV=production

# Expose API port
EXPOSE 8080

# Start the API service
CMD ["node", "dist/api/index.js"]