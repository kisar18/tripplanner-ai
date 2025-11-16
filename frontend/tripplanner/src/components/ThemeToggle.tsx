import React, { useContext } from 'react';
import { Box, FormControlLabel, Switch, Tooltip } from '@mui/material';
import { ColorModeContext } from '../theme/ColorModeContext';

export default function ThemeToggle() {
  const { mode, toggleColorMode } = useContext(ColorModeContext);
  const checked = mode === 'dark';
  return (
    <Box sx={{ position: 'fixed', top: 8, right: 12, zIndex: 1500 }}>
      <Tooltip title={checked ? 'Switch to light mode' : 'Switch to dark mode'}>
        <FormControlLabel
          control={<Switch size="small" checked={checked} onChange={toggleColorMode} />}
          label={checked ? 'Dark' : 'Light'}
        />
      </Tooltip>
    </Box>
  );
}
