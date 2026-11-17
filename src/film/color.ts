export const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

export const rgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

export const blend = (a: string, b: string, t: number) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const k = Math.max(0, Math.min(1, t));
  const r = Math.round(A.r + (B.r - A.r) * k);
  const g = Math.round(A.g + (B.g - A.g) * k);
  const bb = Math.round(A.b + (B.b - A.b) * k);
  return `rgb(${r},${g},${bb})`;
};
