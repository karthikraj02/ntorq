export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textDim: string;
  textFaint: string;
  accent: string;
  onAccent: string;
  ok: string;
  info: string;
  warn: string;
  caution: string;
  danger: string;
  /** Marks simulated data so it can never be mistaken for the real vehicle. */
  mock: string;
}

export const darkPalette: Palette = {
  background: '#0A0D12',
  surface: '#121821',
  surfaceAlt: '#1A222E',
  border: '#243042',
  text: '#EAF0F7',
  textDim: '#9AA7BB',
  textFaint: '#667589',
  accent: '#3DDC97',
  onAccent: '#04110B',
  ok: '#3DDC97',
  info: '#4DA3FF',
  warn: '#F6B73C',
  caution: '#FF8A3D',
  danger: '#FF5D5D',
  mock: '#B48CFF',
};

export const lightPalette: Palette = {
  background: '#F2F5F9',
  surface: '#FFFFFF',
  surfaceAlt: '#E9EEF4',
  border: '#D3DBE6',
  text: '#101826',
  textDim: '#516078',
  textFaint: '#8190A6',
  accent: '#0A9B67',
  onAccent: '#FFFFFF',
  ok: '#0A9B67',
  info: '#1E6FD0',
  warn: '#A96F00',
  caution: '#C25A12',
  danger: '#D03535',
  mock: '#7447D0',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;

export type TextVariant =
  | 'display'
  | 'displaySm'
  | 'brand'
  | 'metric'
  | 'metricSm'
  | 'title'
  | 'heading'
  | 'body'
  | 'caption'
  | 'label';

export const typography: Record<
  TextVariant,
  {
    fontSize: number;
    lineHeight: number;
    fontWeight: '400' | '500' | '600' | '700' | '800';
    letterSpacing?: number;
    textTransform?: 'uppercase';
    tabular?: boolean;
  }
> = {
  display: { fontSize: 64, lineHeight: 68, fontWeight: '800', tabular: true },
  displaySm: { fontSize: 52, lineHeight: 58, fontWeight: '800', tabular: true },
  brand: { fontSize: 38, lineHeight: 44, fontWeight: '800', letterSpacing: 1 },
  metric: { fontSize: 30, lineHeight: 36, fontWeight: '700', tabular: true },
  metricSm: { fontSize: 22, lineHeight: 28, fontWeight: '700', tabular: true },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
};

export type Tone =
  | 'default'
  | 'dim'
  | 'faint'
  | 'accent'
  | 'onAccent'
  | 'ok'
  | 'info'
  | 'warn'
  | 'caution'
  | 'danger'
  | 'mock';

export function toneColor(palette: Palette, tone: Tone): string {
  switch (tone) {
    case 'default':
      return palette.text;
    case 'dim':
      return palette.textDim;
    case 'faint':
      return palette.textFaint;
    default:
      return palette[tone];
  }
}

/** Adds an alpha channel (0-1) to a #RRGGBB colour. */
export function withAlpha(hex: string, alpha: number): string {
  const channel = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${channel}`;
}
