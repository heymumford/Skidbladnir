FROM node:18-alpine AS builder

# Install minimal build dependencies
RUN apk add --no-cache git

# Set up build environment with memory constraints
WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Copy package files
COPY package.json ./
COPY packages/common/package*.json ./packages/common/
COPY packages/providers/package*.json ./packages/providers/
COPY packages/translation-layer/package*.json ./packages/translation-layer/

# Install dependencies with production flag to minimize size
RUN npm ci --production=false --no-fund --no-audit

# Copy source code
COPY tsconfig.json ./
COPY packages/common ./packages/common/
COPY packages/providers ./packages/providers/
COPY packages/translation-layer ./packages/translation-layer/

# Build TypeScript code with optimizations
RUN npm run build -- --sourceMap false

# Create a smaller intermediate image for pruning
FROM node:18-alpine AS pruner

WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Install production dependencies only, ensuring minimal footprint
RUN npm ci --only=production --no-fund --no-audit

# Create final production image (minimal)
FROM node:18-alpine

# Set up production environment
WORKDIR /app

# Copy built files and pruned dependencies from previous stages
COPY --from=pruner /app/dist ./dist
COPY --from=pruner /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create non-root user with minimal privileges
RUN addgroup -S appuser && adduser -S -G appuser appuser
USER appuser

# Set environment variables for resource constraints
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=256"

# Expose API port
EXPOSE 8080

# Health check to ensure service is running correctly
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the API service with explicit garbage collection settings
CMD ["node", "--expose-gc", "--gc-interval=100", "dist/api/index.js"]