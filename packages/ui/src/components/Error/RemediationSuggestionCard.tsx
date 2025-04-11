/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  CircularProgress,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { RemediationSuggestion } from '../../services/MigrationService';

interface RemediationSuggestionCardProps {
  suggestion: RemediationSuggestion;
  onActionClick?: (suggestion: RemediationSuggestion) => void;
  highlight?: boolean;
}

export const RemediationSuggestionCard: React.FC<RemediationSuggestionCardProps> = ({
  suggestion,
  onActionClick,
  highlight = false
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Handle action click
  const handleActionClick = async () => {
    if (!onActionClick) return;
    
    setLoading(true);
    try {
      await onActionClick(suggestion);
    } finally {
      // Keep loading state for UX feedback
    }
  };
  
  // Toggle expanded state
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  // Get color based on error type
  const getErrorTypeColor = (errorType: string): string => {
    switch (errorType) {
      case 'auth': return theme.palette.warning.main; // orange
      case 'validation': return theme.palette.success.main; // green
      case 'network': return theme.palette.info.main; // blue
      case 'resource': return theme.palette.secondary.main; // purple
      case 'system': return theme.palette.error.main; // red
      default: return theme.palette.grey[500]; // grey
    }
  };
  
  // Check if it's an AI-generated suggestion
  const isAiSuggestion = suggestion.id.startsWith('ai-');
  
  return (
    <Card 
      variant={highlight ? "elevation" : "outlined"} 
      elevation={highlight ? 3 : 0}
      sx={{ 
        mb: 2, 
        borderLeft: '4px solid',
        borderLeftColor: getErrorTypeColor(suggestion.errorType),
        bgcolor: highlight ? 'rgba(0, 200, 83, 0.04)' : undefined,
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 2
        }
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="subtitle1" component="div">
              {suggestion.title}
            </Typography>
            {isAiSuggestion && (
              <Chip 
                icon={<SmartToyIcon />} 
                label="AI" 
                size="small" 
                color="primary"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          <Chip 
            size="small" 
            label={suggestion.errorType}
            style={{ 
              backgroundColor: getErrorTypeColor(suggestion.errorType),
              color: '#fff'
            }}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          {suggestion.description}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Button
            size="small"
            startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={toggleExpanded}
          >
            {expanded ? "Hide Details" : "Show Details"}
          </Button>
          
          {suggestion.automated && (
            <Chip 
              icon={<AutoFixHighIcon />} 
              label="Automated Fix"
              size="small"
              variant="outlined"
              color="success"
            />
          )}
        </Box>
      </CardContent>
      
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ px: 2, pb: 2 }}>
          <Divider sx={{ my: 1 }} />
          
          <Typography variant="subtitle2" gutterBottom>
            Remediation Steps:
          </Typography>
          
          <List dense disablePadding>
            {suggestion.steps.map((step, index) => (
              <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ArrowRightIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={step} />
              </ListItem>
            ))}
          </List>
          
          {isAiSuggestion && (
            <Box sx={{ 
              mt: 2, 
              p: 1, 
              borderRadius: 1, 
              bgcolor: 'rgba(25, 118, 210, 0.08)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <SmartToyIcon color="primary" sx={{ mr: 1, fontSize: 16 }} />
              <Typography variant="caption" color="primary">
                This suggestion was generated by AI based on error pattern analysis and historical success rates.
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
      
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0, pb: 1, px: 2 }}>
        {suggestion.automated ? (
          <Button
            variant={highlight ? "contained" : "outlined"}
            size="small"
            color="primary"
            startIcon={loading ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
            onClick={handleActionClick}
            disabled={loading}
          >
            {suggestion.actionName || "Apply Fix"}
          </Button>
        ) : (
          <Button
            variant="outlined"
            size="small"
            color="primary"
            startIcon={<NotificationsActiveIcon />}
            disabled
          >
            Manual Fix Required
          </Button>
        )}
      </CardActions>
    </Card>
  );
};