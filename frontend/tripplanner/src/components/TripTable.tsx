import React from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from "@mui/material";
import { Trip } from "../types";

interface Props {
  trips: Trip[];
  onSelect: (t: Trip) => void;
  onRequestDelete: (id: number) => void;
  formatDescription?: (desc: string) => string;
}

export default function TripTable({ trips, onSelect, onRequestDelete, formatDescription }: Props) {
  const fmt = formatDescription ?? ((desc: string) => desc);

  return (
    <TableContainer component={Paper} sx={{ maxWidth: 900, mx: "auto", borderRadius: "1rem" }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><strong>City</strong></TableCell>
            <TableCell><strong>Number of Days</strong></TableCell>
            <TableCell><strong>Description</strong></TableCell>
            <TableCell><strong>Actions</strong></TableCell>
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
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
