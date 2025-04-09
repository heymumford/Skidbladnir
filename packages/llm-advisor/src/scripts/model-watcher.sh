#!/bin/sh
# Model watcher script for hot reloading LLM models
# This script watches the /app/models directory for changes and notifies the application
# to reload models without requiring a container restart

MODEL_DIR="/app/models"
API_ENDPOINT="http://localhost:3000/api/models/reload"
LOG_FILE="/app/data/model-watcher.log"
POLL_INTERVAL=5

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

notify_api() {
  response=$(curl -s -X POST "$API_ENDPOINT" -H "Content-Type: application/json" -d '{"source":"watcher"}')
  log "API notification response: $response"
}

watch_models() {
  log "Starting model watcher - monitoring $MODEL_DIR for changes"
  
  # Create a checksum of the directory initially
  previous_checksum=$(find "$MODEL_DIR" -type f -exec sha256sum {} \; | sort | sha256sum)
  
  while true; do
    # Sleep to prevent high CPU usage
    sleep "$POLL_INTERVAL"
    
    # Calculate current checksum
    current_checksum=$(find "$MODEL_DIR" -type f -exec sha256sum {} \; | sort | sha256sum)
    
    # Check if the directory has changed
    if [ "$current_checksum" != "$previous_checksum" ]; then
      log "Model directory change detected"
      notify_api
      previous_checksum="$current_checksum"
      log "Updated checksum: $current_checksum"
    fi
  done
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Start watching for changes
watch_models