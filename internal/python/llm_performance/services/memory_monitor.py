"""
Memory monitor for adaptive resource management in LLM operations.
"""

import os
import time
import threading
import psutil
from typing import Dict, List, Callable, Tuple, Any, Optional
from dataclasses import dataclass, field
import logging


@dataclass
class MemoryThreshold:
    """Threshold at which an action should be triggered."""
    
    threshold_mb: int
    action: Callable[[], None]
    description: str
    is_percentage: bool = False  # If True, threshold is a percentage of total memory
    is_triggered: bool = False
    last_triggered: float = 0.0


@dataclass
class MemoryStats:
    """Current memory statistics."""
    
    total_mb: int = 0
    available_mb: int = 0
    used_mb: int = 0
    percent_used: float = 0.0
    timestamp: float = field(default_factory=time.time)
    application_mb: int = 0  # Memory used by this application
    peak_application_mb: int = 0  # Peak memory used by this application
    available_gpu_mb: int = 0  # Available GPU memory if applicable
    used_gpu_mb: int = 0  # Used GPU memory if applicable


class MemoryMonitor:
    """Monitors system memory and provides adaptive resource management."""
    
    def __init__(self, 
                poll_interval_seconds: float = 5.0, 
                enable_gpu_monitoring: bool = False,
                logger: Optional[logging.Logger] = None):
        """
        Initialize the memory monitor.
        
        Args:
            poll_interval_seconds: How often to check memory usage
            enable_gpu_monitoring: Whether to monitor GPU memory
            logger: Logger instance
        """
        self.poll_interval_seconds = max(1.0, poll_interval_seconds)
        self.enable_gpu_monitoring = enable_gpu_monitoring
        self.thresholds: List[MemoryThreshold] = []
        self.current_stats = MemoryStats()
        self.history: List[MemoryStats] = []
        self.history_limit = 100  # Keep last 100 stats records
        self.running = False
        self.monitor_thread = None
        self.lock = threading.RLock()
        self.logger = logger or logging.getLogger(__name__)
        
        # Initialize current process for application memory tracking
        self.process = psutil.Process(os.getpid())
        
        # Try to initialize GPU monitoring if requested
        self.gpu_available = False
        if enable_gpu_monitoring:
            self.gpu_available = self._init_gpu_monitoring()
    
    def start(self) -> bool:
        """
        Start the memory monitoring thread.
        
        Returns:
            bool: True if started, False if already running
        """
        with self.lock:
            if self.running:
                return False
            
            self.running = True
            self.monitor_thread = threading.Thread(
                target=self._monitoring_loop,
                daemon=True
            )
            self.monitor_thread.start()
            return True
    
    def stop(self) -> bool:
        """
        Stop the memory monitoring thread.
        
        Returns:
            bool: True if stopped, False if not running
        """
        with self.lock:
            if not self.running:
                return False
            
            self.running = False
            if self.monitor_thread:
                self.monitor_thread.join(timeout=2.0)
                self.monitor_thread = None
            return True
    
    def register_threshold_alert(self, 
                               threshold_mb: int, 
                               action: Callable[[], None],
                               description: str = "",
                               is_percentage: bool = False) -> int:
        """
        Register a threshold at which an action should be triggered.
        
        Args:
            threshold_mb: Memory threshold in MB (or percentage if is_percentage=True)
            action: Callback function to execute when threshold is crossed
            description: Description of the threshold
            is_percentage: If True, threshold is a percentage of total memory
            
        Returns:
            int: Threshold ID
        """
        with self.lock:
            threshold = MemoryThreshold(
                threshold_mb=threshold_mb,
                action=action,
                description=description,
                is_percentage=is_percentage
            )
            self.thresholds.append(threshold)
            return len(self.thresholds) - 1
    
    def unregister_threshold_alert(self, threshold_id: int) -> bool:
        """
        Unregister a threshold.
        
        Args:
            threshold_id: Threshold ID to unregister
            
        Returns:
            bool: True if unregistered, False if not found
        """
        with self.lock:
            if 0 <= threshold_id < len(self.thresholds):
                self.thresholds.pop(threshold_id)
                return True
            return False
    
    def get_memory_stats(self) -> MemoryStats:
        """
        Get current memory statistics.
        
        Returns:
            MemoryStats: Current memory statistics
        """
        with self.lock:
            # Update stats before returning
            self._update_stats()
            return self.current_stats
    
    def get_memory_history(self) -> List[MemoryStats]:
        """
        Get memory statistics history.
        
        Returns:
            List[MemoryStats]: Memory statistics history
        """
        with self.lock:
            return list(self.history)
    
    def get_available_memory_mb(self) -> int:
        """
        Get available memory in MB.
        
        Returns:
            int: Available memory in MB
        """
        with self.lock:
            # Update stats before returning
            self._update_stats()
            return self.current_stats.available_mb
    
    def get_memory_pressure(self) -> float:
        """
        Get memory pressure as a value from 0.0 to 1.0.
        
        Returns:
            float: Memory pressure (0.0 = no pressure, 1.0 = high pressure)
        """
        with self.lock:
            # Update stats before returning
            self._update_stats()
            return min(1.0, max(0.0, self.current_stats.percent_used / 100.0))
    
    def should_reduce_memory_usage(self) -> bool:
        """
        Check if memory usage should be reduced.
        
        Returns:
            bool: True if memory usage should be reduced
        """
        with self.lock:
            # Update stats before returning
            self._update_stats()
            
            # Consider reducing memory if usage is above 80%
            return self.current_stats.percent_used > 80.0
    
    def _monitoring_loop(self) -> None:
        """Main monitoring loop run in a separate thread."""
        while self.running:
            try:
                # Update memory statistics
                self._update_stats()
                
                # Check thresholds
                self._check_thresholds()
                
                # Sleep for the poll interval
                time.sleep(self.poll_interval_seconds)
            except Exception as e:
                # Log error but continue monitoring
                self.logger.error(f"Error in memory monitoring loop: {e}")
                time.sleep(max(1.0, self.poll_interval_seconds))
    
    def _update_stats(self) -> None:
        """Update memory statistics."""
        try:
            # Get system memory info
            mem = psutil.virtual_memory()
            
            # Get process memory info
            process_mem = self.process.memory_info()
            
            # Update current stats
            self.current_stats = MemoryStats(
                total_mb=mem.total // (1024 * 1024),
                available_mb=mem.available // (1024 * 1024),
                used_mb=(mem.total - mem.available) // (1024 * 1024),
                percent_used=mem.percent,
                timestamp=time.time(),
                application_mb=process_mem.rss // (1024 * 1024)
            )
            
            # Update peak application memory
            if self.current_stats.application_mb > self.current_stats.peak_application_mb:
                self.current_stats.peak_application_mb = self.current_stats.application_mb
            
            # Update GPU stats if available
            if self.gpu_available:
                gpu_stats = self._get_gpu_stats()
                self.current_stats.available_gpu_mb = gpu_stats.get('available_mb', 0)
                self.current_stats.used_gpu_mb = gpu_stats.get('used_mb', 0)
            
            # Add to history and trim if needed
            self.history.append(self.current_stats)
            if len(self.history) > self.history_limit:
                self.history = self.history[-self.history_limit:]
                
        except Exception as e:
            # Log error but continue
            self.logger.error(f"Error updating memory stats: {e}")
    
    def _check_thresholds(self) -> None:
        """Check all thresholds and trigger actions if needed."""
        current_time = time.time()
        
        for threshold in self.thresholds:
            # Convert percentage threshold to MB if needed
            actual_threshold_mb = threshold.threshold_mb
            if threshold.is_percentage:
                actual_threshold_mb = int(self.current_stats.total_mb * threshold.threshold_mb / 100.0)
            
            # Calculate available memory and check threshold
            memory_usage_mb = self.current_stats.total_mb - self.current_stats.available_mb
            threshold_crossed = memory_usage_mb >= actual_threshold_mb
            
            # Trigger action if threshold crossed and not already triggered recently
            if threshold_crossed and not threshold.is_triggered:
                # Mark as triggered
                threshold.is_triggered = True
                threshold.last_triggered = current_time
                
                try:
                    # Execute the action
                    threshold.action()
                except Exception as e:
                    # Log error but continue
                    self.logger.error(f"Error executing threshold action: {e}")
            
            # Reset triggered state if threshold no longer crossed
            elif not threshold_crossed and threshold.is_triggered:
                threshold.is_triggered = False
    
    def _init_gpu_monitoring(self) -> bool:
        """
        Initialize GPU monitoring if available.
        
        Returns:
            bool: True if GPU monitoring is available
        """
        try:
            # Try to import GPU monitoring libraries
            # This is a placeholder - in a real implementation,
            # we would use appropriate libraries for GPU monitoring
            # such as pynvml for NVIDIA GPUs
            return False
        except (ImportError, Exception):
            return False
    
    def _get_gpu_stats(self) -> Dict[str, int]:
        """
        Get GPU memory statistics.
        
        Returns:
            Dict[str, int]: GPU memory statistics
        """
        # This is a placeholder - in a real implementation,
        # we would use appropriate libraries for GPU monitoring
        return {
            'available_mb': 0,
            'used_mb': 0
        }