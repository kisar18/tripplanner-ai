import React from 'react';

export type ColorMode = 'light' | 'dark';

export interface ColorModeContextType {
  mode: ColorMode;
  toggleColorMode: () => void;
}

export const ColorModeContext = React.createContext<ColorModeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
});
