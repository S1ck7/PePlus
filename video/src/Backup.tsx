// T40: silent backup of the stage demo (docs/presentation-script.md 0:45-2:30), framed for a 16:9 projector.
// The recording is real (web build of the app, see backup/record.mjs); this only adds the frame and captions.
import React from 'react';
import { AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Backdrop, C, Logo, fade, fontFamily, useLayout } from './kit';

export const BACKUP_SECONDS = 105.8;
const STAGE_OFFSET = 45; // the demo starts at 0:45 in the pitch

const PHASES = [
  { from: 0, to: 20, tag: 'Date de intrare', title: 'Conectează băncile, răspunde la o întrebare', note: 'Open banking doar pentru citire (PSD2), simulat în prototip.' },
  { from: 20, to: 45, tag: 'Procesare', title: '358.600 lei datorii · 600 lei rămași pe lună', note: 'Ratele sunt 38% din venit, sub limita BNR de 40%.' },
  { from: 45, to: 65, tag: 'Rezultat', title: 'Plătește întâi: +600 lei pe cardul BCR', note: 'Costă cel mai mult: 25,7% pe an, cu dobânzi și comisioane.' },
  { from: 65, to: 90, tag: 'Rezultat', title: 'Refinanțare: economisești 3.515 lei', note: 'Creditul ING → Raiffeisen Bank, 6,25% fix, probabil eligibil.' },
  { from: 90, to: 106, tag: 'Ce înseamnă', title: 'Fără datorii în feb. 2035, nu în iun. 2054', note: 'Păstrând rata de azi: fiecare rată achitată trece la următoarea datorie.' },
];

export const Backup: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height, fps, u } = useLayout();
  const sec = f / fps;
  const screenH = height - 120 * u;
  const screenW = screenH * (1080 / 2340);
  const pad = 14 * u;
  const stage = STAGE_OFFSET + sec;
  const clock = `${Math.floor(stage / 60)}:${String(Math.floor(stage % 60)).padStart(2, '0')}`;
  const phoneLeft = width * 0.58 - screenW / 2;
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Backdrop glow={0.7} />
      <div style={{ position: 'absolute', left: phoneLeft - pad, top: (height - screenH) / 2 - pad, padding: pad, borderRadius: 64 * u, background: 'linear-gradient(145deg, #2C3833 0%, #101714 45%, #1E2925 100%)', boxShadow: `0 ${40 * u}px ${90 * u}px rgba(0,0,0,0.5), inset 0 0 0 ${2 * u}px rgba(255,255,255,0.12)` }}>
        <div style={{ width: screenW, height: screenH, borderRadius: 52 * u, overflow: 'hidden', background: '#F6F5F7' }}>
          <OffthreadVideo src={staticFile('backup/screen.mp4')} muted style={{ width: screenW, height: screenH }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 90 * u, top: 80 * u, display: 'flex', alignItems: 'center', gap: 18 * u }}>
        <div style={{ width: 70 * u, height: 70 * u, borderRadius: 20 * u, background: C.mint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Logo size={56 * u} variant="ink" /></div>
        <div style={{ color: C.white, fontSize: 40 * u, fontWeight: 800, letterSpacing: -1 * u }}>PePlus</div>
        <div style={{ color: C.dim, fontSize: 24 * u, fontWeight: 600, marginLeft: 8 * u }}>Demo live · Radu, profil demo</div>
      </div>
      {PHASES.map((p, i) => {
        const a = Math.min(fade(sec * fps, p.from * fps, p.from * fps + 12), 1 - fade(sec * fps, p.to * fps - 10, p.to * fps));
        if (a <= 0) return null;
        const y = interpolate(a, [0, 1], [24, 0]) * u;
        return (
          <div key={i} style={{ position: 'absolute', left: 90 * u, top: height / 2 - 150 * u, width: phoneLeft - 170 * u, opacity: a, transform: `translateY(${y}px)` }}>
            <div style={{ display: 'inline-block', padding: `${8 * u}px ${18 * u}px`, borderRadius: 999, background: C.mintSoft, border: `${1.5 * u}px solid ${C.mintLine}`, color: C.mint, fontSize: 20 * u, fontWeight: 700, letterSpacing: 3 * u, textTransform: 'uppercase' }}>{`${['1', '2', '3', '3', '4'][i]} · ${p.tag}`}</div>
            <div style={{ color: C.white, fontSize: 54 * u, fontWeight: 800, letterSpacing: -1.5 * u, lineHeight: 1.08, marginTop: 22 * u }}>{p.title}</div>
            <div style={{ color: C.dim, fontSize: 28 * u, fontWeight: 500, lineHeight: 1.35, marginTop: 18 * u }}>{p.note}</div>
          </div>
        );
      })}
      {/* Stage clock + progress, so the presenter can stay in sync with the script. */}
      <div style={{ position: 'absolute', left: 90 * u, bottom: 70 * u, width: phoneLeft - 170 * u }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: C.dim, fontSize: 22 * u, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          <span>Timp pe scenă {clock}</span><span>0:45 → 2:30</span>
        </div>
        <div style={{ height: 6 * u, borderRadius: 99, background: 'rgba(181,232,211,0.15)', marginTop: 12 * u, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, (sec / BACKUP_SECONDS) * 100)}%`, height: '100%', background: C.mint }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
