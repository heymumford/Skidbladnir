FROM golang:1.18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

# Set up build environment
WORKDIR /app

# Copy go module files
COPY packages/binary-processor/go.mod packages/binary-processor/go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY packages/binary-processor ./

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o binary-processor ./cmd/server

# Create production image from scratch
FROM alpine:3.16

# Install runtime dependencies
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/binary-processor /app/binary-processor

# Create non-root user
RUN addgroup -S appuser && adduser -S -G appuser appuser
USER appuser

# Expose API port
EXPOSE 8090

# Start the binary processor service
ENTRYPOINT ["/app/binary-processor"]