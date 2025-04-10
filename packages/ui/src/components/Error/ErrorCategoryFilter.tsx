import React from 'react';
import { 
  Box, Chip, Typography, Button, Select, MenuItem, FormControl,
  InputLabel, SelectChangeEvent
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ClearIcon from '@mui/icons-material/Clear';

export interface ErrorCategory {
  id: string;
  label: string;
  color: string;
  count: number;
}

interface ErrorCategoryFilterProps {
  categories: ErrorCategory[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  onClearAll?: () => void;
}

export const ErrorCategoryFilter: React.FC<ErrorCategoryFilterProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  onClearAll
}) => {
  const handleCategoryChange = (event: SelectChangeEvent<string>) => {
    const category = event.target.value;
    onCategoryChange(category === 'all' ? null : category);
  };

  const handleChipClick = (category: string) => {
    onCategoryChange(selectedCategory === category ? null : category);
  };

  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll();
    } else {
      onCategoryChange(null);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Box display="flex" alignItems="center">
          <FilterAltIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="subtitle2" color="text.secondary">
            Filter by Error Category:
          </Typography>
        </Box>
        <Button 
          size="small" 
          startIcon={<ClearIcon />} 
          onClick={handleClearAll}
          sx={{ ml: 2 }}
        >
          Clear
        </Button>
      </Box>

      {/* Mobile view: dropdown */}
      <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
        <FormControl fullWidth size="small" variant="outlined">
          <InputLabel id="category-select-label">Category</InputLabel>
          <Select
            labelId="category-select-label"
            id="category-select"
            value={selectedCategory || 'all'}
            onChange={handleCategoryChange}
            label="Category"
          >
            <MenuItem value="all">All Categories</MenuItem>
            {categories.map(category => (
              <MenuItem key={category.id} value={category.id}>
                {category.label} ({category.count})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Desktop view: chips */}
      <Box 
        sx={{ 
          display: { xs: 'none', sm: 'flex' }, 
          flexWrap: 'wrap', 
          gap: 1 
        }}
      >
        {categories.map(category => (
          <Chip
            key={category.id}
            label={`${category.label} (${category.count})`}
            onClick={() => handleChipClick(category.id)}
            color={selectedCategory === category.id ? 'primary' : 'default'}
            variant={selectedCategory === category.id ? 'filled' : 'outlined'}
            sx={{
              '& .MuiChip-label': { fontWeight: selectedCategory === category.id ? 'bold' : 'normal' },
              borderColor: category.color,
              ...(selectedCategory === category.id && { bgcolor: category.color, color: 'white' })
            }}
          />
        ))}
      </Box>
    </Box>
  );
};
