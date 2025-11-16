import React, { useContext } from 'react';
import { Box, FormControlLabel, Switch, Tooltip } from '@mui/material';
import { ColorModeContext } from '../theme/ColorModeContext';
import { useLanguage } from '../language/LanguageContext';
import { t } from '../language/i18n';

export default function ThemeToggle({ inline = false }: { inline?: boolean }) {
  const { mode, toggleColorMode } = useContext(ColorModeContext);
  const { lang } = useLanguage();
  const checked = mode === 'dark';
  return (
    <Tooltip title={checked ? `Switch to ${t(lang, 'light')} mode` : `Switch to ${t(lang, 'dark')} mode`}>
      <FormControlLabel
        control={<Switch size="small" checked={checked} onChange={toggleColorMode} />}
        label={checked ? t(lang, 'dark') : t(lang, 'light')}
        sx={{ ml: 1 }}
      />
    </Tooltip>
  );
}
