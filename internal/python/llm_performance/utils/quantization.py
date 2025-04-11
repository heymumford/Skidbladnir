"""
Utilities for LLM model quantization.
"""

import os
import json
import logging
import subprocess
import shutil
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple, Union
from enum import Enum


class QuantizationLevel(str, Enum):
    """Quantization levels for models."""
    
    NONE = "none"  # No quantization (full precision)
    Q4_0 = "q4_0"  # 4-bit quantization (smaller, faster, less accurate)
    Q4_1 = "q4_1"  # 4-bit quantization with alternative algorithm
    Q5_0 = "q5_0"  # 5-bit quantization
    Q5_1 = "q5_1"  # 5-bit quantization with alternative algorithm
    Q8_0 = "q8_0"  # 8-bit quantization (larger, slower, more accurate)
    
    @staticmethod
    def get_bits(level: 'QuantizationLevel') -> int:
        """
        Get the number of bits for a quantization level.
        
        Args:
            level: Quantization level
            
        Returns:
            int: Number of bits
        """
        if level == QuantizationLevel.NONE:
            return 16  # Full precision (16-bit)
        elif level in (QuantizationLevel.Q4_0, QuantizationLevel.Q4_1):
            return 4
        elif level in (QuantizationLevel.Q5_0, QuantizationLevel.Q5_1):
            return 5
        elif level == QuantizationLevel.Q8_0:
            return 8
        else:
            return 0


class ModelFormat(str, Enum):
    """Model formats supported for conversion."""
    
    GGUF = "gguf"        # GGUF format for llama.cpp
    GGML = "ggml"        # Legacy GGML format
    PYTORCH = "pytorch"  # PyTorch model format
    SAFETENSORS = "safetensors"  # Safetensors format
    ONNX = "onnx"        # ONNX format
    TRANSFORMERS = "transformers"  # Hugging Face Transformers format


