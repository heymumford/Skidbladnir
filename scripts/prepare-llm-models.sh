#!/bin/bash
# prepare-llm-models.sh - Download and prepare LLM models for deployment

set -e

ENV=${1:-"qa"}
PROJECT_ROOT=$(pwd)
MODELS_DIR="${PROJECT_ROOT}/models/${ENV}"
LLAMA_MODELS_REPO="https://huggingface.co/meta-llama/Meta-Llama-3-8B-GGUF"
DOWNLOAD_SCRIPT="${PROJECT_ROOT}/scripts/download-model.py"

# Load environment configuration
source "${PROJECT_ROOT}/.env.${ENV}"

echo "🧠 Preparing LLM models for ${ENV} environment"

# Create models directory if it doesn't exist
mkdir -p "${MODELS_DIR}"

# Determine which model files to download based on environment
if [ "${ENV}" == "prod" ]; then
  MODEL_FILES=(
    "Meta-Llama-3-8B.Q4_K_M.gguf"  # 4-bit quantized for production
    "Meta-Llama-3-8B.Q5_K_M.gguf"  # 5-bit for higher quality when needed
  )
else
  MODEL_FILES=(
    "Meta-Llama-3-8B.Q4_0.gguf"    # Smaller 4-bit for development/QA
  )
fi

# Download and verify models
for MODEL_FILE in "${MODEL_FILES[@]}"; do
  MODEL_PATH="${MODELS_DIR}/${MODEL_FILE}"
  
  # Check if model exists and has right checksum
  if [ -f "${MODEL_PATH}" ]; then
    echo "Model ${MODEL_FILE} already exists, verifying checksum..."
    EXPECTED_CHECKSUM=$(cat "${MODELS_DIR}/checksums.txt" | grep "${MODEL_FILE}" | cut -d' ' -f1)
    ACTUAL_CHECKSUM=$(sha256sum "${MODEL_PATH}" | cut -d' ' -f1)
    
    if [ "${EXPECTED_CHECKSUM}" == "${ACTUAL_CHECKSUM}" ]; then
      echo "✅ Model ${MODEL_FILE} verified"
      continue
    else
      echo "❌ Checksum mismatch for ${MODEL_FILE}, re-downloading..."
      rm "${MODEL_PATH}"
    fi
  fi
  
  echo "Downloading ${MODEL_FILE}..."
  
  # Use Python script for HuggingFace authentication and download
  python "${DOWNLOAD_SCRIPT}" \
    --repo "${LLAMA_MODELS_REPO}" \
    --file "${MODEL_FILE}" \
    --output "${MODEL_PATH}"
    
  # Verify download
  if [ -f "${MODEL_PATH}" ]; then
    echo "✅ Downloaded ${MODEL_FILE}"
    # Update checksums file
    sha256sum "${MODEL_PATH}" >> "${MODELS_DIR}/checksums.txt"
  else
    echo "❌ Failed to download ${MODEL_FILE}"
    exit 1
  fi
done

# Set up model configuration
echo "Configuring model settings for ${ENV}..."
CONFIG_FILE="${MODELS_DIR}/models-config.json"

cat > "${CONFIG_FILE}" << EOF
{
  "models": [
    {
      "name": "llama3-8b-${ENV}",
      "path": "${MODELS_DIR}/${MODEL_FILES[0]}",
      "type": "llama",
      "contextLength": 8192,
      "systemPrompt": "You are an API translation assistant that specializes in mapping between different test management system APIs. Your goal is to accurately translate API requests and responses between systems while maintaining semantic equivalence.",
      "parameters": {
        "temperature": 0.1,
        "top_p": 0.9,
        "repetition_penalty": 1.1
      }
    }
  ],
  "default": "llama3-8b-${ENV}"
}
EOF

echo "✅ LLM models prepared successfully for ${ENV} environment"