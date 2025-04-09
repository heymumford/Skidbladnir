#\!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Skidbladnir Orchestrator Service

This service handles the orchestration of test migration workflows
"""

import os
import sys
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

from fastapi import FastAPI, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Skidbladnir Orchestrator",
    description="API for orchestrating test migration workflows",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "service": "orchestrator"
    }


@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Skidbladnir Orchestrator",
        "version": "0.1.0",
        "status": "operational"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
