/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { LogEntry, LogLevel } from '../types';

interface LogContextType {
  logs: LogEntry[];
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  filterLogs: (level?: LogLevel) => void;
  filteredLogs: LogEntry[];
}

const LogContext = createContext<LogContextType | undefined>(undefined);

interface LogProviderProps {
  children: ReactNode;
}

export const LogProvider: React.FC<LogProviderProps> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [currentFilter, setCurrentFilter] = useState<LogLevel | undefined>(undefined);

  // Generate a unique ID for each log entry
  const generateId = () => {
    return `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  // Add a new log entry
  const addLog = useCallback((log: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...log,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    
    setLogs(prevLogs => [newLog, ...prevLogs].slice(0, 1000)); // Keep only the last 1000 logs
  }, []);

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Filter logs by level
  const filterLogs = useCallback((level?: LogLevel) => {
    setCurrentFilter(level);
  }, []);

  // Apply the filter whenever logs or currentFilter changes
  useEffect(() => {
    if (!currentFilter) {
      setFilteredLogs(logs);
    } else {
      setFilteredLogs(logs.filter(log => log.level === currentFilter));
    }
  }, [logs, currentFilter]);

  // WebSocket connection for real-time logs (mock implementation)
  useEffect(() => {
    // In a real implementation, this would connect to a WebSocket
    // and add each incoming log message with addLog
    
    // Mock some initial logs for demonstration
    const mockLogs = [
      { level: 'info' as LogLevel, component: 'System', message: 'Application started' },
      { level: 'info' as LogLevel, component: 'Provider', message: 'Loading available providers' },
      { level: 'debug' as LogLevel, component: 'API', message: 'Initializing API client' },
    ];
    
    mockLogs.forEach(log => addLog(log));
    
    // Mock some periodic logs for demonstration
    const interval = setInterval(() => {
      const randomLogs = [
        { level: 'info' as LogLevel, component: 'Provider', message: 'Refreshing provider status' },
        { level: 'debug' as LogLevel, component: 'API', message: 'API request completed' },
        { level: 'warn' as LogLevel, component: 'Migration', message: 'Slow operation detected' },
        { level: 'error' as LogLevel, component: 'API', message: 'API request failed', details: { statusCode: 429 } },
      ];
      
      const randomLog = randomLogs[Math.floor(Math.random() * randomLogs.length)];
      addLog(randomLog);
    }, 10000); // Add a random log every 10 seconds
    
    return () => {
      clearInterval(interval);
    };
  }, [addLog]);

  return (
    <LogContext.Provider value={{ 
      logs, 
      addLog, 
      clearLogs, 
      filterLogs,
      filteredLogs
    }}>
      {children}
    </LogContext.Provider>
  );
};

export const useLogContext = (): LogContextType => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLogContext must be used within a LogProvider');
  }
  return context;
};