import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface PageContainerProps {
  children: React.ReactNode;
  padTop?: number | string;
  image?: boolean; // when true use full photo background (homepage)
}

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ children, padTop, image }, ref) => {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const scenicUrl = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=60';
    return (
      <Box
        ref={ref}
        sx={{
          minHeight: 'calc(100vh - 64px)',
          position: 'relative',
          pt: padTop || 8,
          pb: 8,
          px: { xs: 2, md: 4 },
          display: 'flex',
          flexDirection: 'column',
          color: isLight ? '#1e293b' : 'white',
          transition: 'background 0.6s ease',
          ...(image ? {
            backgroundImage: `url(${scenicUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {
            background: isLight
              ? 'linear-gradient(135deg,#f8fafc 0%,#e9eef5 45%,#dfe6f0 70%)'
              : 'radial-gradient(circle at 15% 20%, rgba(125,211,252,0.16), transparent 32%), radial-gradient(circle at 85% 10%, rgba(244,114,182,0.14), transparent 30%), linear-gradient(135deg,#050910 0%,#0c1424 55%,#050910 100%)',
            '&:before': isLight ? {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 30% 20%, rgba(99,102,241,0.25), transparent 60%), radial-gradient(circle at 70% 60%, rgba(139,92,246,0.25), transparent 65%)',
              opacity: 0.45,
              pointerEvents: 'none'
            } : undefined
          }),
          '&:after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/noise.png)',
            opacity: 0.06,
            pointerEvents: 'none'
          }
        }}
      >
        <Box sx={{ position: 'relative', flex: 1 }}>
          {children}
        </Box>
      </Box>
    );
  }
);

export default PageContainer;
