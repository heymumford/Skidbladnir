/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { Button, TextField, Select, MenuItem, FormControl, InputLabel, Checkbox } from '@mui/material';

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
 * User Interaction Test Suite
 * 
 * This test suite focuses on basic user interactions with UI components,
 * such as clicks, form inputs, and keyboard navigation.
 */
describe('Basic User Interactions', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <ThemeProvider theme={mockTheme}>
          {ui}
        </ThemeProvider>
      </BrowserRouter>
    );
  };

  describe('Button Interactions', () => {
    it('responds to click events', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      renderWithProviders(
        <Button 
          onClick={handleClick}
          data-testid="test-button"
        >
          Click Me
        </Button>
      );
      
      // Find the button
      const button = screen.getByTestId('test-button');
      
      // Click the button
      await user.click(button);
      
      // Verify click handler was called
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
    
    it('shows loading state when processing', async () => {
      const user = userEvent.setup();
      
      // Component with loading state
      function LoadingButton() {
        const [loading, setLoading] = React.useState(false);
        
        const handleClick = () => {
          setLoading(true);
          // Simulate async operation
          setTimeout(() => setLoading(false), 100);
        };
        
        return (
          <Button 
            onClick={handleClick}
            disabled={loading}
            data-testid="loading-button"
          >
            {loading ? 'Loading...' : 'Submit'}
          </Button>
        );
      }
      
      renderWithProviders(<LoadingButton />);
      
      // Find and click the button
      const button = screen.getByTestId('loading-button');
      expect(button).toHaveTextContent('Submit');
      
      // Click the button
      await user.click(button);
      
      // Button should now be in loading state
      expect(button).toHaveTextContent('Loading...');
      expect(button).toBeDisabled();
    });
    
    it('supports double-click events', async () => {
      const handleClick = jest.fn();
      const handleDoubleClick = jest.fn();
      const user = userEvent.setup();
      
      renderWithProviders(
        <div 
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          data-testid="double-click-element"
          style={{ width: 100, height: 100, background: 'lightgray' }}
        >
          Double-click me
        </div>
      );
      
      // Find the element
      const element = screen.getByTestId('double-click-element');
      
      // Double-click the element
      await user.dblClick(element);
      
      // Verify double-click handler was called
      expect(handleDoubleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Text Input Interactions', () => {
    it('captures user input correctly', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      renderWithProviders(
        <TextField 
          label="Name"
          onChange={handleChange}
          inputProps={{ 'data-testid': 'name-input' }}
        />
      );
      
      // Find the input
      const input = screen.getByTestId('name-input');
      
      // Type in the input
      await user.type(input, 'John Doe');
      
      // Input should have the correct value
      expect(input).toHaveValue('John Doe');
      
      // Change handler should be called for each keystroke
      expect(handleChange).toHaveBeenCalledTimes(8); // 'John Doe' has 8 characters
    });
    
    it('shows validation errors when input is invalid', async () => {
      const user = userEvent.setup();
      
      // Component with input validation
      function ValidatedInput() {
        const [value, setValue] = React.useState('');
        const [error, setError] = React.useState('');
        
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const newValue = e.target.value;
          setValue(newValue);
          
          // Simple validation
          if (newValue.length > 0 && newValue.length < 3) {
            setError('Name must be at least 3 characters');
          } else {
            setError('');
          }
        };
        
        return (
          <div>
            <TextField 
              label="Name"
              value={value}
              onChange={handleChange}
              error={!!error}
              helperText={error}
              inputProps={{ 'data-testid': 'validated-input' }}
            />
          </div>
        );
      }
      
      renderWithProviders(<ValidatedInput />);
      
      // Find the input
      const input = screen.getByTestId('validated-input');
      
      // Type 'Jo' (too short)
      await user.type(input, 'Jo');
      
      // Error message should be displayed
      expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument();
      
      // Type one more character to make it valid
      await user.type(input, 'h');
      
      // Error message should disappear
      expect(screen.queryByText('Name must be at least 3 characters')).not.toBeInTheDocument();
    });
    
    it('handles paste events', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <TextField 
          label="Text Field"
          inputProps={{ 'data-testid': 'paste-input' }}
        />
      );
      
      // Find the input
      const input = screen.getByTestId('paste-input');
      
      // Focus the input
      await user.click(input);
      
      // Simulate paste event with clipboard data
      await user.paste('Pasted text');
      
      // Input should have the pasted value
      expect(input).toHaveValue('Pasted text');
    });
  });

  describe('Selection Interactions', () => {
    it('selects dropdown options', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      // Simple select component
      renderWithProviders(
        <FormControl>
          <InputLabel id="select-label">Choose an option</InputLabel>
          <Select
            labelId="select-label"
            label="Choose an option"
            onChange={handleChange}
            data-testid="select-input"
          >
            <MenuItem value="option1">Option 1</MenuItem>
            <MenuItem value="option2">Option 2</MenuItem>
            <MenuItem value="option3">Option 3</MenuItem>
          </Select>
        </FormControl>
      );
      
      // Open the select dropdown
      const selectElement = screen.getByTestId('select-input');
      await user.click(selectElement);
      
      // Select an option
      await user.click(screen.getByText('Option 2'));
      
      // Change handler should be called with the selected value
      expect(handleChange).toHaveBeenCalled();
    });
    
    it('handles checkbox selection', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      renderWithProviders(
        <FormControl>
          <Checkbox
            onChange={handleChange}
            inputProps={{ 'data-testid': 'checkbox-input' }}
          />
          <label>Agree to terms</label>
        </FormControl>
      );
      
      // Find the checkbox
      const checkbox = screen.getByTestId('checkbox-input');
      
      // Check the checkbox
      await user.click(checkbox);
      
      // Checkbox should be checked
      expect(checkbox).toBeChecked();
      
      // Change handler should be called
      expect(handleChange).toHaveBeenCalled();
      
      // Uncheck the checkbox
      await user.click(checkbox);
      
      // Checkbox should be unchecked
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates between form elements using Tab key', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <form>
          <TextField label="First Name" inputProps={{ 'data-testid': 'first-name' }} />
          <TextField label="Last Name" inputProps={{ 'data-testid': 'last-name' }} />
          <Button data-testid="submit-button">Submit</Button>
        </form>
      );
      
      // Get form elements
      const firstNameInput = screen.getByTestId('first-name');
      const lastNameInput = screen.getByTestId('last-name');
      const submitButton = screen.getByTestId('submit-button');
      
      // Focus on first input
      await user.click(firstNameInput);
      expect(document.activeElement).toBe(firstNameInput);
      
      // Press Tab to move to second input
      await user.tab();
      expect(document.activeElement).toBe(lastNameInput);
      
      // Press Tab again to move to submit button
      await user.tab();
      expect(document.activeElement).toBe(submitButton);
    });
    
    it('activates buttons with Enter key', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      renderWithProviders(
        <Button
          onClick={handleClick}
          data-testid="enter-button"
        >
          Submit
        </Button>
      );
      
      // Focus the button
      const button = screen.getByTestId('enter-button');
      button.focus();
      
      // Press Enter
      await user.keyboard('{Enter}');
      
      // Click handler should be called
      expect(handleClick).toHaveBeenCalled();
    });
    
    it('handles Space key for checkboxes', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      renderWithProviders(
        <Checkbox
          onChange={handleChange}
          inputProps={{ 'data-testid': 'space-checkbox' }}
        />
      );
      
      // Focus the checkbox
      const checkbox = screen.getByTestId('space-checkbox');
      checkbox.focus();
      
      // Press Space
      await user.keyboard(' ');
      
      // Checkbox should be checked
      expect(checkbox).toBeChecked();
      
      // Change handler should be called
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Drag and Drop Interactions', () => {
    it('simulates basic drag and drop', () => {
      // Simplified drag and drop simulation using fireEvent
      // Real drag and drop testing would be more complex and use specialized libraries
      
      const handleDragStart = jest.fn();
      const handleDrop = jest.fn();
      
      renderWithProviders(
        <div>
          <div
            data-testid="draggable"
            draggable
            onDragStart={handleDragStart}
          >
            Drag me
          </div>
          <div
            data-testid="droppable"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            Drop here
          </div>
        </div>
      );
      
      // Get elements
      const draggable = screen.getByTestId('draggable');
      const droppable = screen.getByTestId('droppable');
      
      // Simulate drag start
      fireEvent.dragStart(draggable);
      expect(handleDragStart).toHaveBeenCalled();
      
      // Simulate drag over (needed to make drop work)
      fireEvent.dragOver(droppable);
      
      // Simulate drop
      fireEvent.drop(droppable);
      expect(handleDrop).toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    it('manages focus when opening and closing dialogs', async () => {
      const user = userEvent.setup();
      
      // Component with dialog
      function DialogComponent() {
        const [open, setOpen] = React.useState(false);
        
        return (
          <div>
            <Button
              onClick={() => setOpen(true)}
              data-testid="open-dialog-button"
            >
              Open Dialog
            </Button>
            
            {open && (
              <div
                role="dialog"
                aria-modal="true"
                data-testid="dialog"
              >
                <h2>Dialog Title</h2>
                <p>Dialog content</p>
                <Button
                  onClick={() => setOpen(false)}
                  data-testid="close-dialog-button"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        );
      }
      
      renderWithProviders(<DialogComponent />);
      
      // Open dialog
      const openButton = screen.getByTestId('open-dialog-button');
      await user.click(openButton);
      
      // Dialog should be open
      const dialog = screen.getByTestId('dialog');
      expect(dialog).toBeInTheDocument();
      
      // Close dialog
      const closeButton = screen.getByTestId('close-dialog-button');
      await user.click(closeButton);
      
      // Dialog should be closed
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling and Feedback', () => {
    it('provides feedback after form submission', async () => {
      const user = userEvent.setup();
      
      // Component with form submission and feedback
      function FeedbackForm() {
        const [submitted, setSubmitted] = React.useState(false);
        const [error, setError] = React.useState('');
        const [value, setValue] = React.useState('');
        
        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          
          if (!value) {
            setError('Please enter a value');
            return;
          }
          
          // Simulate successful submission
          setSubmitted(true);
          setError('');
        };
        
        return (
          <form onSubmit={handleSubmit} data-testid="feedback-form">
            <TextField
              label="Input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              error={!!error}
              helperText={error}
              inputProps={{ 'data-testid': 'feedback-input' }}
            />
            <Button type="submit" data-testid="feedback-submit">
              Submit
            </Button>
            {submitted && (
              <div data-testid="success-message">
                Form submitted successfully!
              </div>
            )}
          </form>
        );
      }
      
      renderWithProviders(<FeedbackForm />);
      
      // Try to submit without value (should show error)
      const submitButton = screen.getByTestId('feedback-submit');
      await user.click(submitButton);
      
      // Error message should be displayed
      expect(screen.getByText('Please enter a value')).toBeInTheDocument();
      
      // Success message should not be displayed
      expect(screen.queryByTestId('success-message')).not.toBeInTheDocument();
      
      // Enter a value and submit again
      const input = screen.getByTestId('feedback-input');
      await user.type(input, 'Test value');
      await user.click(submitButton);
      
      // Error should be gone
      expect(screen.queryByText('Please enter a value')).not.toBeInTheDocument();
      
      // Success message should be displayed
      expect(screen.getByTestId('success-message')).toBeInTheDocument();
    });
  });
});