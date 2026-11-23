/**
 * The Workshop Sort visual system. Components should consume these semantic
 * tokens instead of declaring palette values locally.
 */
export const palette = {
  workbenchSurface: '#1E242B',
  blueprintGrid: '#2A323C',
  brassAccent: '#EAB308',
  steel: '#94A3B8',
  offWhite: '#F8FAFC',
} as const;

export type PaletteColor = (typeof palette)[keyof typeof palette];
export type PaletteColorName = keyof typeof palette;

export const theme = {
  colors: palette,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 20,
    full: 9999,
  },
} as const;

export type AppTheme = typeof theme;
