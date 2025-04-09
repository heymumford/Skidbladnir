FROM golang:1.18-alpine

# Install development dependencies
RUN apk add --no-cache git curl bash make

# Set up development environment
WORKDIR /app

# Install global development tools
RUN go install github.com/cosmtrek/air@latest && \
    go install github.com/go-delve/delve/cmd/dlv@latest && \
    go install golang.org/x/tools/cmd/goimports@latest && \
    go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Create development user
RUN addgroup -S developer && adduser -S -G developer developer
RUN mkdir -p /home/developer/go && chown -R developer:developer /home/developer

# Set environment variables
ENV GO111MODULE=on
ENV GOPATH=/home/developer/go
ENV PATH="${GOPATH}/bin:${PATH}"

# Use developer user for all subsequent operations
USER developer

# Default command starts a shell
CMD ["bash"]