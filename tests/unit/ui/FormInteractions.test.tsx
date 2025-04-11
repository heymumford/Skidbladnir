/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { 
  TextField, 
  Button, 
  FormControl, 
  FormHelperText, 
  InputLabel, 
  Select, 
  MenuItem, 
  Checkbox, 
  FormControlLabel,
  Radio,
  RadioGroup
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
 * Form Interaction Tests
 * 
 * Tests focused on form input handling, validation, and submission
 */
describe('Form Interactions', () => {
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(
      <ThemeProvider theme={mockTheme}>
        {ui}
      </ThemeProvider>
    );
  };

  describe('Text Input Fields', () => {
    it('captures keyboard input correctly', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      
      renderWithTheme(
        <TextField
          label="Username"
          onChange={handleChange}
          inputProps={{ 'data-testid': 'username-input' }}
        />
      );
      
      // Get the input element
      const input = screen.getByTestId('username-input');
      
      // Type in the input
      await user.type(input, 'johndoe');
      
      // Check the input value
      expect(input).toHaveValue('johndoe');
      
      // The change handler should be called for each keystroke
      expect(handleChange).toHaveBeenCalledTimes(7); // 'johndoe' has 7 characters
    });
    
    it('handles backspace and delete correctly', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(
        <TextField
          label="Username"
          defaultValue="johndoe"
          inputProps={{ 'data-testid': 'username-input' }}
        />
      );
      
      // Get the input element
      const input = screen.getByTestId('username-input');
      
      // Clear the input
      await user.clear(input);
      expect(input).toHaveValue('');
      
      // Type new value
      await user.type(input, 'janedoe');
      expect(input).toHaveValue('janedoe');
      
      // Use backspace to delete characters
      await user.type(input, '{backspace}{backspace}{backspace}');
      expect(input).toHaveValue('jane');
    });
    
    it('shows validation errors for invalid input', async () => {
      const user = userEvent.setup();
      
      // Component with validation
      function ValidatedTextField() {
        const [value, setValue] = React.useState('');
        const [error, setError] = React.useState('');
        
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const newValue = e.target.value;
          setValue(newValue);
          
          // Validate email format
          if (newValue && !/\S+@\S+\.\S+/.test(newValue)) {
            setError('Please enter a valid email address');
          } else {
            setError('');
          }
        };
        
        return (
          <TextField
            label="Email"
            value={value}
            onChange={handleChange}
            error={!!error}
            helperText={error}
            inputProps={{ 'data-testid': 'email-input' }}
          />
        );
      }
      
      renderWithTheme(<ValidatedTextField />);
      
      // Get the input
      const input = screen.getByTestId('email-input');
      
      // Type an invalid email
      await user.type(input, 'invalid-email');
      
      // Validation error should be shown
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      
      // Clear and type a valid email
      await user.clear(input);
      await user.type(input, 'valid@example.com');
      
      // Error should disappear
      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
    });
  });

  describe('Select Fields', () => {
    it('allows selecting an option from dropdown', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      
      renderWithTheme(
        <FormControl>
          <InputLabel id="category-label">Category</InputLabel>
          <Select
            labelId="category-label"
            label="Category"
            onChange={handleChange}
            data-testid="category-select"
          >
            <MenuItem value="technology">Technology</MenuItem>
            <MenuItem value="science">Science</MenuItem>
            <MenuItem value="art">Art</MenuItem>
          </Select>
        </FormControl>
      );
      
      // Click to open the dropdown
      const select = screen.getByTestId('category-select');
      await user.click(select);
      
      // Select an option
      await user.click(screen.getByText('Science'));
      
      // The change handler should be called
      expect(handleChange).toHaveBeenCalled();
    });
    
    it('shows validation error for required select', async () => {
      const user = userEvent.setup();
      
      // Component with validation
      function ValidatedSelect() {
        const [value, setValue] = React.useState('');
        const [touched, setTouched] = React.useState(false);
        
        const handleChange = (e: React.ChangeEvent<{ value: unknown }>) => {
          setValue(e.target.value as string);
        };
        
        const handleBlur = () => {
          setTouched(true);
        };
        
        const error = touched && !value ? 'Please select a category' : '';
        
        return (
          <FormControl error={!!error} required>
            <InputLabel id="category-label">Category</InputLabel>
            <Select
              labelId="category-label"
              label="Category"
              value={value}
              onChange={handleChange}
              onBlur={handleBlur}
              data-testid="category-select"
            >
              <MenuItem value="technology">Technology</MenuItem>
              <MenuItem value="science">Science</MenuItem>
              <MenuItem value="art">Art</MenuItem>
            </Select>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        );
      }
      
      renderWithTheme(<ValidatedSelect />);
      
      // Click and then blur the select without selecting a value
      const select = screen.getByTestId('category-select');
      await user.click(select);
      
      // Click outside to close dropdown and trigger blur
      await user.click(document.body);
      
      // Error should appear
      expect(screen.getByText('Please select a category')).toBeInTheDocument();
    });
  });

  describe('Checkbox and Radio Fields', () => {
    it('toggles checkboxes on click', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      
      renderWithTheme(
        <FormControlLabel
          control={
            <Checkbox 
              onChange={handleChange}
              inputProps={{ 'data-testid': 'terms-checkbox' }}
            />
          }
          label="I agree to the terms"
        />
      );
      
      // Get the checkbox
      const checkbox = screen.getByTestId('terms-checkbox');
      
      // Checkbox should initially be unchecked
      expect(checkbox).not.toBeChecked();
      
      // Click the checkbox
      await user.click(checkbox);
      
      // Checkbox should now be checked
      expect(checkbox).toBeChecked();
      
      // The change handler should be called
      expect(handleChange).toHaveBeenCalled();
      
      // Click again to uncheck
      await user.click(checkbox);
      
      // Checkbox should now be unchecked
      expect(checkbox).not.toBeChecked();
    });
    
    it('selects radio buttons within a group', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      
      renderWithTheme(
        <FormControl component="fieldset">
          <RadioGroup onChange={handleChange}>
            <FormControlLabel 
              value="small" 
              control={<Radio inputProps={{ 'data-testid': 'size-small' }} />} 
              label="Small" 
            />
            <FormControlLabel 
              value="medium" 
              control={<Radio inputProps={{ 'data-testid': 'size-medium' }} />} 
              label="Medium" 
            />
            <FormControlLabel 
              value="large" 
              control={<Radio inputProps={{ 'data-testid': 'size-large' }} />} 
              label="Large" 
            />
          </RadioGroup>
        </FormControl>
      );
      
      // Get radio buttons
      const smallRadio = screen.getByTestId('size-small');
      const mediumRadio = screen.getByTestId('size-medium');
      const largeRadio = screen.getByTestId('size-large');
      
      // All radios should initially be unchecked
      expect(smallRadio).not.toBeChecked();
      expect(mediumRadio).not.toBeChecked();
      expect(largeRadio).not.toBeChecked();
      
      // Click the first radio
      await user.click(smallRadio);
      
      // First radio should be checked
      expect(smallRadio).toBeChecked();
      expect(mediumRadio).not.toBeChecked();
      expect(largeRadio).not.toBeChecked();
      
      // The change handler should be called
      expect(handleChange).toHaveBeenCalled();
      
      // Click the second radio
      await user.click(mediumRadio);
      
      // Second radio should be checked, first should be unchecked
      expect(smallRadio).not.toBeChecked();
      expect(mediumRadio).toBeChecked();
      expect(largeRadio).not.toBeChecked();
    });
  });

  describe('Form Submission', () => {
    it('submits form data when all fields are valid', async () => {
      const user = userEvent.setup();
      const handleSubmit = jest.fn((e) => e.preventDefault());
      
      // Simple form component
      function SimpleForm() {
        const [formData, setFormData] = React.useState({
          name: '',
          email: '',
          subscription: false
        });
        
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const { name, value, checked, type } = e.target;
          setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
          });
        };
        
        return (
          <form onSubmit={handleSubmit} data-testid="simple-form">
            <TextField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              inputProps={{ 'data-testid': 'name-input' }}
            />
            <TextField
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              inputProps={{ 'data-testid': 'email-input' }}
            />
            <FormControlLabel
              control={
                <Checkbox 
                  name="subscription"
                  checked={formData.subscription}
                  onChange={handleChange}
                  inputProps={{ 'data-testid': 'subscription-checkbox' }}
                />
              }
              label="Subscribe to newsletter"
            />
            <Button type="submit" data-testid="submit-button">
              Submit
            </Button>
          </form>
        );
      }
      
      renderWithTheme(<SimpleForm />);
      
      // Fill out the form
      await user.type(screen.getByTestId('name-input'), 'John Doe');
      await user.type(screen.getByTestId('email-input'), 'john@example.com');
      await user.click(screen.getByTestId('subscription-checkbox'));
      
      // Submit the form
      await user.click(screen.getByTestId('submit-button'));
      
      // Form submission handler should be called
      expect(handleSubmit).toHaveBeenCalled();
    });
    
    it('prevents submission when form has validation errors', async () => {
      const user = userEvent.setup();
      const handleSubmit = jest.fn((e) => e.preventDefault());
      
      // Form with validation
      function ValidatedForm() {
        const [formData, setFormData] = React.useState({
          name: '',
          email: ''
        });
        const [errors, setErrors] = React.useState({
          name: '',
          email: ''
        });
        
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const { name, value } = e.target;
          setFormData({
            ...formData,
            [name]: value
          });
          
          // Clear error when field is changed
          setErrors({
            ...errors,
            [name]: ''
          });
        };
        
        const validateForm = () => {
          let valid = true;
          const newErrors = { ...errors };
          
          if (!formData.name) {
            newErrors.name = 'Name is required';
            valid = false;
          }
          
          if (!formData.email) {
            newErrors.email = 'Email is required';
            valid = false;
          } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
            valid = false;
          }
          
          setErrors(newErrors);
          return valid;
        };
        
        const handleFormSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          
          if (validateForm()) {
            handleSubmit(e);
          }
        };
        
        return (
          <form onSubmit={handleFormSubmit} data-testid="validated-form">
            <TextField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
              inputProps={{ 'data-testid': 'name-input' }}
            />
            <TextField
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              inputProps={{ 'data-testid': 'email-input' }}
            />
            <Button type="submit" data-testid="submit-button">
              Submit
            </Button>
          </form>
        );
      }
      
      renderWithTheme(<ValidatedForm />);
      
      // Try to submit without filling the form
      await user.click(screen.getByTestId('submit-button'));
      
      // Validation errors should be displayed
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      
      // Form submission handler should not be called
      expect(handleSubmit).not.toHaveBeenCalled();
      
      // Fill out the name field only
      await user.type(screen.getByTestId('name-input'), 'John Doe');
      
      // Try to submit again
      await user.click(screen.getByTestId('submit-button'));
      
      // Name error should be gone, but email error should remain
      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      
      // Form submission handler should still not be called
      expect(handleSubmit).not.toHaveBeenCalled();
      
      // Fill out the email field with invalid email
      await user.type(screen.getByTestId('email-input'), 'invalid-email');
      
      // Try to submit again
      await user.click(screen.getByTestId('submit-button'));
      
      // Invalid email error should be displayed
      expect(screen.getByText('Email is invalid')).toBeInTheDocument();
      
      // Form submission handler should still not be called
      expect(handleSubmit).not.toHaveBeenCalled();
      
      // Clear and enter valid email
      await user.clear(screen.getByTestId('email-input'));
      await user.type(screen.getByTestId('email-input'), 'john@example.com');
      
      // Submit the form
      await user.click(screen.getByTestId('submit-button'));
      
      // No errors should be displayed
      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Email is invalid')).not.toBeInTheDocument();
      
      // Form submission handler should be called
      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe('Async Form Submission', () => {
    it('shows loading state during form submission', async () => {
      const user = userEvent.setup();
      
      // Mock API call with delay
      const mockSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      // Form with async submission
      function AsyncForm() {
        const [loading, setLoading] = React.useState(false);
        const [formData, setFormData] = React.useState({
          username: '',
          password: ''
        });
        
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const { name, value } = e.target;
          setFormData({
            ...formData,
            [name]: value
          });
        };
        
        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          setLoading(true);
          
          try {
            await mockSubmit(formData);
          } finally {
            setLoading(false);
          }
        };
        
        return (
          <form onSubmit={handleSubmit} data-testid="async-form">
            <TextField
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              inputProps={{ 'data-testid': 'username-input' }}
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              inputProps={{ 'data-testid': 'password-input' }}
            />
            <Button 
              type="submit" 
              disabled={loading}
              data-testid="submit-button"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </form>
        );
      }
      
      renderWithTheme(<AsyncForm />);
      
      // Fill out the form
      await user.type(screen.getByTestId('username-input'), 'johndoe');
      await user.type(screen.getByTestId('password-input'), 'password123');
      
      // Submit the form
      await user.click(screen.getByTestId('submit-button'));
      
      // Button should be disabled and show loading text
      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Submitting...');
      
      // After submission completes, button should return to normal
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
        expect(submitButton).toHaveTextContent('Submit');
      });
      
      // The submit handler should have been called with form data
      expect(mockSubmit).toHaveBeenCalledWith({
        username: 'johndoe',
        password: 'password123'
      });
    });
  });
});