"""
Model registry for managing multiple LLM models with different configurations.
"""

import os
import json
import time
from typing import Dict, List, Optional, Any
from pathlib import Path

from ..models.model_config import ModelConfig


class ModelRegistry:
    """Registry for managing multiple LLM models with different configurations."""
    
    def __init__(self, models_dir: str = None, config_file: str = None):
        """
        Initialize the model registry.
        
        Args:
            models_dir: Directory containing models
            config_file: Path to model configuration file
        """
        self.models_dir = models_dir or os.environ.get("LLM_MODELS_DIR", "./models")
        self.config_file = config_file or os.environ.get("LLM_CONFIG_FILE", "./model_config.json")
        self.models: Dict[str, ModelConfig] = {}
        self.loaded_models: Dict[str, Any] = {}
        self.active_model: Optional[str] = None
        
        # Ensure models directory exists
        Path(self.models_dir).mkdir(parents=True, exist_ok=True)
        
        # Load model configurations if config file exists
        if os.path.exists(self.config_file):
            self._load_config()
    
    def register_model(self, model_config: ModelConfig) -> bool:
        """
        Register a model configuration.
        
        Args:
            model_config: The model configuration to register
            
        Returns:
            bool: True if registration was successful, False otherwise
        """
        # Check if model path exists
        model_path = Path(model_config.path)
        if not os.path.exists(model_path) and not model_path.is_absolute():
            # Try relative to models directory
            model_path = Path(self.models_dir) / model_config.path
            if not os.path.exists(model_path):
                return False
            model_config.path = str(model_path)
        
        self.models[model_config.name] = model_config
        self._save_config()
        return True
    
    def get_model_config(self, model_name: str) -> Optional[ModelConfig]:
        """
        Get a model configuration by name.
        
        Args:
            model_name: Name of the model
            
        Returns:
            Optional[ModelConfig]: The model configuration if found, None otherwise
        """
        return self.models.get(model_name)
    
    def list_models(self) -> List[str]:
        """
        List all registered model names.
        
        Returns:
            List[str]: List of model names
        """
        return list(self.models.keys())
    
    def get_model_info(self, model_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get information about a model or all models.
        
        Args:
            model_name: Name of the model, or None for all models
            
        Returns:
            Dict[str, Any]: Model information
        """
        if model_name:
            if model_name not in self.models:
                return {}
            model_config = self.models[model_name]
            result = model_config.to_dict()
            result["loaded"] = model_name in self.loaded_models
            result["active"] = model_name == self.active_model
            return result
        
        return {
            name: {
                **config.to_dict(),
                "loaded": name in self.loaded_models,
                "active": name == self.active_model
            }
            for name, config in self.models.items()
        }
    
    def remove_model(self, model_name: str) -> bool:
        """
        Remove a model from the registry.
        
        Args:
            model_name: Name of the model to remove
            
        Returns:
            bool: True if removal was successful, False otherwise
        """
        if model_name not in self.models:
            return False
        
        # Unload model if loaded
        if model_name in self.loaded_models:
            self.unload_model(model_name)
        
        del self.models[model_name]
        self._save_config()
        return True
    
    def load_model(self, model_name: str, backend: Any = None) -> Any:
        """
        Load a model into memory.
        
        Args:
            model_name: Name of the model to load
            backend: Backend implementation for model loading
            
        Returns:
            Any: Loaded model instance or None if loading failed
        """
        if model_name not in self.models:
            return None
        
        # If already loaded, return existing instance
        if model_name in self.loaded_models:
            self.active_model = model_name
            return self.loaded_models[model_name]
        
        model_config = self.models[model_name]
        
        # This is a placeholder - in a real implementation,
        # we would use the backend to load the model
        # For example: model = backend.load_model(model_config)
        
        # Instead, we'll create a mock model for testing
        model = {
            "name": model_name,
            "config": model_config.to_dict(),
            "loaded_at": time.time()
        }
        
        self.loaded_models[model_name] = model
        self.active_model = model_name
        return model
    
    def unload_model(self, model_name: str) -> bool:
        """
        Unload a model from memory.
        
        Args:
            model_name: Name of the model to unload
            
        Returns:
            bool: True if unloading was successful, False otherwise
        """
        if model_name not in self.loaded_models:
            return False
        
        # In a real implementation, we would call the appropriate
        # unloading method or free resources
        
        del self.loaded_models[model_name]
        
        # Update active model if this was the active one
        if self.active_model == model_name:
            self.active_model = None
            
            # If other models are loaded, set one as active
            if self.loaded_models:
                self.active_model = next(iter(self.loaded_models.keys()))
        
        return True
    
    def unload_all_models(self) -> int:
        """
        Unload all loaded models.
        
        Returns:
            int: Number of models unloaded
        """
        count = len(self.loaded_models)
        
        # In a real implementation, we would call the appropriate
        # unloading methods for each model
        
        self.loaded_models = {}
        self.active_model = None
        
        return count
    
    def set_active_model(self, model_name: str) -> bool:
        """
        Set the active model.
        
        Args:
            model_name: Name of the model to set as active
            
        Returns:
            bool: True if the model was set as active, False otherwise
        """
        if model_name not in self.loaded_models:
            # Try to load the model
            if model_name not in self.models:
                return False
            
            if not self.load_model(model_name):
                return False
        
        self.active_model = model_name
        return True
    
    def get_optimal_model(self, complexity: float, memory_available_mb: int = None) -> str:
        """
        Get the optimal model based on task complexity and available resources.
        
        Args:
            complexity: Task complexity from 0.0 to 1.0
            memory_available_mb: Available memory in MB, or None to ignore memory constraints
            
        Returns:
            str: Name of the optimal model
        """
        # Sort models by quantization level (higher bits = higher quality)
        sorted_models = sorted(
            self.models.values(),
            key=lambda m: (-m.quantization_bits, m.memory_required_mb)
        )
        
        for model in sorted_models:
            # Skip if memory constraints not met
            if memory_available_mb is not None and model.memory_required_mb > memory_available_mb:
                continue
                
            # For high complexity tasks, prefer full precision models
            if complexity >= 0.8 and model.quantization_bits >= 8:
                return model.name
                
            # For medium complexity tasks, 4-8 bit models are good enough
            if complexity >= 0.4 and model.quantization_bits >= 4:
                return model.name
                
            # For low complexity tasks, any model will do
            return model.name
            
        # If no model matches criteria, return the first registered model
        # or None if no models are registered
        return next(iter(self.models.keys())) if self.models else None
    
    def _load_config(self) -> None:
        """Load model configurations from the config file."""
        try:
            with open(self.config_file, 'r') as f:
                config_data = json.load(f)
                
            for model_data in config_data.get("models", []):
                model_config = ModelConfig.from_dict(model_data)
                self.models[model_config.name] = model_config
        except (json.JSONDecodeError, FileNotFoundError):
            # Initialize with empty config if file doesn't exist or is invalid
            pass
    
    def _save_config(self) -> None:
        """Save model configurations to the config file."""
        config_data = {
            "models": [model.to_dict() for model in self.models.values()]
        }
        
        try:
            with open(self.config_file, 'w') as f:
                json.dump(config_data, f, indent=2)
        except IOError:
            # Log error but continue if can't write config
            pass