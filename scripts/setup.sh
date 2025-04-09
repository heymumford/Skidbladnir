#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

#!/bin/bash
set -e

echo "Setting up TestBridge development environment..."

# Check prerequisites
echo "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required but not installed. Aborting." >&2; exit 1; }
command -v go >/dev/null 2>&1 || { echo "Go is required but not installed. Aborting." >&2; exit 1; }
command -v podman >/dev/null 2>&1 || { echo "Podman is required but not installed. Aborting." >&2; exit 1; }

# Initialize Node.js packages
echo "Initializing Node.js packages..."

# Common package
echo "Setting up common package..."
cd packages/common
npm init -y
npm install --save typescript @types/node jest @types/jest ts-jest
npx tsc --init

# Zephyr extractor
echo "Setting up Zephyr extractor..."
cd ../zephyr-extractor
npm init -y
npm install --save typescript @types/node jest @types/jest ts-jest axios
npx tsc --init

# qTest loader
echo "Setting up qTest loader..."
cd ../qtest-loader
npm init -y
npm install --save typescript @types/node jest @types/jest ts-jest axios
npx tsc --init

# Transformer
echo "Setting up transformer..."
cd ../transformer
npm init -y
npm install --save typescript @types/node jest @types/jest ts-jest
npx tsc --init

# Initialize Python package
echo "Setting up Python orchestrator..."
cd ../orchestrator
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install pytest pytest-asyncio fastapi uvicorn pydantic sqlalchemy psycopg2-binary redis
pip freeze > requirements.txt
deactivate

# Initialize Go module
echo "Setting up Go binary processor..."
cd ../binary-processor
go mod init github.com/yourusername/testbridge/binary-processor
go get -u github.com/stretchr/testify/assert
mkdir -p cmd pkg

# Return to root directory
cd ../../

# Setup tests directory
echo "Setting up tests..."
cd tests
npm init -y
npm install --save jest @types/jest ts-jest supertest
npx tsc --init

# Return to root directory
cd ../

# Create Podman Compose file
echo "Creating Podman Compose file..."
cat > infrastructure/development/podman-compose.yml <<EOL
version: '3'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: testbridge
      POSTGRES_USER: testbridge
      POSTGRES_DB: testbridge
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: testbridge
      MINIO_ROOT_PASSWORD: testbridge
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
EOL

# Make script executable
chmod +x scripts/setup.sh

echo "Setup complete. You can now start the development environment with:"
echo "cd infrastructure/development && podman-compose up -d"