/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, LinearProgress, useTheme, Divider, Grid, Paper } from '@mui/material';
import { OperationDetail } from './RealTimeMigrationDashboard';

interface ResourceUsageMonitorProps {
  operations: OperationDetail[];
  refreshInterval?: number; // in seconds
}

interface ResourceMeasurement {
  timestamp: number;
  cpu: number;
  memory: number;
  network: number;
}

export const ResourceUsageMonitor: React.FC<ResourceUsageMonitorProps> = ({
  operations,
  refreshInterval = 5
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [measurements, setMeasurements] = useState<ResourceMeasurement[]>([]);
  const [currentUsage, setCurrentUsage] = useState<{ cpu: number; memory: number; network: number }>({ 
    cpu: 0, 
    memory: 0, 
    network: 0 
  });
  
  // Keep track of active operations (running operations)
  const activeOperations = operations.filter(op => op.status === 'running');
  
  // Calculate aggregate resource usage from active operations
  useEffect(() => {
    if (!activeOperations.length) {
      // If no active operations, set minimal values
      setCurrentUsage({ cpu: 2, memory: 50, network: 0.1 });
      return;
    }
    
    // Calculate current resource usage
    const totalCpu = activeOperations.reduce((sum, op) => sum + (op.resourceUsage?.cpu || 0), 0);
    const totalMemory = activeOperations.reduce((sum, op) => sum + (op.resourceUsage?.memory || 0), 0);
    const totalNetwork = activeOperations.reduce((sum, op) => sum + (op.resourceUsage?.network || 0), 0);
    
    // Calculate average
    const avgCpu = Math.min(totalCpu, 100);
    const avgMemory = totalMemory;
    const avgNetwork = totalNetwork;
    
    setCurrentUsage({
      cpu: avgCpu,
      memory: avgMemory,
      network: avgNetwork
    });
    
    // Add new measurement
    const newMeasurement: ResourceMeasurement = {
      timestamp: Date.now(),
      cpu: avgCpu,
      memory: avgMemory,
      network: avgNetwork
    };
    
    setMeasurements(prev => {
      // Keep only last 60 measurements (5 minutes with 5-second interval)
      const newMeasurements = [...prev, newMeasurement];
      if (newMeasurements.length > 60) {
        return newMeasurements.slice(newMeasurements.length - 60);
      }
      return newMeasurements;
    });
  }, [activeOperations]);
  
  // Draw usage graph
  useEffect(() => {
    if (!canvasRef.current || !measurements.length) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background grid
    ctx.strokeStyle = theme.palette.divider;
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    for (let i = 0; i <= 100; i += 20) {
      const y = canvas.height - (canvas.height * i / 100);
      
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
      
      // Draw labels
      ctx.fillStyle = theme.palette.text.secondary;
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i}%`, 5, y);
    }
    
    // Calculate time range
    const timeRange = measurements[measurements.length - 1].timestamp - measurements[0].timestamp;
    const timeInterval = timeRange / 6; // 6 time labels
    
    // Vertical grid lines (time)
    for (let i = 0; i <= 6; i++) {
      const x = i * (canvas.width / 6);
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
      
      // Draw time labels
      if (i < 6) { // Skip the last label to avoid crowding
        const time = new Date(measurements[0].timestamp + (i * timeInterval));
        const label = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        ctx.fillStyle = theme.palette.text.secondary;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, x, canvas.height - 15);
      }
    }
    
    // Draw CPU usage line
    drawUsageLine(
      ctx, 
      measurements.map(m => m.cpu), 
      canvas.width, 
      canvas.height, 
      theme.palette.primary.main
    );
    
    // Draw Memory usage line
    drawUsageLine(
      ctx, 
      measurements.map(m => Math.min(m.memory / 10, 100)), // Scale memory to percentage (max 1000 MB)
      canvas.width, 
      canvas.height, 
      theme.palette.secondary.main
    );
    
    // Draw Network usage line
    drawUsageLine(
      ctx, 
      measurements.map(m => Math.min(m.network * 10, 100)), // Scale network to percentage (max 10 MB/s)
      canvas.width, 
      canvas.height, 
      theme.palette.success.main
    );
    
    // Draw legend
    const legendItems = [
      { label: 'CPU', color: theme.palette.primary.main },
      { label: 'Memory', color: theme.palette.secondary.main },
      { label: 'Network', color: theme.palette.success.main }
    ];
    
    legendItems.forEach((item, index) => {
      const x = 70 * index + 10;
      const y = 15;
      
      // Draw color box
      ctx.fillStyle = item.color;
      ctx.fillRect(x, y - 5, 10, 10);
      
      // Draw label
      ctx.fillStyle = theme.palette.text.primary;
      ctx.font = '11px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, x + 15, y);
    });
  }, [measurements, theme]);
  
  // Draw usage line helper function
  const drawUsageLine = (
    ctx: CanvasRenderingContext2D, 
    values: number[], 
    width: number, 
    height: number, 
    color: string
  ) => {
    if (!values.length) return;
    
    const xStep = width / (values.length - 1);
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    values.forEach((value, index) => {
      const x = index * xStep;
      const y = height - (height * value / 100);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw area under the line
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = `${color}20`; // Add transparency
    ctx.fill();
  };
  
  // Format value with units
  const formatValue = (type: 'cpu' | 'memory' | 'network', value: number): string => {
    switch (type) {
      case 'cpu':
        return `${value.toFixed(1)}%`;
      case 'memory':
        return `${value.toFixed(0)} MB`;
      case 'network':
        return `${value.toFixed(1)} MB/s`;
      default:
        return `${value}`;
    }
  };
  
  // Get progress color based on value and resource type
  const getProgressColor = (type: 'cpu' | 'memory' | 'network', value: number): 'success' | 'warning' | 'error' | 'primary' => {
    switch (type) {
      case 'cpu':
        return value < 50 ? 'success' : value < 80 ? 'warning' : 'error';
      case 'memory':
        return value < 500 ? 'success' : value < 800 ? 'warning' : 'error';
      case 'network':
        return 'primary';
      default:
        return 'primary';
    }
  };
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Current usage meters */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              CPU Usage
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ flexGrow: 1, mr: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={currentUsage.cpu} 
                  color={getProgressColor('cpu', currentUsage.cpu)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {formatValue('cpu', currentUsage.cpu)}
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={12}>
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Memory Usage
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ flexGrow: 1, mr: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(currentUsage.memory / 10, 100)} 
                  color={getProgressColor('memory', currentUsage.memory)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {formatValue('memory', currentUsage.memory)}
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={12}>
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Network Usage
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ flexGrow: 1, mr: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(currentUsage.network * 10, 100)} 
                  color={getProgressColor('network', currentUsage.network)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {formatValue('network', currentUsage.network)}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Usage history graph */}
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Resource Usage History ({refreshInterval}s updates)
      </Typography>
      
      <Box sx={{ flexGrow: 1, minHeight: 200, position: 'relative', mt: 1 }}>
        <canvas 
          ref={canvasRef} 
          style={{ 
            width: '100%', 
            height: '100%', 
            display: 'block',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 4
          }}
        />
      </Box>
      
      {/* Active operations list */}
      {activeOperations.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Active Operations ({activeOperations.length})
          </Typography>
          
          <Paper variant="outlined" sx={{ maxHeight: 120, overflow: 'auto', p: 1 }}>
            {activeOperations.map(op => (
              <Box key={op.id} sx={{ mb: 1 }}>
                <Typography variant="caption" display="block">
                  {op.name} ({op.progress}%)
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={op.progress} 
                  sx={{ height: 4, borderRadius: 2, mb: 1 }}
                />
              </Box>
            ))}
          </Paper>
        </Box>
      )}
    </Box>
  );
};