/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { MigrationStatus, MigrationConfig, MigrationState, MigrationStatistics } from '../types';

interface MigrationContextType {
  currentMigration: MigrationStatus | null;
  migrationHistory: MigrationStatus[];
  migrationStats: MigrationStatistics | null;
  startMigration: (config: MigrationConfig) => Promise<string>;
  pauseMigration: (migrationId: string) => Promise<void>;
  resumeMigration: (migrationId: string) => Promise<void>;
  stopMigration: (migrationId: string) => Promise<void>;
  getMigrationDetails: (migrationId: string) => Promise<MigrationStatus>;
}

const MigrationContext = createContext<MigrationContextType | undefined>(undefined);

interface MigrationProviderProps {
  children: ReactNode;
}

export const MigrationProvider: React.FC<MigrationProviderProps> = ({ children }) => {
  const [currentMigration, setCurrentMigration] = useState<MigrationStatus | null>(null);
  const [migrationHistory, setMigrationHistory] = useState<MigrationStatus[]>([]);
  const [migrationStats, setMigrationStats] = useState<MigrationStatistics | null>(null);

  // Start a new migration with the given configuration
  const startMigration = useCallback(async (config: MigrationConfig): Promise<string> => {
    // In a real implementation, this would call the API to start the migration
    
    // Mock implementation
    const migrationId = `migration-${Date.now()}`;
    const newMigration: MigrationStatus = {
      id: migrationId,
      status: 'running',
      progress: 0,
      startTime: new Date().toISOString(),
      totalItems: Math.floor(Math.random() * 1000) + 100, // Random number of items
      processedItems: 0,
      failedItems: 0,
    };
    
    setCurrentMigration(newMigration);
    setMigrationHistory(prev => [newMigration, ...prev]);
    
    // Mock migration statistics
    setMigrationStats({
      testCases: { total: 500, migrated: 0, failed: 0, pending: 500 },
      testCycles: { total: 50, migrated: 0, failed: 0, pending: 50 },
      testExecutions: { total: 1000, migrated: 0, failed: 0, pending: 1000 },
      attachments: { total: 250, migrated: 0, failed: 0, pending: 250 }
    });
    
    return migrationId;
  }, []);

  // Pause an active migration
  const pauseMigration = useCallback(async (migrationId: string): Promise<void> => {
    // In a real implementation, this would call the API to pause the migration
    
    // Mock implementation
    if (currentMigration && currentMigration.id === migrationId) {
      const updatedMigration = {
        ...currentMigration,
        status: 'paused' as MigrationState
      };
      
      setCurrentMigration(updatedMigration);
      setMigrationHistory(prev => 
        prev.map(m => m.id === migrationId ? updatedMigration : m)
      );
    }
  }, [currentMigration]);

  // Resume a paused migration
  const resumeMigration = useCallback(async (migrationId: string): Promise<void> => {
    // In a real implementation, this would call the API to resume the migration
    
    // Mock implementation
    if (currentMigration && currentMigration.id === migrationId) {
      const updatedMigration = {
        ...currentMigration,
        status: 'running' as MigrationState
      };
      
      setCurrentMigration(updatedMigration);
      setMigrationHistory(prev => 
        prev.map(m => m.id === migrationId ? updatedMigration : m)
      );
    }
  }, [currentMigration]);

  // Stop an active migration
  const stopMigration = useCallback(async (migrationId: string): Promise<void> => {
    // In a real implementation, this would call the API to stop the migration
    
    // Mock implementation
    if (currentMigration && currentMigration.id === migrationId) {
      const updatedMigration = {
        ...currentMigration,
        status: 'cancelled' as MigrationState,
        endTime: new Date().toISOString()
      };
      
      setCurrentMigration(null);
      setMigrationHistory(prev => 
        prev.map(m => m.id === migrationId ? updatedMigration : m)
      );
      setMigrationStats(null);
    }
  }, [currentMigration]);

  // Get details for a specific migration
  const getMigrationDetails = useCallback(async (migrationId: string): Promise<MigrationStatus> => {
    // In a real implementation, this would call the API to get migration details
    
    // Mock implementation
    const migration = migrationHistory.find(m => m.id === migrationId);
    
    if (!migration) {
      throw new Error(`Migration with id ${migrationId} not found`);
    }
    
    return migration;
  }, [migrationHistory]);

  // Simulate migration progress updates
  useEffect(() => {
    if (!currentMigration || currentMigration.status !== 'running') {
      return;
    }
    
    const interval = setInterval(() => {
      setCurrentMigration(prev => {
        if (!prev) return null;
        
        // Calculate new progress
        const newProcessedItems = Math.min(
          prev.totalItems, 
          prev.processedItems + Math.floor(Math.random() * 10) + 1
        );
        
        const newProgress = Math.floor((newProcessedItems / prev.totalItems) * 100);
        
        // Randomly add some failed items
        const newFailedItems = prev.failedItems + (Math.random() < 0.2 ? 1 : 0);
        
        // Calculate estimated remaining time (in seconds)
        const elapsedSeconds = (Date.now() - new Date(prev.startTime).getTime()) / 1000;
        const itemsPerSecond = newProcessedItems / elapsedSeconds;
        const remainingItems = prev.totalItems - newProcessedItems;
        const estimatedRemainingTime = itemsPerSecond > 0 
          ? Math.ceil(remainingItems / itemsPerSecond)
          : undefined;
        
        // Check if migration is complete
        const isComplete = newProcessedItems >= prev.totalItems;
        
        const updated: MigrationStatus = {
          ...prev,
          progress: newProgress,
          processedItems: newProcessedItems,
          failedItems: newFailedItems,
          estimatedRemainingTime,
          status: isComplete ? 'completed' : 'running',
          endTime: isComplete ? new Date().toISOString() : undefined
        };
        
        // Update migration history
        setMigrationHistory(history => 
          history.map(m => m.id === prev.id ? updated : m)
        );
        
        // Update migration statistics
        if (migrationStats) {
          const progressPercent = newProcessedItems / prev.totalItems;
          
          setMigrationStats({
            testCases: {
              ...migrationStats.testCases,
              migrated: Math.floor(migrationStats.testCases.total * progressPercent),
              failed: Math.floor(migrationStats.testCases.total * progressPercent * 0.05),
              pending: migrationStats.testCases.total - Math.floor(migrationStats.testCases.total * progressPercent)
            },
            testCycles: {
              ...migrationStats.testCycles,
              migrated: Math.floor(migrationStats.testCycles.total * progressPercent),
              failed: Math.floor(migrationStats.testCycles.total * progressPercent * 0.03),
              pending: migrationStats.testCycles.total - Math.floor(migrationStats.testCycles.total * progressPercent)
            },
            testExecutions: {
              ...migrationStats.testExecutions,
              migrated: Math.floor(migrationStats.testExecutions.total * progressPercent),
              failed: Math.floor(migrationStats.testExecutions.total * progressPercent * 0.08),
              pending: migrationStats.testExecutions.total - Math.floor(migrationStats.testExecutions.total * progressPercent)
            },
            attachments: {
              ...migrationStats.attachments,
              migrated: Math.floor(migrationStats.attachments.total * progressPercent),
              failed: Math.floor(migrationStats.attachments.total * progressPercent * 0.10),
              pending: migrationStats.attachments.total - Math.floor(migrationStats.attachments.total * progressPercent)
            }
          });
        }
        
        // Clear current migration if complete
        if (isComplete) {
          setTimeout(() => {
            setCurrentMigration(null);
            setMigrationStats(null);
          }, 5000); // Keep showing completed migration for 5 seconds
        }
        
        return updated;
      });
    }, 1000); // Update every second
    
    return () => {
      clearInterval(interval);
    };
  }, [currentMigration, migrationStats]);

  return (
    <MigrationContext.Provider value={{
      currentMigration,
      migrationHistory,
      migrationStats,
      startMigration,
      pauseMigration,
      resumeMigration,
      stopMigration,
      getMigrationDetails
    }}>
      {children}
    </MigrationContext.Provider>
  );
};

export const useMigrationContext = (): MigrationContextType => {
  const context = useContext(MigrationContext);
  if (!context) {
    throw new Error('useMigrationContext must be used within a MigrationProvider');
  }
  return context;
};