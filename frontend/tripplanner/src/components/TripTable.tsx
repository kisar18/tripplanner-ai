import React from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from "@mui/material";
import { useTheme } from '@mui/material/styles';
import { useLanguage } from "../language/LanguageContext";
import { t } from "../language/i18n";
import { Trip } from "../types";

interface Props {
  trips: Trip[];
  onSelect: (t: Trip) => void;
  onRequestDelete: (id: number) => void;
  formatDescription?: (desc: string) => string;
}

export default function TripTable({ trips, onSelect, onRequestDelete, formatDescription }: Props) {
  const { lang } = useLanguage();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const fmt = formatDescription ?? ((desc: string) => desc);

  return (
    <TableContainer component={Paper} sx={{
      maxWidth: 1100,
      mx: 'auto',
      borderRadius: '2rem',
      overflow: 'hidden',
      backdropFilter: 'blur(16px)',
      background: isLight
        ? 'linear-gradient(165deg, rgba(255,255,255,0.95), rgba(248,250,252,0.85))'
        : 'linear-gradient(165deg, rgba(8,12,24,0.95), rgba(5,9,16,0.9))',
      boxShadow: isLight
        ? '0 20px 60px rgba(0,0,0,0.08), 0 0 0 1px rgba(99,102,241,0.1)'
        : '0 25px 70px rgba(0,0,0,0.7), 0 0 0 1px rgba(125,211,252,0.16)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        boxShadow: isLight
          ? '0 25px 70px rgba(0,0,0,0.12), 0 0 0 1px rgba(99,102,241,0.2)'
          : '0 30px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(139,92,246,0.35)'
      }
    }}>
      <Table>
        <TableHead>
          <TableRow sx={{
            background: isLight
              ? 'linear-gradient(120deg, #2563eb 0%, #8b5cf6 60%, #ec4899 100%)'
              : 'linear-gradient(120deg, rgba(14,165,233,0.22) 0%, rgba(124,58,237,0.28) 55%, rgba(236,72,153,0.3) 100%)',
            backdropFilter: 'blur(12px)',
            '& th': {
              color: isLight ? '#f8fafc' : '#e5edf7',
              fontWeight: 800,
              fontSize: '1.05rem',
              letterSpacing: '0.6px',
              py: 2.6,
              textTransform: 'uppercase',
              borderBottom: 'none',
              position: 'relative',
              overflow: 'hidden'
            },
            '& th:after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
              opacity: isLight ? 0.28 : 0.18,
              pointerEvents: 'none',
              mixBlendMode: 'screen'
            }
          }}>
            <TableCell>{t(lang,'city')}</TableCell>
            <TableCell>{t(lang,'numberOfDays')}</TableCell>
            <TableCell>{t(lang,'description')}</TableCell>
            <TableCell>{t(lang,'actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody sx={{
          '& tr:last-child td': { borderBottom: 'none' }
        }}>
          {trips.map((trip, idx) => (
            <TableRow
              key={trip.id}
              hover
              onClick={() => onSelect(trip)}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: isLight
                  ? (idx % 2 === 0 ? 'rgba(255,255,255,0.4)' : 'rgba(248,250,252,0.5)')
                  : (idx % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)'),
                '&:hover': {
                  background: isLight
                    ? 'linear-gradient(90deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))'
                    : 'linear-gradient(90deg, rgba(14,165,233,0.18), rgba(124,58,237,0.16))',
                  transform: 'translateX(8px) scale(1.01)',
                  boxShadow: isLight
                    ? 'inset 4px 0 0 0 #6366f1'
                    : 'inset 4px 0 0 0 #38bdf8'
                },
                '& td': {
                  py: 2.5,
                  borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'
                }
              }}
            >
              <TableCell sx={{
                fontWeight: 700,
                fontSize: '1.05rem',
                color: isLight ? '#1e293b' : '#fff',
                letterSpacing: '0.3px'
              }}>
                {trip.city}
              </TableCell>
              <TableCell sx={{
                fontWeight: 600,
                color: isLight ? '#475569' : 'rgba(255,255,255,0.85)',
                fontSize: '0.95rem'
              }}>
                {trip.days}
              </TableCell>
              <TableCell sx={{
                maxWidth: 380,
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                color: isLight ? '#64748b' : 'rgba(255,255,255,0.75)',
                fontStyle: 'italic'
              }}>
                {fmt(trip.description)}
              </TableCell>
              <TableCell>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestDelete(trip.id);
                  }}
                  sx={{
                    fontWeight: 700,
                    borderRadius: '1rem',
                    px: 2.5,
                    py: 0.8,
                    textTransform: 'uppercase',
                    fontSize: '0.8rem',
                    letterSpacing: '0.5px',
                    borderWidth: '2px',
                    transition: 'all 0.25s',
                    '&:hover': {
                      borderWidth: '2px',
                      transform: 'scale(1.05)',
                      boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
                    }
                  }}
                >
                  {t(lang,'delete')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
