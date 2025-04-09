FROM python:3.10-alpine

# Install development dependencies
RUN apk add --no-cache git curl bash gcc musl-dev python3-dev libffi-dev

# Set up development environment
WORKDIR /app

# Install global development tools
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir poetry pytest pytest-asyncio flake8 black isort mypy

# Create development user
RUN addgroup -S developer && adduser -S -G developer developer
RUN mkdir -p /home/developer/.local && chown -R developer:developer /home/developer

# Set environment variables
ENV PYTHONPATH="/app:${PYTHONPATH}"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Use developer user for all subsequent operations
USER developer

# Default command starts a shell
CMD ["bash"]