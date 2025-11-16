import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, Box, Typography } from '@mui/material';
import { useLanguage, LanguageCode } from '../language/LanguageContext';

const languages = [
  { code: 'en' as LanguageCode, label: 'English', flag: 'https://flagcdn.com/w40/gb.png' },
  { code: 'es' as LanguageCode, label: 'Español', flag: 'https://flagcdn.com/w40/es.png' },
  { code: 'cs' as LanguageCode, label: 'Česky', flag: 'https://flagcdn.com/w40/cz.png' }
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const currentLang = languages.find(l => l.code === lang);

  return (
    <FormControl 
      size="small" 
      variant="outlined" 
      sx={{ 
        minWidth: 160,
        '& .MuiOutlinedInput-root': {
          borderRadius: '12px',
          fontWeight: 500,
          transition: 'all 0.2s',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          },
          '&.Mui-focused': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }
        }
      }}
    >
      <InputLabel id="language-select-label" sx={{ fontWeight: 500 }}>Language</InputLabel>
      <Select
        labelId="language-select-label"
        value={lang}
        label="Language"
        onChange={(e) => setLang(e.target.value as LanguageCode)}
        renderValue={(value) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box 
              component="img"
              src={currentLang?.flag}
              alt={currentLang?.label}
              sx={{ 
                width: 24,
                height: 16,
                objectFit: 'cover',
                borderRadius: '3px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {currentLang?.label}
            </Typography>
          </Box>
        )}
        MenuProps={{
          PaperProps: {
            sx: {
              borderRadius: '12px',
              mt: 1,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              '& .MuiMenuItem-root': {
                px: 2,
                py: 1.5,
                borderRadius: '8px',
                mx: 1,
                my: 0.5,
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  transform: 'translateX(4px)',
                },
                '&.Mui-selected': {
                  backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(144,202,249,0.16)' : 'rgba(25,118,210,0.08)',
                  '&:hover': {
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(144,202,249,0.24)' : 'rgba(25,118,210,0.12)',
                  }
                }
              }
            }
          }
        }}
      >
        {languages.map((language) => (
          <MenuItem key={language.code} value={language.code}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
              <Box 
                component="img"
                src={language.flag}
                alt={language.label}
                sx={{ 
                  width: 28,
                  height: 20,
                  objectFit: 'cover',
                  borderRadius: '3px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {language.label}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
