FROM python:3.10-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev python3-dev libffi-dev

# Set up build environment
WORKDIR /app

# Copy requirements
COPY packages/orchestrator/requirements.txt ./requirements.txt

# Install dependencies and create virtual environment
RUN python -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY packages/orchestrator ./

# Create production image
FROM python:3.10-alpine

# Install runtime dependencies
RUN apk add --no-cache libffi

# Set up production environment
WORKDIR /app

# Copy virtual environment from builder stage
COPY --from=builder /app/venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

# Copy application code
COPY --from=builder /app /app

# Create non-root user
RUN addgroup -S appuser && adduser -S -G appuser appuser
USER appuser

# Set environment variables
ENV PYTHONPATH="/app:${PYTHONPATH}"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

# Expose API port
EXPOSE 8000

# Start the orchestration service
CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000"]