export const W = 1920;
export const H = 1080;
export const FPS = 30;

export const FONT = 'Poppins, "DejaVu Sans", sans-serif';

export const COL = {
  bg0: '#04060C',
  bg1: '#0A0F1B',
  ink: '#F2F6FF',
  dim: '#96A4BF',
  faint: '#5B6880',
  pos: '#3BE0A6',
  neg: '#FF6A88',
  carry: '#FFC55C',
  accent: '#7E9BFF',
  line: 'rgba(150,175,230,0.13)',
};

export type ToneName = 'neutral' | 'pos' | 'neg' | 'carry' | 'accent';

export const TONE: Record<ToneName, { main: string; soft: string; glow: string }> = {
  neutral: { main: '#E4ECFF', soft: 'rgba(200,215,245,0.16)', glow: 'rgba(150,180,255,0.32)' },
  pos: { main: COL.pos, soft: 'rgba(59,224,166,0.16)', glow: 'rgba(59,224,166,0.40)' },
  neg: { main: COL.neg, soft: 'rgba(255,106,136,0.16)', glow: 'rgba(255,106,136,0.40)' },
  carry: { main: COL.carry, soft: 'rgba(255,197,92,0.16)', glow: 'rgba(255,197,92,0.40)' },
  accent: { main: COL.accent, soft: 'rgba(126,155,255,0.16)', glow: 'rgba(126,155,255,0.42)' },
};
