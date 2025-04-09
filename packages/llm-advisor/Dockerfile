# Multi-stage build for optimized LLM Advisor container
# This Dockerfile is designed for minimal rebuild cycles and efficient layer caching

# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Copy package files only to leverage layer caching for dependencies
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
COPY packages/llm-advisor/package.json ./packages/llm-advisor/package.json
COPY packages/api-bridge/package.json ./packages/api-bridge/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# Install dependencies (using layer caching)
RUN npm ci

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy only dependency layer
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/llm-advisor/node_modules ./packages/llm-advisor/node_modules

# Copy project configuration files
COPY tsconfig.json ./
COPY packages/llm-advisor/tsconfig.json ./packages/llm-advisor/
COPY packages/shared/tsconfig.json ./packages/shared/

# Copy shared libraries first (less likely to change)
COPY packages/shared/ ./packages/shared/

# Copy source code (ordered by change frequency)
# These layers are organized to optimize caching:
# 1. Config files (rarely change)
# 2. Utility functions (change occasionally)
# 3. Core services (change more frequently)
# 4. API and controllers (change most frequently)

# 1. Configuration files (rarely change)
COPY packages/llm-advisor/src/config/ ./packages/llm-advisor/src/config/

# 2. Utility functions (change occasionally)
COPY packages/llm-advisor/src/utils/ ./packages/llm-advisor/src/utils/

# 3. Core services (change more frequently)
COPY packages/llm-advisor/src/services/ ./packages/llm-advisor/src/services/

# 4. API and controllers (change most frequently)
COPY packages/llm-advisor/src/api/ ./packages/llm-advisor/src/api/
COPY packages/llm-advisor/src/controllers/ ./packages/llm-advisor/src/controllers/

# Finally copy any remaining files
COPY packages/llm-advisor/src/ ./packages/llm-advisor/src/

# Build the application
RUN npm run build -w packages/llm-advisor

# Stage 3: Runner (production image)
FROM node:18-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nodeuser \
    && mkdir -p /app/data /app/models \
    && chown -R nodeuser:nodejs /app/data /app/models

# Install only production dependencies
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/llm-advisor/package.json ./packages/llm-advisor/
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/packages/llm-advisor/dist ./packages/llm-advisor/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Mount points for hot-reloadable content
VOLUME ["/app/models", "/app/data"]

# Configure healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Security settings
RUN apk add --no-cache dumb-init

# Setup model watcher for hot reloads
COPY --from=builder /app/packages/llm-advisor/src/scripts/model-watcher.sh /app/scripts/model-watcher.sh
RUN chmod +x /app/scripts/model-watcher.sh

# Switch to non-root user
USER nodeuser

# Self-healing configuration
ENV SELF_HEALING_ENABLED=true
ENV RETRY_ATTEMPTS=3
ENV CIRCUIT_BREAKER_THRESHOLD=5

# Performance optimization settings
ENV MODEL_CACHE_SIZE=2048
ENV BATCH_PROCESSING_ENABLED=true
ENV USE_QUANTIZED_MODELS=true

# Expose API port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application with model hot reload watcher
CMD ["/bin/sh", "-c", "/app/scripts/model-watcher.sh & node packages/llm-advisor/dist/index.js"]