import React, { useState, useEffect } from 'react';
import { 
  Card, CardHeader, CardContent, Typography, Box, 
  Chip, Divider, Grid, IconButton, Collapse,
  Table, TableBody, TableCell, TableContainer, TableRow, Paper
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CategoryIcon from '@mui/icons-material/Category';
import LabelIcon from '@mui/icons-material/Label';
import { ErrorDetails } from '../../services/MigrationService';

interface ErrorDetailPanelProps {
  error: ErrorDetails;
  expanded?: boolean;
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

const errorTypeLabels: Record<string, string> = {
  auth: 'Authentication',
  validation: 'Validation',
  network: 'Network',
  resource: 'Resource',
  system: 'System',
  unknown: 'Unknown'
};

export const ErrorDetailPanel: React.FC<ErrorDetailPanelProps> = ({ error, expanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [showStackTrace, setShowStackTrace] = useState(false);

  const formattedTime = new Date(error.timestamp).toLocaleString();
  const errorColor = getErrorTypeColor(error.errorType);
  const errorTypeLabel = errorTypeLabels[error.errorType] || 'Unknown';

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleStackTrace = () => {
    setShowStackTrace(!showStackTrace);
  };

  return (
    <Card sx={{ mb: 2, borderLeft: `4px solid ${errorColor}` }}>
      <CardHeader
        title={
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              <ErrorOutlineIcon color="error" />
              <Typography variant="h6" component="div" sx={{ mr: 2 }}>
                {error.message}
              </Typography>
            </Box>
            <IconButton 
              onClick={toggleExpand}
              aria-expanded={isExpanded}
              aria-label="show more"
              size="small"
            >
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        }
        subheader={
          <Box display="flex" flexWrap="wrap" gap={1} alignItems="center" mt={1}>
            <Chip 
              icon={<CategoryIcon />} 
              label={errorTypeLabel} 
              size="small" 
              sx={{ bgcolor: errorColor, color: 'white' }} 
            />
            <Chip 
              icon={<LabelIcon />} 
              label={error.component} 
              size="small" 
              variant="outlined" 
            />
            <Chip 
              icon={<AccessTimeIcon />} 
              label={formattedTime} 
              size="small" 
              variant="outlined" 
            />
          </Box>
        }
        sx={{ pb: 0 }}
      />
      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Operation: {error.operation}
              </Typography>
              <Typography variant="body2" paragraph>
                ID: {error.errorId}
              </Typography>
            </Grid>

            {error.details && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Details:
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableBody>
                      {Object.entries(error.details).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', width: '30%' }}>
                            {key}
                          </TableCell>
                          <TableCell>
                            {Array.isArray(value) ? (
                              <ul style={{ margin: 0, paddingLeft: 16 }}>
                                {value.map((item, index) => (
                                  <li key={index}>{String(item)}</li>
                                ))}
                              </ul>
                            ) : typeof value === 'object' ? (
                              <pre style={{ margin: 0 }}>{JSON.stringify(value, null, 2)}</pre>
                            ) : (
                              String(value)
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            )}

            {error.context && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Context:
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableBody>
                      {Object.entries(error.context).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', width: '30%' }}>
                            {key}
                          </TableCell>
                          <TableCell>{String(value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            )}

            {error.stackTrace && (
              <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Stack Trace:
                  </Typography>
                  <IconButton size="small" onClick={toggleStackTrace}>
                    <CodeIcon />
                  </IconButton>
                </Box>
                <Collapse in={showStackTrace}>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 1, 
                      bgcolor: 'grey.900', 
                      color: 'grey.100', 
                      fontFamily: 'monospace', 
                      fontSize: '0.875rem',
                      overflowX: 'auto'
                    }}
                  >
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {error.stackTrace}
                    </pre>
                  </Paper>
                </Collapse>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Collapse>
    </Card>
  );
};
