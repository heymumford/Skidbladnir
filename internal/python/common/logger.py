"""
Copyright (C) 2025 Eric C. Mumford (@heymumford)

This file is part of Skidbladnir.

Skidbladnir is free software: you can redistribute it and/or modify
it under the terms of the MIT License as published in the LICENSE file.
"""

"""
Structured logging utility for Python components

This module provides a consistent logging interface with support for
log levels, context-aware logging, and structured metadata.
"""

import logging
import json
import datetime
import traceback
import inspect
import os
import sys
from enum import IntEnum
from typing import Any, Dict, List, Optional, Union, Callable


class LogLevel(IntEnum):
    """Log levels matching the TypeScript implementation"""
    DEBUG = 0
    INFO = 1
    WARN = 2
    ERROR = 3
    NONE = 4


class Logger:
    """
    Logger class that provides consistent logging across components
    """
    
    def __init__(self, context: Optional[str] = None, level: LogLevel = LogLevel.INFO, 
                 include_timestamp: bool = True):
        """
        Initialize the logger
        
        Args:
            context: The context identifier for this logger
            level: The minimum log level to display
            include_timestamp: Whether to include timestamp in log output
        """
        self.context = context
        self.level = level
        self.include_timestamp = include_timestamp
        
        # Configure the Python logger
        self._logger = logging.getLogger(context or __name__)
        self._logger.setLevel(self._to_python_level(level))
        
        # Add console handler if no handlers exist
        if not self._logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(logging.Formatter('%(message)s'))
            self._logger.addHandler(handler)
    
    def set_level(self, level: LogLevel) -> None:
        """
        Change the log level at runtime
        
        Args:
            level: The new log level
        """
        self.level = level
        self._logger.setLevel(self._to_python_level(level))
    
    def child(self, sub_context: str) -> 'Logger':
        """
        Create a child logger with a sub-context
        
        Args:
            sub_context: The sub-context name
        
        Returns:
            A new logger with the combined context
        """
        parent_context = self.context
        child_context = f"{parent_context}:{sub_context}" if parent_context else sub_context
        
        return Logger(
            context=child_context,
            level=self.level,
            include_timestamp=self.include_timestamp
        )
    
    def debug(self, message: str, *args: Any) -> None:
        """
        Log a debug message
        
        Args:
            message: The message to log
            *args: Additional metadata to include in the log
        """
        self._log(LogLevel.DEBUG, message, *args)
    
    def info(self, message: str, *args: Any) -> None:
        """
        Log an info message
        
        Args:
            message: The message to log
            *args: Additional metadata to include in the log
        """
        self._log(LogLevel.INFO, message, *args)
    
    def warn(self, message: str, *args: Any) -> None:
        """
        Log a warning message
        
        Args:
            message: The message to log
            *args: Additional metadata to include in the log
        """
        self._log(LogLevel.WARN, message, *args)
    
    def error(self, message: str, *args: Any) -> None:
        """
        Log an error message
        
        Args:
            message: The message to log
            *args: Additional metadata to include in the log
        """
        # Format Error objects for better readability
        formatted_args = []
        for arg in args:
            if isinstance(arg, Exception):
                formatted_arg = self._format_error(arg)
                formatted_args.append(formatted_arg)
            else:
                formatted_args.append(arg)
        
        self._log(LogLevel.ERROR, message, *formatted_args)
    
    def _log(self, level: LogLevel, message: str, *args: Any) -> None:
        """
        Internal log method
        
        Args:
            level: The log level
            message: The message to log
            *args: Additional metadata to include in the log
        """
        if level < self.level:
            return
        
        prefix = ""
        
        if self.include_timestamp:
            timestamp = datetime.datetime.utcnow().isoformat(timespec='milliseconds') + 'Z'
            prefix += f"[{timestamp}] "
        
        if self.context:
            prefix += f"[{self.context}] "
        
        log_message = f"{prefix}{message}"
        
        # Format args for logging
        formatted_args = self._format_args(args)
        
        # Call the appropriate logging method
        if level == LogLevel.DEBUG:
            self._logger.debug(log_message, *formatted_args)
        elif level == LogLevel.INFO:
            self._logger.info(log_message, *formatted_args)
        elif level == LogLevel.WARN:
            self._logger.warning(log_message, *formatted_args)
        elif level == LogLevel.ERROR:
            self._logger.error(log_message, *formatted_args)
    
    def _format_args(self, args: List[Any]) -> List[str]:
        """
        Format args for logging
        
        Args:
            args: The args to format
        
        Returns:
            Formatted args
        """
        formatted_args = []
        
        for arg in args:
            if arg is None:
                formatted_args.append("null")
            elif isinstance(arg, (dict, list)):
                try:
                    formatted_args.append(json.dumps(arg))
                except:
                    formatted_args.append(str(arg))
            else:
                formatted_args.append(str(arg))
        
        return formatted_args
    
    def _format_error(self, error: Exception) -> Dict[str, Any]:
        """
        Format an error for logging
        
        Args:
            error: The error to format
        
        Returns:
            A dictionary with error details
        """
        error_dict = {
            "message": str(error),
            "stack": ''.join(traceback.format_exception(type(error), error, error.__traceback__))
        }
        
        # Include any custom attributes from the error
        for attr_name in dir(error):
            if not attr_name.startswith('_') and attr_name not in ['args', 'message', 'stack']:
                try:
                    attr_value = getattr(error, attr_name)
                    if not callable(attr_value):
                        error_dict[attr_name] = attr_value
                except:
                    pass
        
        return error_dict
    
    def _to_python_level(self, level: LogLevel) -> int:
        """
        Convert our log level to Python's logging level
        
        Args:
            level: Our log level
            
        Returns:
            The equivalent Python logging level
        """
        if level == LogLevel.DEBUG:
            return logging.DEBUG
        elif level == LogLevel.INFO:
            return logging.INFO
        elif level == LogLevel.WARN:
            return logging.WARNING
        elif level == LogLevel.ERROR:
            return logging.ERROR
        else:
            return logging.CRITICAL  # For LogLevel.NONE


def create_logger(context: Optional[str] = None, level: LogLevel = LogLevel.INFO, 
                 include_timestamp: bool = True) -> Logger:
    """
    Create a new logger instance
    
    Args:
        context: The context identifier for this logger
        level: The minimum log level to display
        include_timestamp: Whether to include timestamp in log output
        
    Returns:
        A new logger instance
    """
    return Logger(context, level, include_timestamp)


# Create a default logger for application-wide use
default_logger = create_logger()