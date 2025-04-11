/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Divider, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TableSortLabel,
  LinearProgress
} from '@mui/material';
import { MigrationMetrics, OperationDetail } from './RealTimeMigrationDashboard';
import { LogEntry } from '../../types';

interface PerformanceMetricsPanelProps {
  metrics: MigrationMetrics;
  operations: OperationDetail[];
  logs: LogEntry[];
}

export const PerformanceMetricsPanel: React.FC<PerformanceMetricsPanelProps> = ({
  metrics,
  operations,
  logs
}) => {
  return (
    <Box>
      <Grid container spacing={3}>
        {/* API Performance */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom>
              API Performance
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Average Response Time
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(metrics.responseTime / 10, 100)} 
                    color={metrics.responseTime < 300 ? 'success' : metrics.responseTime < 600 ? 'warning' : 'error'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {metrics.responseTime.toFixed(0)} ms
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                API Calls Per Minute
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(metrics.apiCallsPerMinute / 2, 100)} 
                    color="primary"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {metrics.apiCallsPerMinute.toFixed(0)}/min
                </Typography>
              </Box>
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Error Rate
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={metrics.errorRate} 
                    color={metrics.errorRate < 5 ? 'success' : metrics.errorRate < 15 ? 'warning' : 'error'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {metrics.errorRate.toFixed(1)}%
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        {/* Resource Usage */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom>
              Resource Usage
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                CPU Usage
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={metrics.cpuUsage} 
                    color={metrics.cpuUsage < 50 ? 'success' : metrics.cpuUsage < 80 ? 'warning' : 'error'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {metrics.cpuUsage.toFixed(1)}%
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Memory Usage
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(metrics.memoryUsage / 10, 100)} 
                    color={metrics.memoryUsage < 500 ? 'success' : metrics.memoryUsage < 800 ? 'warning' : 'error'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {metrics.memoryUsage.toFixed(0)} MB
                </Typography>
              </Box>
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Network Traffic
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(metrics.networkTraffic * 10, 100)} 
                    color="primary"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {metrics.networkTraffic.toFixed(1)} MB/s
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        {/* Operation Performance */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Operation Performance
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Operation</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>CPU</TableCell>
                    <TableCell>Memory</TableCell>
                    <TableCell>Network</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {operations
                    .filter(op => op.status !== 'pending')
                    .sort((a, b) => {
                      // Sort by status first: running, then completed, then others
                      if (a.status === 'running' && b.status !== 'running') return -1;
                      if (a.status !== 'running' && b.status === 'running') return 1;
                      if (a.status === 'completed' && b.status !== 'completed') return -1;
                      if (a.status !== 'completed' && b.status === 'completed') return 1;
                      
                      // Then sort by start time
                      const aTime = a.startTime ? a.startTime.getTime() : 0;
                      const bTime = b.startTime ? b.startTime.getTime() : 0;
                      return bTime - aTime;
                    })
                    .map((op) => {
                      // Calculate duration
                      let duration = 'N/A';
                      if (op.startTime) {
                        const endTime = op.endTime || new Date();
                        const durationMs = endTime.getTime() - op.startTime.getTime();
                        const durationSec = Math.floor(durationMs / 1000);
                        
                        if (durationSec < 60) {
                          duration = `${durationSec}s`;
                        } else {
                          const min = Math.floor(durationSec / 60);
                          const sec = durationSec % 60;
                          duration = `${min}m ${sec}s`;
                        }
                      }
                      
                      return (
                        <TableRow key={op.id}>
                          <TableCell>{op.name}</TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: op.status === 'completed' ? 'success.main' :
                                       op.status === 'running' ? 'primary.main' :
                                       op.status === 'failed' ? 'error.main' :
                                       'text.secondary',
                                fontWeight: op.status === 'running' ? 'bold' : 'regular'
                              }}
                            >
                              {op.status.toUpperCase()}
                              {op.status === 'running' && ` (${op.progress}%)`}
                            </Typography>
                          </TableCell>
                          <TableCell>{duration}</TableCell>
                          <TableCell>{op.resourceUsage?.cpu.toFixed(1)}%</TableCell>
                          <TableCell>{op.resourceUsage?.memory.toFixed(0)} MB</TableCell>
                          <TableCell>{op.resourceUsage?.network.toFixed(1)} MB/s</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        
        {/* Performance Statistics Summary */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Performance Summary
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Processing Speed
                  </Typography>
                  <Typography variant="h6">
                    {metrics.throughput.toFixed(1)} items/min
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {metrics.itemsPerSecond.toFixed(2)} items/second
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Success Rate
                  </Typography>
                  <Typography variant="h6">
                    {metrics.successRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {100 - metrics.successRate.toFixed(1)}% failure rate
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    API Efficiency
                  </Typography>
                  <Typography variant="h6">
                    {(metrics.apiCallsPerMinute / Math.max(metrics.throughput, 1)).toFixed(1)} calls/item
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {metrics.responseTime.toFixed(0)} ms average response time
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};