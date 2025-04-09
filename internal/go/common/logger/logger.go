/*
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 *
 * This file is part of Skidbladnir.
 *
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/*
 * Structured logging utility for Go components
 *
 * This package provides a consistent logging interface with support for
 * log levels, context-aware logging, and structured metadata.
 */

package logger

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"runtime/debug"
	"strings"
	"time"
)

// LogLevel defines severity levels for logging
type LogLevel int

const (
	// DEBUG level for detailed troubleshooting information
	DEBUG LogLevel = iota
	// INFO level for general operational information
	INFO
	// WARN level for potentially harmful situations
	WARN
	// ERROR level for error events
	ERROR
	// NONE level disables all logging
	NONE
)

// Logger provides consistent logging across components
type Logger struct {
	context         string
	level           LogLevel
	includeTimestamp bool
	writer          io.Writer
}

// LoggerOptions defines configuration options for the logger
type LoggerOptions struct {
	// Context identifier for the logger
	Context string
	// Minimum log level to display
	Level LogLevel
	// Include timestamp in log output
	IncludeTimestamp bool
	// Output writer (defaults to os.Stdout)
	Writer io.Writer
}

// NewLogger creates a new logger with the provided options
func NewLogger(options LoggerOptions) *Logger {
	// Set defaults
	if options.Writer == nil {
		options.Writer = os.Stdout
	}
	
	if options.Level < DEBUG || options.Level > NONE {
		options.Level = INFO
	}
	
	return &Logger{
		context:         options.Context,
		level:           options.Level,
		includeTimestamp: options.IncludeTimestamp,
		writer:          options.Writer,
	}
}

// CreateLogger creates a new logger with default options
func CreateLogger(context string, level LogLevel) *Logger {
	return NewLogger(LoggerOptions{
		Context:         context,
		Level:           level,
		IncludeTimestamp: true,
		Writer:          os.Stdout,
	})
}

// DefaultLogger is a package-level logger for quick access
var DefaultLogger = CreateLogger("", INFO)

// SetLevel changes the log level at runtime
func (l *Logger) SetLevel(level LogLevel) {
	l.level = level
}

// Child creates a child logger with a sub-context
func (l *Logger) Child(subContext string) *Logger {
	var childContext string
	if l.context != "" {
		childContext = fmt.Sprintf("%s:%s", l.context, subContext)
	} else {
		childContext = subContext
	}
	
	return NewLogger(LoggerOptions{
		Context:         childContext,
		Level:           l.level,
		IncludeTimestamp: l.includeTimestamp,
		Writer:          l.writer,
	})
}

// Debug logs a debug message
func (l *Logger) Debug(message string, args ...interface{}) {
	l.log(DEBUG, message, args...)
}

// Info logs an info message
func (l *Logger) Info(message string, args ...interface{}) {
	l.log(INFO, message, args...)
}

// Warn logs a warning message
func (l *Logger) Warn(message string, args ...interface{}) {
	l.log(WARN, message, args...)
}

// Error logs an error message
func (l *Logger) Error(message string, args ...interface{}) {
	// Format Error objects for better readability
	formattedArgs := make([]interface{}, 0, len(args))
	
	for _, arg := range args {
		if err, ok := arg.(error); ok {
			formattedArgs = append(formattedArgs, formatError(err))
		} else {
			formattedArgs = append(formattedArgs, arg)
		}
	}
	
	l.log(ERROR, message, formattedArgs...)
}

// log is the internal log method
func (l *Logger) log(level LogLevel, message string, args ...interface{}) {
	if level < l.level {
		return
	}
	
	prefix := ""
	
	if l.includeTimestamp {
		timestamp := time.Now().UTC().Format(time.RFC3339Nano)
		prefix += fmt.Sprintf("[%s] ", timestamp)
	}
	
	if l.context != "" {
		prefix += fmt.Sprintf("[%s] ", l.context)
	}
	
	// Build the log message
	logMessage := fmt.Sprintf("%s%s", prefix, message)
	
	// Format the arguments
	formattedArgs := formatArgs(args)
	
	// Build the final log line
	var logLine string
	if len(formattedArgs) > 0 {
		logLine = fmt.Sprintf("%s %s\n", logMessage, strings.Join(formattedArgs, " "))
	} else {
		logLine = fmt.Sprintf("%s\n", logMessage)
	}
	
	// Add level prefix for better visibility in terminal
	var levelPrefix string
	switch level {
	case DEBUG:
		levelPrefix = "[DEBUG] "
	case INFO:
		levelPrefix = "[INFO] "
	case WARN:
		levelPrefix = "[WARN] "
	case ERROR:
		levelPrefix = "[ERROR] "
	}
	
	// Write the log line
	fmt.Fprint(l.writer, levelPrefix+logLine)
}

// formatArgs formats arguments for logging
func formatArgs(args []interface{}) []string {
	formattedArgs := make([]string, 0, len(args))
	
	for _, arg := range args {
		if arg == nil {
			formattedArgs = append(formattedArgs, "null")
		} else {
			switch v := arg.(type) {
			case string:
				formattedArgs = append(formattedArgs, v)
			case error:
				formattedArgs = append(formattedArgs, v.Error())
			default:
				// Try to marshal to JSON
				jsonBytes, err := json.Marshal(v)
				if err != nil {
					formattedArgs = append(formattedArgs, fmt.Sprintf("%v", v))
				} else {
					formattedArgs = append(formattedArgs, string(jsonBytes))
				}
			}
		}
	}
	
	return formattedArgs
}

// formatError formats an error for logging
func formatError(err error) map[string]interface{} {
	errorMap := map[string]interface{}{
		"message": err.Error(),
		"stack":   string(debug.Stack()),
	}
	
	// Try to extract additional fields from custom errors
	// This requires reflection and type assertion which is
	// not as easy as in TypeScript or Python, but we can
	// implement specific error type handling here
	
	return errorMap
}