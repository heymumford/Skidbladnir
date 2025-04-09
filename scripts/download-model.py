"""
Copyright (C) 2025 Eric C. Mumford (@heymumford)

This file is part of Skidbladnir.

Skidbladnir is free software: you can redistribute it and/or modify
it under the terms of the MIT License as published in the LICENSE file.
"""

#!/usr/bin/env python3
"""
download-model.py - Download LLM models from Hugging Face

This script handles authentication and download of LLM models from Hugging Face,
with resume capability and progress tracking.
"""

import argparse
import os
import sys
from pathlib import Path
from tqdm import tqdm
import requests
from huggingface_hub import hf_hub_download, login

def parse_args():
    parser = argparse.ArgumentParser(description="Download models from Hugging Face")
    parser.add_argument("--repo", type=str, required=True, help="Hugging Face repo ID")
    parser.add_argument("--file", type=str, required=True, help="Filename to download")
    parser.add_argument("--output", type=str, required=True, help="Output path")
    parser.add_argument("--token", type=str, help="Hugging Face token (or use HF_TOKEN env var)")
    parser.add_argument("--force", action="store_true", help="Force redownload if file exists")
    return parser.parse_args()

def download_with_progress(repo_id, filename, output_path, token=None, force=False):
    """Download a file from Hugging Face with progress bar."""
    output_path = Path(output_path)
    
    # Check if file already exists
    if output_path.exists() and not force:
        print(f"File already exists at {output_path}. Use --force to redownload.")
        return True
    
    # Create parent directory if it doesn't exist
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        # Try to authenticate if token is provided
        if token:
            login(token)
        
        # Download file with progress tracking
        print(f"Downloading {filename} from {repo_id}...")
        hf_hub_download(
            repo_id=repo_id,
            filename=filename,
            local_dir=output_path.parent,
            local_dir_use_symlinks=False,
            resume_download=True,
            force_download=force
        )
        
        # Rename file if needed
        downloaded_file = output_path.parent / filename
        if downloaded_file != output_path:
            downloaded_file.rename(output_path)
        
        print(f"Download complete: {output_path}")
        return True
        
    except Exception as e:
        print(f"Error downloading file: {e}")
        return False

def main():
    args = parse_args()
    
    # Get token from args or environment
    token = args.token or os.environ.get("HF_TOKEN")
    
    # Download the file
    success = download_with_progress(
        repo_id=args.repo,
        filename=args.file,
        output_path=args.output,
        token=token,
        force=args.force
    )
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()