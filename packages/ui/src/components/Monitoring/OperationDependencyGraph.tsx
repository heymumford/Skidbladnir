/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, useTheme, Paper, Tooltip } from '@mui/material';
import { OperationDetail } from './RealTimeMigrationDashboard';

interface OperationDependencyGraphProps {
  operations: OperationDetail[];
  onSelectOperation: (operationId: string) => void;
  selectedOperationId: string | null;
  showDetails?: boolean;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  level: number;
  status: string;
  progress: number;
  name: string;
  description: string;
  width: number;
  height: number;
}

interface GraphEdge {
  from: string;
  to: string;
  fromNode: GraphNode;
  toNode: GraphNode;
  status: 'active' | 'inactive' | 'completed' | 'failed';
}

export const OperationDependencyGraph: React.FC<OperationDependencyGraphProps> = ({
  operations,
  onSelectOperation,
  selectedOperationId,
  showDetails = false
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number, y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });
  
  // Calculate graph layout and relationships
  useEffect(() => {
    if (!operations.length) return;
    
    // Create adjacency list for the dependency graph
    const dependencyMap = new Map<string, string[]>();
    operations.forEach(op => {
      dependencyMap.set(op.id, []);
    });
    
    operations.forEach(op => {
      op.dependsOn.forEach(depId => {
        const depList = dependencyMap.get(depId) || [];
        depList.push(op.id);
        dependencyMap.set(depId, depList);
      });
    });
    
    // Calculate node levels through topological sorting
    const levels = new Map<string, number>();
    const visited = new Set<string>();
    
    const visit = (nodeId: string, level: number = 0) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      // Update level to be the maximum level seen so far
      levels.set(nodeId, Math.max(level, levels.get(nodeId) || 0));
      
      // Visit all dependent nodes
      const dependents = dependencyMap.get(nodeId) || [];
      dependents.forEach(depId => {
        visit(depId, level + 1);
      });
    };
    
    // Find root nodes (nodes with no dependencies)
    const rootNodes = operations.filter(op => op.dependsOn.length === 0).map(op => op.id);
    
    // Start traversal from root nodes
    rootNodes.forEach(nodeId => {
      visit(nodeId);
    });
    
    // Calculate max nodes per level for horizontal spacing
    const nodesPerLevel = new Map<number, string[]>();
    levels.forEach((level, nodeId) => {
      const nodes = nodesPerLevel.get(level) || [];
      nodes.push(nodeId);
      nodesPerLevel.set(level, nodes);
    });
    
    // Calculate layout
    const nodeWidth = 120;
    const nodeHeight = 40;
    const paddingX = 40;
    const paddingY = 60;
    
    // Get max level
    const maxLevel = Math.max(...Array.from(nodesPerLevel.keys()));
    
    // Calculate canvas size
    const width = Math.max(
      (Math.max(...Array.from(nodesPerLevel.values()).map(nodes => nodes.length)) * (nodeWidth + paddingX)) + paddingX,
      800 // minimum width
    );
    const height = Math.max((maxLevel + 1) * (nodeHeight + paddingY) + paddingY, 400);
    
    setCanvasSize({ width, height });
    
    // Create nodes with positions
    const nodes: GraphNode[] = [];
    
    // For each level, distribute nodes evenly
    nodesPerLevel.forEach((nodeIds, level) => {
      const totalWidth = width - paddingX * 2;
      const spacing = totalWidth / (nodeIds.length + 1);
      
      nodeIds.forEach((nodeId, index) => {
        const operation = operations.find(op => op.id === nodeId);
        if (!operation) return;
        
        const x = paddingX + spacing * (index + 1);
        const y = paddingY + level * (nodeHeight + paddingY);
        
        nodes.push({
          id: nodeId,
          x,
          y,
          level,
          status: operation.status,
          progress: operation.progress,
          name: operation.name,
          description: operation.description,
          width: nodeWidth,
          height: nodeHeight
        });
      });
    });
    
    setGraphNodes(nodes);
    
    // Create edges
    const edges: GraphEdge[] = [];
    
    operations.forEach(op => {
      const toNode = nodes.find(node => node.id === op.id);
      if (!toNode) return;
      
      op.dependsOn.forEach(depId => {
        const fromNode = nodes.find(node => node.id === depId);
        if (!fromNode) return;
        
        const fromOp = operations.find(op => op.id === depId);
        if (!fromOp) return;
        
        let status: 'active' | 'inactive' | 'completed' | 'failed' = 'inactive';
        
        if (fromOp.status === 'completed' && op.status === 'running') {
          status = 'active';
        } else if (fromOp.status === 'completed' && op.status === 'completed') {
          status = 'completed';
        } else if (fromOp.status === 'failed' || op.status === 'failed') {
          status = 'failed';
        }
        
        edges.push({
          from: depId,
          to: op.id,
          fromNode,
          toNode,
          status
        });
      });
    });
    
    setGraphEdges(edges);
  }, [operations]);
  
  // Draw graph when nodes or edges change
  useEffect(() => {
    if (!canvasRef.current || !graphNodes.length) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw edges
    graphEdges.forEach(edge => {
      const { fromNode, toNode, status } = edge;
      
      // Start point (bottom of from node)
      const startX = fromNode.x + fromNode.width / 2;
      const startY = fromNode.y + fromNode.height;
      
      // End point (top of to node)
      const endX = toNode.x + toNode.width / 2;
      const endY = toNode.y;
      
      // Control points for curve
      const midY = (startY + endY) / 2;
      
      // Set edge color
      ctx.strokeStyle = status === 'active' ? theme.palette.primary.main :
                       status === 'completed' ? theme.palette.success.main :
                       status === 'failed' ? theme.palette.error.main :
                       theme.palette.action.disabled;
      
      // Set line width
      ctx.lineWidth = status === 'active' ? 3 : 2;
      
      // Draw edge
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(startX, midY, endX, midY, endX, endY);
      ctx.stroke();
      
      // Draw arrow
      const arrowSize = 8;
      const angle = Math.atan2(endY - midY, endX - midY);
      
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle - Math.PI / 6),
        endY - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle + Math.PI / 6),
        endY - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    });
    
    // Draw nodes
    graphNodes.forEach(node => {
      const isSelected = node.id === selectedOperationId;
      const isHovered = node.id === hoveredNode;
      
      // Set node style based on status
      let backgroundColor, borderColor, textColor;
      
      switch (node.status) {
        case 'running':
          backgroundColor = theme.palette.primary.light;
          borderColor = theme.palette.primary.main;
          textColor = theme.palette.primary.contrastText;
          break;
        case 'completed':
          backgroundColor = theme.palette.success.light;
          borderColor = theme.palette.success.main;
          textColor = theme.palette.success.contrastText;
          break;
        case 'failed':
          backgroundColor = theme.palette.error.light;
          borderColor = theme.palette.error.main;
          textColor = theme.palette.error.contrastText;
          break;
        case 'skipped':
          backgroundColor = theme.palette.grey[300];
          borderColor = theme.palette.grey[400];
          textColor = theme.palette.text.primary;
          break;
        default: // pending
          backgroundColor = theme.palette.background.paper;
          borderColor = theme.palette.action.disabled;
          textColor = theme.palette.text.secondary;
      }
      
      // Draw node
      ctx.beginPath();
      ctx.roundRect(node.x, node.y, node.width, node.height, 6);
      ctx.fillStyle = isHovered || isSelected ? 
                     theme.palette.action.selected : 
                     backgroundColor;
      ctx.fill();
      
      // Draw border
      ctx.strokeStyle = isSelected ? 
                       theme.palette.primary.dark : 
                       isHovered ? 
                       theme.palette.primary.main : 
                       borderColor;
      ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
      ctx.stroke();
      
      // Draw progress if running
      if (node.status === 'running' && node.progress > 0) {
        const progressWidth = (node.width - 4) * (node.progress / 100);
        ctx.fillStyle = theme.palette.primary.main;
        ctx.beginPath();
        ctx.roundRect(node.x + 2, node.y + node.height - 6, progressWidth, 4, 2);
        ctx.fill();
      }
      
      // Draw text
      ctx.fillStyle = isSelected ? 
                     theme.palette.primary.main : 
                     textColor;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        node.name.length > 20 ? node.name.substring(0, 17) + '...' : node.name, 
        node.x + node.width / 2, 
        node.y + node.height / 2
      );
    });
  }, [graphNodes, graphEdges, theme, hoveredNode, selectedOperationId, canvasSize]);
  
  // Handle mouse interactions
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find node under cursor
    let hoveredNodeId: string | null = null;
    let tooltipPos: { x: number, y: number } | null = null;
    
    for (const node of graphNodes) {
      if (
        x >= node.x && 
        x <= node.x + node.width && 
        y >= node.y && 
        y <= node.y + node.height
      ) {
        hoveredNodeId = node.id;
        tooltipPos = { x: e.clientX, y: e.clientY };
        break;
      }
    }
    
    setHoveredNode(hoveredNodeId);
    setTooltipPosition(tooltipPos);
  };
  
  const handleMouseLeave = () => {
    setHoveredNode(null);
    setTooltipPosition(null);
  };
  
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !hoveredNode) return;
    
    onSelectOperation(hoveredNode);
  };
  
  // Get tooltip data
  const tooltipData = hoveredNode ? 
    operations.find(op => op.id === hoveredNode) : 
    null;
  
  return (
    <Box 
      sx={{
        position: 'relative', 
        width: '100%', 
        height: showDetails ? 500 : 300,
        overflow: 'hidden'
      }}
      ref={containerRef}
    >
      <canvas
        ref={canvasRef}
        style={{ 
          display: 'block', 
          cursor: hoveredNode ? 'pointer' : 'default',
          borderRadius: 4,
          border: `1px solid ${theme.palette.divider}`
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
      
      {tooltipData && tooltipPosition && (
        <Box
          sx={{
            position: 'fixed',
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y + 10,
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <Paper
            elevation={3}
            sx={{ 
              p: 1, 
              maxWidth: 300, 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <Typography variant="subtitle2" gutterBottom>{tooltipData.name}</Typography>
            <Typography variant="body2" color="text.secondary">{tooltipData.description}</Typography>
            
            {tooltipData.status !== 'pending' && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                Status: {tooltipData.status.toUpperCase()} ({tooltipData.progress}%)
              </Typography>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
};