/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { 
  Button, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  CircularProgress,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  Tab
} from '@mui/material';

// Create a simple theme for testing
const mockTheme = {
  palette: {
    primary: { main: '#5c88da' },
    secondary: { main: '#f48fb1' },
    error: { main: '#f44336' },
    warning: { main: '#ff9800' },
    success: { main: '#4caf50' },
    text: { primary: '#000000', secondary: '#757575' }
  },
  typography: { fontFamily: 'Arial' },
  components: {}
};

/**
 * Complex Interaction Flow Tests
 * 
 * Tests for multi-step user interactions and workflows
 */
describe('Complex User Interaction Flows', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <ThemeProvider theme={mockTheme}>
          {ui}
        </ThemeProvider>
      </BrowserRouter>
    );
  };

  describe('Dialog Confirmation Flows', () => {
    it('handles confirm/cancel dialog flow', async () => {
      const user = userEvent.setup();
      const onConfirm = jest.fn();
      const onCancel = jest.fn();
      
      // Component with confirmation dialog
      function DeleteConfirmation() {
        const [open, setOpen] = React.useState(false);
        
        const handleOpen = () => setOpen(true);
        const handleConfirm = () => {
          onConfirm();
          setOpen(false);
        };
        const handleCancel = () => {
          onCancel();
          setOpen(false);
        };
        
        return (
          <div>
            <Button onClick={handleOpen} data-testid="delete-button">
              Delete Item
            </Button>
            
            <Dialog open={open} onClose={handleCancel}>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogContent>
                Are you sure you want to delete this item? This action cannot be undone.
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCancel} data-testid="cancel-button">
                  Cancel
                </Button>
                <Button onClick={handleConfirm} color="error" data-testid="confirm-button">
                  Delete
                </Button>
              </DialogActions>
            </Dialog>
          </div>
        );
      }
      
      renderWithProviders(<DeleteConfirmation />);
      
      // Click delete button to open dialog
      await user.click(screen.getByTestId('delete-button'));
      
      // Dialog should be open
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      
      // Cancel the deletion
      await user.click(screen.getByTestId('cancel-button'));
      
      // Dialog should be closed
      expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
      
      // Cancel callback should be called
      expect(onCancel).toHaveBeenCalledTimes(1);
      // Confirm callback should not be called
      expect(onConfirm).not.toHaveBeenCalled();
      
      // Open dialog again
      await user.click(screen.getByTestId('delete-button'));
      
      // Confirm the deletion
      await user.click(screen.getByTestId('confirm-button'));
      
      // Dialog should be closed
      expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
      
      // Confirm callback should be called
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Async Operation Flows', () => {
    it('shows loading state and handles success', async () => {
      const user = userEvent.setup();
      
      // Mock API call
      const mockApiCall = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ success: true, data: { id: '123', name: 'Test Item' } });
          }, 200);
        });
      });
      
      // Component with async operation
      function AsyncOperationComponent() {
        const [loading, setLoading] = React.useState(false);
        const [success, setSuccess] = React.useState(false);
        const [data, setData] = React.useState<{ id: string, name: string } | null>(null);
        
        const handleClick = async () => {
          setLoading(true);
          try {
            const result = await mockApiCall();
            setData(result.data);
            setSuccess(true);
          } catch (error) {
            // Error handling would go here
          } finally {
            setLoading(false);
          }
        };
        
        return (
          <div>
            <Button 
              onClick={handleClick} 
              disabled={loading}
              data-testid="load-button"
            >
              {loading ? 'Loading...' : 'Load Data'}
            </Button>
            
            {loading && (
              <div data-testid="loading-indicator">
                <CircularProgress size={24} />
                <span>Loading data...</span>
              </div>
            )}
            
            {success && data && (
              <div data-testid="success-display">
                <h3>Data Loaded Successfully</h3>
                <p>ID: {data.id}</p>
                <p>Name: {data.name}</p>
              </div>
            )}
          </div>
        );
      }
      
      renderWithProviders(<AsyncOperationComponent />);
      
      // Click load button
      await user.click(screen.getByTestId('load-button'));
      
      // Loading indicator should be visible
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      
      // Button should be disabled
      expect(screen.getByTestId('load-button')).toBeDisabled();
      
      // Wait for operation to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });
      
      // Success message should be displayed
      expect(screen.getByTestId('success-display')).toBeInTheDocument();
      expect(screen.getByText('Data Loaded Successfully')).toBeInTheDocument();
      expect(screen.getByText('ID: 123')).toBeInTheDocument();
      expect(screen.getByText('Name: Test Item')).toBeInTheDocument();
      
      // Button should be enabled again
      expect(screen.getByTestId('load-button')).not.toBeDisabled();
    });
    
    it('handles async operation failure', async () => {
      const user = userEvent.setup();
      
      // Mock API call that fails
      const mockApiCall = jest.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('API Error: Failed to load data'));
          }, 200);
        });
      });
      
      // Component with async operation
      function AsyncOperationComponent() {
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState<string | null>(null);
        
        const handleClick = async () => {
          setLoading(true);
          setError(null);
          try {
            await mockApiCall();
          } catch (error) {
            setError((error as Error).message);
          } finally {
            setLoading(false);
          }
        };
        
        return (
          <div>
            <Button 
              onClick={handleClick} 
              disabled={loading}
              data-testid="load-button"
            >
              {loading ? 'Loading...' : 'Load Data'}
            </Button>
            
            {loading && (
              <div data-testid="loading-indicator">
                <CircularProgress size={24} />
                <span>Loading data...</span>
              </div>
            )}
            
            {error && (
              <div data-testid="error-display" role="alert">
                <p>Error: {error}</p>
                <Button onClick={() => setError(null)}>Dismiss</Button>
              </div>
            )}
          </div>
        );
      }
      
      renderWithProviders(<AsyncOperationComponent />);
      
      // Click load button
      await user.click(screen.getByTestId('load-button'));
      
      // Loading indicator should be visible
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      
      // Button should be disabled
      expect(screen.getByTestId('load-button')).toBeDisabled();
      
      // Wait for operation to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      });
      
      // Error message should be displayed
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      expect(screen.getByText(/API Error: Failed to load data/i)).toBeInTheDocument();
      
      // Button should be enabled again
      expect(screen.getByTestId('load-button')).not.toBeDisabled();
      
      // Dismiss the error
      await user.click(screen.getByText('Dismiss'));
      
      // Error message should be gone
      expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
    });
  });

  describe('Multi-step Form Flows', () => {
    it('completes a multi-step form process', async () => {
      const user = userEvent.setup();
      const handleSubmit = jest.fn();
      
      // Multi-step form component
      function MultiStepForm() {
        const [activeStep, setActiveStep] = React.useState(0);
        const [formData, setFormData] = React.useState({
          name: '',
          email: '',
          address: '',
          preferences: ''
        });
        
        const updateField = (field: string, value: string) => {
          setFormData({
            ...formData,
            [field]: value
          });
        };
        
        const nextStep = () => {
          setActiveStep((prev) => prev + 1);
        };
        
        const prevStep = () => {
          setActiveStep((prev) => prev - 1);
        };
        
        const submitForm = () => {
          handleSubmit(formData);
        };
        
        // Step 1: Personal Information
        const renderPersonalInfo = () => (
          <div data-testid="step-1">
            <h2>Personal Information</h2>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              inputProps={{ 'data-testid': 'name-input' }}
            />
            <TextField
              label="Email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              inputProps={{ 'data-testid': 'email-input' }}
            />
            <Button 
              onClick={nextStep} 
              disabled={!formData.name || !formData.email}
              data-testid="next-button-1"
            >
              Next
            </Button>
          </div>
        );
        
        // Step 2: Address
        const renderAddress = () => (
          <div data-testid="step-2">
            <h2>Address</h2>
            <TextField
              label="Address"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              inputProps={{ 'data-testid': 'address-input' }}
            />
            <Button onClick={prevStep} data-testid="back-button-2">
              Back
            </Button>
            <Button 
              onClick={nextStep} 
              disabled={!formData.address}
              data-testid="next-button-2"
            >
              Next
            </Button>
          </div>
        );
        
        // Step 3: Preferences
        const renderPreferences = () => (
          <div data-testid="step-3">
            <h2>Preferences</h2>
            <TextField
              label="Preferences"
              value={formData.preferences}
              onChange={(e) => updateField('preferences', e.target.value)}
              inputProps={{ 'data-testid': 'preferences-input' }}
            />
            <Button onClick={prevStep} data-testid="back-button-3">
              Back
            </Button>
            <Button 
              onClick={nextStep} 
              disabled={!formData.preferences}
              data-testid="next-button-3"
            >
              Review
            </Button>
          </div>
        );
        
        // Step 4: Review
        const renderReview = () => (
          <div data-testid="step-4">
            <h2>Review Your Information</h2>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>{formData.name}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>{formData.email}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Address</TableCell>
                  <TableCell>{formData.address}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Preferences</TableCell>
                  <TableCell>{formData.preferences}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Button onClick={prevStep} data-testid="back-button-4">
              Back
            </Button>
            <Button 
              onClick={submitForm} 
              color="primary" 
              variant="contained"
              data-testid="submit-button"
            >
              Submit
            </Button>
          </div>
        );
        
        // Render the active step
        const getStepContent = () => {
          switch (activeStep) {
            case 0:
              return renderPersonalInfo();
            case 1:
              return renderAddress();
            case 2:
              return renderPreferences();
            case 3:
              return renderReview();
            default:
              return <div>Unknown step</div>;
          }
        };
        
        return (
          <div>
            <h1>Multi-step Form</h1>
            {getStepContent()}
          </div>
        );
      }
      
      renderWithProviders(<MultiStepForm />);
      
      // Step 1: Fill personal information
      expect(screen.getByTestId('step-1')).toBeInTheDocument();
      
      await user.type(screen.getByTestId('name-input'), 'John Doe');
      await user.type(screen.getByTestId('email-input'), 'john@example.com');
      
      // Next button should be enabled
      const nextButton1 = screen.getByTestId('next-button-1');
      expect(nextButton1).not.toBeDisabled();
      
      // Go to step 2
      await user.click(nextButton1);
      
      // Step 2: Fill address
      expect(screen.getByTestId('step-2')).toBeInTheDocument();
      
      await user.type(screen.getByTestId('address-input'), '123 Main St');
      
      // Go to step 3
      await user.click(screen.getByTestId('next-button-2'));
      
      // Step 3: Fill preferences
      expect(screen.getByTestId('step-3')).toBeInTheDocument();
      
      await user.type(screen.getByTestId('preferences-input'), 'Dark theme, large font');
      
      // Go to step 4 (review)
      await user.click(screen.getByTestId('next-button-3'));
      
      // Step 4: Review and submit
      expect(screen.getByTestId('step-4')).toBeInTheDocument();
      
      // Verify data is displayed correctly
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('123 Main St')).toBeInTheDocument();
      expect(screen.getByText('Dark theme, large font')).toBeInTheDocument();
      
      // Submit the form
      await user.click(screen.getByTestId('submit-button'));
      
      // Check that handleSubmit was called with correct data
      expect(handleSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        address: '123 Main St',
        preferences: 'Dark theme, large font'
      });
    });
  });

  describe('Tab Navigation Flows', () => {
    it('navigates between tabs and preserves content state', async () => {
      const user = userEvent.setup();
      
      // Tabbed interface component
      function TabbedInterface() {
        const [activeTab, setActiveTab] = React.useState(0);
        const [tab1Data, setTab1Data] = React.useState('');
        const [tab2Data, setTab2Data] = React.useState('');
        
        const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
          setActiveTab(newValue);
        };
        
        return (
          <div>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Tab 1" data-testid="tab-1" />
              <Tab label="Tab 2" data-testid="tab-2" />
            </Tabs>
            
            {/* Tab 1 Content */}
            {activeTab === 0 && (
              <div data-testid="tab-1-content">
                <h2>Tab 1 Content</h2>
                <TextField
                  label="Tab 1 Input"
                  value={tab1Data}
                  onChange={(e) => setTab1Data(e.target.value)}
                  inputProps={{ 'data-testid': 'tab-1-input' }}
                />
              </div>
            )}
            
            {/* Tab 2 Content */}
            {activeTab === 1 && (
              <div data-testid="tab-2-content">
                <h2>Tab 2 Content</h2>
                <TextField
                  label="Tab 2 Input"
                  value={tab2Data}
                  onChange={(e) => setTab2Data(e.target.value)}
                  inputProps={{ 'data-testid': 'tab-2-input' }}
                />
              </div>
            )}
          </div>
        );
      }
      
      renderWithProviders(<TabbedInterface />);
      
      // Tab 1 should be active initially
      expect(screen.getByTestId('tab-1-content')).toBeInTheDocument();
      
      // Enter data in Tab 1
      await user.type(screen.getByTestId('tab-1-input'), 'Data for Tab 1');
      
      // Switch to Tab 2
      await user.click(screen.getByTestId('tab-2'));
      
      // Tab 2 should now be active
      expect(screen.getByTestId('tab-2-content')).toBeInTheDocument();
      expect(screen.queryByTestId('tab-1-content')).not.toBeInTheDocument();
      
      // Enter data in Tab 2
      await user.type(screen.getByTestId('tab-2-input'), 'Data for Tab 2');
      
      // Switch back to Tab 1
      await user.click(screen.getByTestId('tab-1'));
      
      // Tab 1 should be active again
      expect(screen.getByTestId('tab-1-content')).toBeInTheDocument();
      
      // Verify that Tab 1 data is preserved
      expect(screen.getByTestId('tab-1-input')).toHaveValue('Data for Tab 1');
      
      // Switch back to Tab 2 again
      await user.click(screen.getByTestId('tab-2'));
      
      // Verify that Tab 2 data is preserved
      expect(screen.getByTestId('tab-2-input')).toHaveValue('Data for Tab 2');
    });
  });
});