class QuantizationTool:
    """Tool for quantizing LLM models."""
    
    def __init__(self, 
                base_dir: str = None,
                cache_dir: str = None,
                llama_cpp_path: str = None,
                logger: Optional[logging.Logger] = None):
        """
        Initialize the quantization tool.
        
        Args:
            base_dir: Base directory for model storage
            cache_dir: Cache directory for downloaded models
            llama_cpp_path: Path to llama.cpp tools
            logger: Logger instance
        """
        self.base_dir = base_dir or os.environ.get("LLM_MODELS_DIR", "./models")
        self.cache_dir = cache_dir or os.environ.get("LLM_CACHE_DIR", "./cache")
        self.llama_cpp_path = llama_cpp_path or os.environ.get("LLAMA_CPP_PATH", "./llama.cpp")
        self.logger = logger or logging.getLogger(__name__)
        
        # Create directories if they don't exist
        os.makedirs(self.base_dir, exist_ok=True)
        os.makedirs(self.cache_dir, exist_ok=True)
    
    def quantize_model(self, 
                     model_path: str, 
                     output_path: str = None,
                     level: QuantizationLevel = QuantizationLevel.Q4_0,
                     input_format: ModelFormat = ModelFormat.TRANSFORMERS,
                     output_format: ModelFormat = ModelFormat.GGUF) -> Optional[str]:
        """
        Quantize a model to a specified level.
        
        Args:
            model_path: Path to the model to quantize
            output_path: Path to save the quantized model
            level: Quantization level
            input_format: Input model format
            output_format: Output model format
            
        Returns:
            Optional[str]: Path to the quantized model, or None if quantization failed
        """
        # Determine output path if not specified
        if not output_path:
            model_filename = os.path.basename(model_path)
            model_name = os.path.splitext(model_filename)[0]
            output_path = os.path.join(
                self.base_dir, 
                f"{model_name}-{level.value}.{output_format.value}"
            )
        
        # Check if output already exists
        if os.path.exists(output_path):
            self.logger.info(f"Quantized model already exists at {output_path}")
            return output_path
        
        # Choose the appropriate quantization method based on formats
        if output_format == ModelFormat.GGUF:
            if input_format == ModelFormat.TRANSFORMERS:
                result = self._quantize_transformers_to_gguf(model_path, output_path, level)
            elif input_format == ModelFormat.PYTORCH:
                result = self._quantize_pytorch_to_gguf(model_path, output_path, level)
            elif input_format == ModelFormat.GGML:
                result = self._convert_ggml_to_gguf(model_path, output_path, level)
            else:
                self.logger.error(f"Unsupported input format for GGUF conversion: {input_format}")
                return None
        else:
            self.logger.error(f"Unsupported output format: {output_format}")
            return None
        
        if result:
            self.logger.info(f"Successfully quantized model to {output_path}")
            return output_path
        else:
            self.logger.error(f"Failed to quantize model")
            return None
    
    def estimate_memory_requirements(self, model_path: str, level: QuantizationLevel) -> Dict[str, Any]:
        """
        Estimate memory requirements for a model at a given quantization level.
        
        Args:
            model_path: Path to the model
            level: Quantization level
            
        Returns:
            Dict[str, Any]: Memory requirement estimates
        """
        # Simple heuristic for memory estimation - in a real implementation
        # we would analyze the model's architecture or metadata
        
        # Try to get model size from file size
        model_size_bytes = 0
        try:
            if os.path.isfile(model_path):
                model_size_bytes = os.path.getsize(model_path)
            elif os.path.isdir(model_path):
                # Sum up sizes of all files in the directory
                for dirpath, _, filenames in os.walk(model_path):
                    for f in filenames:
                        fp = os.path.join(dirpath, f)
                        model_size_bytes += os.path.getsize(fp)
        except OSError:
            pass
        
        # Convert to MB
        model_size_mb = model_size_bytes / (1024 * 1024)
        
        # Base memory multiplier based on quantization level
        memory_multipliers = {
            QuantizationLevel.NONE: 2.0,      # Full precision needs more memory
            QuantizationLevel.Q4_0: 0.5,      # 4-bit needs less memory
            QuantizationLevel.Q4_1: 0.55,     # 4-bit with alternative algorithm
            QuantizationLevel.Q5_0: 0.625,    # 5-bit needs more than 4-bit
            QuantizationLevel.Q5_1: 0.675,    # 5-bit with alternative algorithm
            QuantizationLevel.Q8_0: 1.0,      # 8-bit is a middle ground
        }
        
        multiplier = memory_multipliers.get(level, 1.0)
        
        # Estimate memory needed for the model itself
        model_memory_mb = model_size_mb * multiplier
        
        # Estimate memory needed for inference (model + working memory)
        inference_memory_mb = model_memory_mb * 1.5
        
        # Estimate peak memory usage during loading
        peak_memory_mb = model_memory_mb * 2.0
        
        return {
            "model_size_mb": model_size_mb,
            "quantized_size_mb": model_memory_mb,
            "inference_memory_mb": inference_memory_mb,
            "peak_memory_mb": peak_memory_mb,
            "quantization_level": level.value,
            "bits": QuantizationLevel.get_bits(level)
        }
    
    def list_available_models(self, quantized_only: bool = False) -> List[Dict[str, Any]]:
        """
        List available models in the base directory.
        
        Args:
            quantized_only: Whether to only include quantized models
            
        Returns:
            List[Dict[str, Any]]: List of model information
        """
        models = []
        
        try:
            # List all files in the base directory
            for item in os.listdir(self.base_dir):
                item_path = os.path.join(self.base_dir, item)
                
                # Skip directories unless they might be transformer models
                if os.path.isdir(item_path):
                    # Check if it looks like a transformer model directory
                    if not any(os.path.exists(os.path.join(item_path, marker)) 
                              for marker in ["config.json", "pytorch_model.bin", "model.safetensors"]):
                        continue
                
                # Determine model format and quantization
                model_format = None
                quant_level = None
                
                if item.endswith(".gguf"):
                    model_format = ModelFormat.GGUF
                    # Try to extract quantization level from filename
                    for level in QuantizationLevel:
                        if f"-{level.value}." in item:
                            quant_level = level
                            break
                    
                    # Default to Q4_0 if no specific level found but filename suggests quantization
                    if quant_level is None and any(q in item.lower() for q in ["q4", "q5", "q8", "quant"]):
                        quant_level = QuantizationLevel.Q4_0
                
                elif item.endswith(".ggml"):
                    model_format = ModelFormat.GGML
                    # Similar logic for GGML files
                    for level in QuantizationLevel:
                        if f"-{level.value}." in item:
                            quant_level = level
                            break
                
                elif item.endswith(".bin") or item.endswith(".pt") or item.endswith(".pth"):
                    model_format = ModelFormat.PYTORCH
                    quant_level = QuantizationLevel.NONE
                
                elif item.endswith(".safetensors"):
                    model_format = ModelFormat.SAFETENSORS
                    quant_level = QuantizationLevel.NONE
                
                elif item.endswith(".onnx"):
                    model_format = ModelFormat.ONNX
                    quant_level = QuantizationLevel.NONE
                
                elif os.path.isdir(item_path):
                    model_format = ModelFormat.TRANSFORMERS
                    quant_level = QuantizationLevel.NONE
                
                # Skip if we couldn't determine the format
                if model_format is None:
                    continue
                
                # Skip if we only want quantized models and this isn't quantized
                if quantized_only and quant_level in [None, QuantizationLevel.NONE]:
                    continue
                
                # Get model size
                model_size = 0
                if os.path.isfile(item_path):
                    model_size = os.path.getsize(item_path)
                elif os.path.isdir(item_path):
                    for dirpath, _, filenames in os.walk(item_path):
                        for f in filenames:
                            fp = os.path.join(dirpath, f)
                            try:
                                model_size += os.path.getsize(fp)
                            except OSError:
                                pass
                
                # Add model info to the list
                models.append({
                    "name": item,
                    "path": item_path,
                    "format": model_format.value if model_format else "unknown",
                    "quantization": quant_level.value if quant_level else "none",
                    "bits": QuantizationLevel.get_bits(quant_level) if quant_level else 16,
                    "size_bytes": model_size,
                    "size_mb": model_size / (1024 * 1024)
                })
        
        except OSError as e:
            self.logger.error(f"Error listing models: {e}")
        
        return models
    
    def _quantize_transformers_to_gguf(self, model_path: str, output_path: str, level: QuantizationLevel) -> bool:
        """
        Quantize a Hugging Face Transformers model to GGUF format.
        
        Args:
            model_path: Path to the Transformers model
            output_path: Path to save the quantized model
            level: Quantization level
            
        Returns:
            bool: True if quantization was successful
        """
        # This is a placeholder for the actual conversion - in a real implementation,
        # we would call the appropriate tool from llama.cpp or a similar converter
        
        convert_script = os.path.join(self.llama_cpp_path, "convert.py")
        if not os.path.exists(convert_script):
            self.logger.error(f"Conversion script not found at {convert_script}")
            return False
        
        # Example command (will need adjustment based on the actual tool):
        # python convert.py --outtype f16 --outfile model.gguf /path/to/transformers/model
        try:
            command = [
                "python", convert_script,
                "--outtype", level.value,
                "--outfile", output_path,
                model_path
            ]
            
            # Simulate running the command (in a real implementation, we would actually run it)
            self.logger.info(f"Would run command: {' '.join(command)}")
            
            # In a real implementation:
            # result = subprocess.run(command, check=True, capture_output=True, text=True)
            # return result.returncode == 0
            
            # For this placeholder implementation, we'll simulate success
            # Create a dummy file at the output path
            with open(output_path, 'w') as f:
                f.write(f"Simulated {level.value} quantized model")
            
            return True
            
        except (subprocess.SubprocessError, OSError) as e:
            self.logger.error(f"Quantization failed: {e}")
            return False
    
    def _quantize_pytorch_to_gguf(self, model_path: str, output_path: str, level: QuantizationLevel) -> bool:
        """Quantize a PyTorch model to GGUF format."""
        # Similar implementation as _quantize_transformers_to_gguf
        # but adjusted for PyTorch models
        return self._quantize_transformers_to_gguf(model_path, output_path, level)
    
    def _convert_ggml_to_gguf(self, model_path: str, output_path: str, level: QuantizationLevel) -> bool:
        """Convert a GGML model to GGUF format."""
        # Placeholder for GGML to GGUF conversion
        # In a real implementation, we would use the appropriate converter
        
        convert_script = os.path.join(self.llama_cpp_path, "convert-ggml-to-gguf.py")
        if not os.path.exists(convert_script):
            self.logger.error(f"Conversion script not found at {convert_script}")
            return False
        
        try:
            command = [
                "python", convert_script,
                "--input", model_path,
                "--output", output_path
            ]
            
            # Simulate running the command
            self.logger.info(f"Would run command: {' '.join(command)}")
            
            # For this placeholder implementation, we'll simulate success
            with open(output_path, 'w') as f:
                f.write(f"Simulated GGML to GGUF conversion")
            
            return True
            
        except (subprocess.SubprocessError, OSError) as e:
            self.logger.error(f"Conversion failed: {e}")
            return False