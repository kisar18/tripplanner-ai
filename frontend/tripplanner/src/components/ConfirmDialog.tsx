import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";
import { useLanguage } from "../language/LanguageContext";
import { t } from "../language/i18n";

interface Props {
  open: boolean;
  title?: string;
  content?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({ open, title = "Confirm", content = "Are you sure?", onCancel, onConfirm }: Props) {
  const { lang } = useLanguage();
  return (
    <Dialog open={open} onClose={onCancel} aria-labelledby="confirm-dialog-title">
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{content}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t(lang,'cancel')}</Button>
        <Button color="error" onClick={onConfirm} autoFocus>
          {t(lang,'delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
