"""
Model configuration for LLM performance optimization.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List


@dataclass
class ModelConfig:
    """Configuration for a specific LLM model."""
    
    name: str
    path: str
    quantization_bits: int = 4  # Default to 4-bit quantization
    context_length: int = 8192
    max_tokens: int = 2048
    system_prompt: Optional[str] = None
    parameters: Dict[str, Any] = field(default_factory=dict)
    
    # Memory and performance characteristics
    memory_required_mb: int = 0
    startup_time_seconds: float = 0.0
    target_inference_tokens_per_second: float = 0.0
    
    # Hardware acceleration options
    use_gpu: bool = False
    gpu_memory_required_mb: int = 0
    use_cpu_offloading: bool = False
    cpu_threads: int = 4
    
    def __post_init__(self):
        """Initialize default parameters if not provided."""
        if not self.parameters:
            self.parameters = {
                "temperature": 0.2,
                "top_p": 0.9,
                "repetition_penalty": 1.1,
                "top_k": 40
            }
            
        # Set memory requirements based on quantization
        if not self.memory_required_mb:
            # Rough estimates for memory requirements based on quantization level
            memory_map = {
                4: 4000,  # ~4GB for 4-bit quantization of a 8B parameter model
                5: 5000,  # ~5GB for 5-bit quantization
                8: 8000,  # ~8GB for 8-bit quantization
                16: 16000 # ~16GB for 16-bit quantization
            }
            self.memory_required_mb = memory_map.get(self.quantization_bits, 4000)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model config to dictionary."""
        return {
            "name": self.name,
            "path": self.path,
            "quantization_bits": self.quantization_bits,
            "context_length": self.context_length,
            "max_tokens": self.max_tokens,
            "system_prompt": self.system_prompt,
            "parameters": self.parameters,
            "memory_required_mb": self.memory_required_mb,
            "startup_time_seconds": self.startup_time_seconds,
            "target_inference_tokens_per_second": self.target_inference_tokens_per_second,
            "use_gpu": self.use_gpu,
            "gpu_memory_required_mb": self.gpu_memory_required_mb,
            "use_cpu_offloading": self.use_cpu_offloading,
            "cpu_threads": self.cpu_threads
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ModelConfig':
        """Create model config from dictionary."""
        return cls(
            name=data["name"],
            path=data["path"],
            quantization_bits=data.get("quantization_bits", 4),
            context_length=data.get("context_length", 8192),
            max_tokens=data.get("max_tokens", 2048),
            system_prompt=data.get("system_prompt"),
            parameters=data.get("parameters", {}),
            memory_required_mb=data.get("memory_required_mb", 0),
            startup_time_seconds=data.get("startup_time_seconds", 0.0),
            target_inference_tokens_per_second=data.get("target_inference_tokens_per_second", 0.0),
            use_gpu=data.get("use_gpu", False),
            gpu_memory_required_mb=data.get("gpu_memory_required_mb", 0),
            use_cpu_offloading=data.get("use_cpu_offloading", False),
            cpu_threads=data.get("cpu_threads", 4)
        )