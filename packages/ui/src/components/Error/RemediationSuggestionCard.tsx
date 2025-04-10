import React, { useState } from 'react';
import { 
  Card, CardHeader, CardContent, Typography, Box, 
  Button, Chip, List, ListItem, ListItemIcon, ListItemText,
  Divider, CircularProgress
} from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { RemediationSuggestion } from '../../services/MigrationService';

interface RemediationSuggestionCardProps {
  suggestion: RemediationSuggestion;
  onActionClick?: (suggestion: RemediationSuggestion) => Promise<void>;
}

const getErrorTypeColor = (errorType: string): string => {
  switch (errorType) {
    case 'auth': return '#ffa726'; // orange
    case 'validation': return '#7cb342'; // light green
    case 'network': return '#42a5f5'; // blue
    case 'resource': return '#9c27b0'; // purple
    case 'system': return '#d32f2f'; // red
    default: return '#757575'; // grey
  }
};

export const RemediationSuggestionCard: React.FC<RemediationSuggestionCardProps> = ({ 
  suggestion,
  onActionClick
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleActionClick = async () => {
    if (!suggestion.automated || !onActionClick) return;
    
    setIsLoading(true);
    try {
      await onActionClick(suggestion);
    } catch (error) {
      console.error('Error executing remediation action:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card sx={{ 
      mb: 2, 
      borderLeft: `4px solid ${getErrorTypeColor(suggestion.errorType)}`, 
      bgcolor: 'background.paper',
      '&:hover': {
        boxShadow: 3
      }
    }}>
      <CardHeader
        avatar={<LightbulbIcon color="warning" />}
        title={
          <Typography variant="h6" component="div">
            {suggestion.title}
          </Typography>
        }
        action={suggestion.automated && (
          <Button
            variant="contained"
            color="primary"
            size="small"
            endIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardIcon />}
            onClick={handleActionClick}
            disabled={isLoading}
          >
            {suggestion.actionName || 'Apply'}
          </Button>
        )}
      />
      <CardContent>
        <Typography variant="body1" paragraph>
          {suggestion.description}
        </Typography>
        
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Recommended Steps:
        </Typography>
        
        <List dense disablePadding>
          {suggestion.steps.map((step, index) => (
            <ListItem key={index} disableGutters>
              <ListItemIcon sx={{ minWidth: 30 }}>
                <CheckCircleOutlineIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={step} />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};
