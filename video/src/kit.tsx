// Shared look and motion helpers for the ad (brand D-044: pastel mint on deep green).
import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';

export const { fontFamily } = loadFont('normal', { weights: ['400', '500', '600', '700', '800'], subsets: ['latin', 'latin-ext'] });

export const C = {
  bg0: '#04140E',
  bg1: '#0B2A1F',
  bg2: '#123B2C',
  mint: '#B5E8D3',
  mintSoft: 'rgba(181,232,211,0.14)',
  mintLine: 'rgba(181,232,211,0.35)',
  mintDeep: '#3A725E',
  ink: '#123B2C',
  white: '#FFFFFF',
  dim: 'rgba(230,246,239,0.62)',
  coral: '#FF8A7A',
};

/** Layout unit: 1u = 1px at 1080 on the short side, so both formats share one design. */
export function useLayout() {
  const { width, height, fps } = useVideoConfig();
  const portrait = height > width;
  const u = Math.min(width, height) / 1080;
  return { width, height, fps, portrait, u };
}

export const ease = Easing.bezier(0.22, 1, 0.36, 1); // fast start, gentle stop
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

export function pop(frame: number, fps: number, delay = 0, damping = 12) {
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 170, mass: 0.7 } });
}

export function fade(frame: number, from: number, to: number) {
  return interpolate(frame, [from, to], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
}

/** Scene wrapper: quick scale+fade in and out, like UI screens changing. */
export const Scene: React.FC<{ dur: number; children: React.ReactNode; inFrames?: number; outFrames?: number }> = ({ dur, children, inFrames = 9, outFrames = 8 }) => {
  const f = useCurrentFrame();
  const a = Math.min(fade(f, 0, inFrames), 1 - fade(f, dur - outFrames, dur));
  const push = interpolate(f, [0, dur], [1, 1.035]); // slow camera push-in
  const s = push * interpolate(f, [0, inFrames], [1.04, 1], { extrapolateRight: 'clamp', easing: ease }) *
    interpolate(f, [dur - outFrames, dur], [1, 0.97], { extrapolateLeft: 'clamp', easing: easeInOut });
  return <AbsoluteFill style={{ opacity: a, transform: `scale(${s})` }}>{children}</AbsoluteFill>;
};

export const Sfx: React.FC<{ at: number; src: string; volume?: number }> = ({ at, src, volume = 0.5 }) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={90} layout="none">
    <Audio src={staticFile(`sfx/${src}.wav`)} volume={volume} />
  </Sequence>
);

/** Deep green backdrop with a drifting dot grid and two soft glows (the skill-tree canvas). */
export const Backdrop: React.FC<{ glow?: number }> = ({ glow = 1 }) => {
  const f = useCurrentFrame();
  const { width, height, u } = useLayout();
  const grid = 46 * u;
  const g1x = width * (0.3 + 0.08 * Math.sin(f / 70));
  const g1y = height * (0.35 + 0.06 * Math.cos(f / 90));
  const g2x = width * (0.72 + 0.07 * Math.cos(f / 80));
  const g2y = height * (0.68 + 0.05 * Math.sin(f / 60));
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 40%, ${C.bg1} 0%, ${C.bg0} 70%)` }}>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, rgba(181,232,211,0.13) ${1.6 * u}px, transparent ${1.9 * u}px)`,
          backgroundSize: `${grid}px ${grid}px`,
          backgroundPosition: `${(f * 0.25 * u) % grid}px ${(f * 0.15 * u) % grid}px`,
          maskImage: 'radial-gradient(70% 70% at 50% 50%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(70% 70% at 50% 50%, black 30%, transparent 100%)',
        }}
      />
      <div style={{ position: 'absolute', left: g1x - 450 * u, top: g1y - 450 * u, width: 900 * u, height: 900 * u, borderRadius: '50%', background: `radial-gradient(circle, rgba(58,114,94,${0.55 * glow}) 0%, transparent 65%)` }} />
      <div style={{ position: 'absolute', left: g2x - 380 * u, top: g2y - 380 * u, width: 760 * u, height: 760 * u, borderRadius: '50%', background: `radial-gradient(circle, rgba(181,232,211,${0.16 * glow}) 0%, transparent 65%)` }} />
      <AbsoluteFill style={{ background: 'radial-gradient(100% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)' }} />
    </AbsoluteFill>
  );
};

export const Logo: React.FC<{ size: number; variant?: 'pastel' | 'ink' }> = ({ size, variant = 'pastel' }) => (
  <Img src={staticFile(`brand/logo-${variant}.png`)} style={{ width: size, height: size * (521 / 795), objectFit: 'contain' }} />
);

export const BankTile: React.FC<{ bank: string; size: number }> = ({ bank, size }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.26, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
    <Img src={staticFile(`banks/${bank}.png`)} style={{ width: size * 0.7, height: size * 0.7, objectFit: 'contain' }} />
  </div>
);

/** Phone-style notification banner (the "notification pop" micro-interaction). */
export const Notification: React.FC<{ title: string; body: string; icon?: string; bank?: string; width: number; tone?: 'mint' | 'warn' }> = ({ title, body, bank, width, tone = 'mint' }) => {
  const { u } = useLayout();
  return (
    <div style={{
      width, padding: `${22 * u}px ${26 * u}px`, borderRadius: 30 * u, display: 'flex', gap: 20 * u, alignItems: 'center',
      background: 'rgba(245,252,249,0.94)', boxShadow: `0 ${20 * u}px ${50 * u}px rgba(0,0,0,0.35)`, fontFamily,
    }}>
      {bank ? <BankTile bank={bank} size={72 * u} /> : (
        <div style={{ width: 72 * u, height: 72 * u, borderRadius: 20 * u, background: C.mint, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Logo size={58 * u} variant="ink" />
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 25 * u, fontWeight: 700, color: tone === 'warn' ? '#9A2B1E' : C.ink, letterSpacing: -0.2 * u }}>{title}</div>
        <div style={{ fontSize: 25 * u, fontWeight: 500, color: '#38433E', marginTop: 4 * u, lineHeight: 1.25 }}>{body}</div>
      </div>
    </div>
  );
};

export const Pill: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => {
  const { u } = useLayout();
  return (
    <div style={{
      display: 'inline-block', padding: `${10 * u}px ${22 * u}px`, borderRadius: 999, fontFamily, fontWeight: 700,
      fontSize: 22 * u, letterSpacing: 3 * u, textTransform: 'uppercase',
      background: dark ? C.ink : C.mintSoft, color: C.mint, border: `${1.5 * u}px solid ${C.mintLine}`,
    }}>{children}</div>
  );
};

/** Romanian grouping like the app: 3515 -> "3.515". */
export const lei = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
