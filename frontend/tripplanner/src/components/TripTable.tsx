import React from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from "@mui/material";
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
  const fmt = formatDescription ?? ((desc: string) => desc);

  return (
    <TableContainer component={Paper} sx={{ maxWidth: 900, mx: "auto", borderRadius: "1rem" }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><strong>{t(lang,'city')}</strong></TableCell>
            <TableCell><strong>{t(lang,'numberOfDays')}</strong></TableCell>
            <TableCell><strong>{t(lang,'description')}</strong></TableCell>
            <TableCell><strong>{t(lang,'actions')}</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {trips.map((trip) => (
            <TableRow key={trip.id} hover onClick={() => onSelect(trip)} sx={{ cursor: "pointer" }}>
              <TableCell>{trip.city}</TableCell>
              <TableCell>{trip.days}</TableCell>
              <TableCell>{fmt(trip.description)}</TableCell>
              <TableCell>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestDelete(trip.id);
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
