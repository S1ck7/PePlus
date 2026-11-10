import React from 'react';
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import timeline from './timeline.json';
import words from './words.json';
import { BankTile, Backdrop, C, Logo, Notification, Pill, Scene, Sfx, ease, easeInOut, fade, fontFamily, lei, pop, useLayout } from './kit';

export type Voice = keyof typeof timeline;
export const FPS = 30;

/** Frame marks from the voice timeline: S[i] = line i starts, E[i] = line i ends. */
export function marks(voice: Voice) {
  const t = timeline[voice];
  const S = t.lines.map(l => Math.round(l.start * FPS));
  const E = t.lines.map(l => Math.round((l.start + l.dur) * FPS));
  return { S, E, total: Math.round(t.total * FPS), lines: t.lines };
}

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
// Frames in video/backup's recording (30 fps): Pay less is settled at 70.4 s; the 20-second ad starts 71.4 s, the refinance tap is at 72.2 s.
const REC_PAYLESS = Math.round(71.4 * 30);
const REC_TAP = Math.round((72.2 - 71.4) * 30);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

// ---------- Scene 1+2: the map (chaos -> hub -> branches -> real cost) ----------

const DEBTS = [
  { bank: 'bt', type: 'Credit ipotecar', amount: 310000 },
  { bank: 'ing', type: 'Nevoi personale', amount: 36000 },
  { bank: 'bcr', type: 'Card de credit', amount: 8500 },
  { bank: 'credius', type: 'Credit IFN', amount: 3200 },
  { bank: 'mokka', type: 'Rate BNPL', amount: 900 },
];
const CHAOS_LAND = [[-560, -250], [-20, -310], [-250, 70], [470, 190], [-590, 330]];
const CHAOS_PORT = [[-150, -360], [150, -130], [-170, 100], [140, 330], [-110, 560]];
const NOTES = [
  { bank: 'ing', title: 'ING Bank', body: 'Rata scadentă în 2 zile: 1.085 lei' },
  { bank: 'bcr', title: 'BCR', body: 'Plata minimă pe card: 450 lei' },
  { bank: 'bt', title: 'Banca Transilvania', body: 'Dobânda ipotecii s-a schimbat (IRCC)' },
];
const NODES = [
  { id: 'cost', label: 'Cost real', sub: 'dobânzi + comisioane' },
  { id: 'first', label: 'Plătește întâi', sub: 'ordinea' },
  { id: 'less', label: 'Plătește mai puțin', sub: 'refinanțare' },
  { id: 'goal', label: 'Obiectiv', sub: 'ziua fără datorii' },
];
const NODE_LAND = [[-560, -250], [560, -250], [560, 250], [-560, 250]];
const NODE_PORT = [[-245, -500], [245, -500], [245, 500], [-245, 500]];

const Icon: React.FC<{ id: string; size: number; color: string }> = ({ id, size, color }) => {
  const p = { fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {id === 'cost' && (<><circle cx="12" cy="12" r="8.5" {...p} /><path d="M12 7v10M9.2 9.6c0-1.2 1.2-2 2.8-2s2.8.8 2.8 2-1.2 1.7-2.8 2.1-2.8 1-2.8 2.2 1.2 2.1 2.8 2.1 2.8-.8 2.8-2" {...p} /></>)}
      {id === 'first' && (<><path d="M5 19h14M12 15V5M7.5 9.5 12 5l4.5 4.5" {...p} /></>)}
      {id === 'less' && (<><path d="M4 9.5 12 5l8 4.5M5.5 10v7M10 10v7M14 10v7M18.5 10v7M4 19.5h16" {...p} /></>)}
      {id === 'goal' && (<><circle cx="12" cy="12" r="8.5" {...p} /><circle cx="12" cy="12" r="4.5" {...p} /><circle cx="12" cy="12" r="1" {...p} /></>)}
    </svg>
  );
};

const DebtCard: React.FC<{ d: typeof DEBTS[number]; u: number }> = ({ d, u }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 20 * u, padding: `${20 * u}px ${28 * u}px ${20 * u}px ${20 * u}px`, borderRadius: 30 * u,
    background: 'rgba(255,255,255,0.07)', border: `${1.5 * u}px solid rgba(181,232,211,0.22)`, boxShadow: `0 ${16 * u}px ${40 * u}px rgba(0,0,0,0.35)`,
    fontFamily, whiteSpace: 'nowrap',
  }}>
    <BankTile bank={d.bank} size={76 * u} />
    <div>
      <div style={{ color: C.dim, fontSize: 24 * u, fontWeight: 600 }}>{d.type}</div>
      <div style={{ color: C.white, fontSize: 38 * u, fontWeight: 800, letterSpacing: -0.5 * u }}>{lei(d.amount)} lei</div>
    </div>
    <div style={{ width: 16 * u, height: 16 * u, borderRadius: 99, background: C.coral, marginLeft: 6 * u, alignSelf: 'flex-start', boxShadow: `0 0 ${14 * u}px ${C.coral}` }} />
  </div>
);

const MapScene: React.FC<{ hubAt: number; branchAt: number; costAt: number; dur: number; captions?: boolean }> = ({ hubAt, branchAt, costAt, dur, captions }) => {
  const f = useCurrentFrame();
  const { width, height, fps, portrait, u } = useLayout();
  const cx = width / 2, cy = height / 2;
  const chaos = portrait ? CHAOS_PORT : CHAOS_LAND;
  const nodes = portrait ? NODE_PORT : NODE_LAND;

  // Exit: zoom into the "Pay first" node.
  const zoomP = interpolate(f, [dur - 12, dur], [0, 1], { ...clamp, easing: easeInOut });
  const zx = cx + nodes[1][0] * u, zy = cy + nodes[1][1] * u;

  // Cards gather into the hub when line 2 starts.
  const gather = interpolate(f, [hubAt - 8, hubAt + 14], [0, 1], { ...clamp, easing: easeInOut });
  const hub = pop(f, fps, hubAt + 8, 10);
  const textOne = Math.min(fade(f, hubAt + 14, hubAt + 24), 1 - fade(f, branchAt - 2, branchAt + 6));
  const kicker = captions ? 0 : Math.min(fade(f, 52, 64), 1 - fade(f, hubAt - 10, hubAt));

  return (
    <AbsoluteFill style={{ transform: `scale(${1 + zoomP * 0.9})`, transformOrigin: `${zx}px ${zy}px`, opacity: 1 - zoomP * 0.6 }}>
      {/* Branch lines with a light dot travelling along each one. */}
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
        {nodes.map(([nx, ny], i) => {
          const p = interpolate(f, [branchAt + i * 4, branchAt + i * 4 + 14], [0, 1], { ...clamp, easing: ease });
          const x2 = cx + nx * u, y2 = cy + ny * u;
          const qx = lerp(cx, x2, 0.5) + (portrait ? nx * 0.35 : 0) * u, qy = lerp(cy, y2, 0.5) - (portrait ? 0 : ny * 0.45) * u;
          const t = ((f - branchAt - 18 - i * 7) / 40) % 1;
          const dotT = f > branchAt + 18 ? (t < 0 ? 0 : t) : -1;
          const bx = (1 - dotT) ** 2 * cx + 2 * (1 - dotT) * dotT * qx + dotT ** 2 * x2;
          const by = (1 - dotT) ** 2 * cy + 2 * (1 - dotT) * dotT * qy + dotT ** 2 * y2;
          const hl = i === 0 ? fade(f, costAt, costAt + 8) : 0;
          return (
            <g key={i}>
              <path d={`M ${cx} ${cy} Q ${qx} ${qy} ${x2} ${y2}`} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p}
                fill="none" stroke={hl > 0 ? C.mint : C.mintLine} strokeWidth={(3 + hl * 2) * u} strokeLinecap="round" />
              {dotT >= 0 && <circle cx={bx} cy={by} r={7 * u} fill={C.mint} opacity={0.9} style={{ filter: `drop-shadow(0 0 ${8 * u}px ${C.mint})` }} />}
            </g>
          );
        })}
      </svg>

      {/* Debt cards: pop in one by one, jitter (chaos), then fly into the hub. */}
      {DEBTS.map((d, i) => {
        const inP = pop(f, fps, 6 + i * 7, 11);
        const [x0, y0] = chaos[i];
        const jx = Math.sin(f / 9 + i * 2) * 6 * u * (1 - gather), jy = Math.cos(f / 11 + i) * 6 * u * (1 - gather);
        const rot = Math.sin(f / 13 + i * 3) * 2.5 * (1 - gather) + (i % 2 ? 4 : -4) * (1 - gather);
        const x = lerp(cx + x0 * u, cx, gather) + jx, y = lerp(cy + y0 * u, cy, gather) + jy;
        return (
          <div key={d.bank} style={{
            position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${inP * lerp(portrait ? 1.3 : 1.2, 0.15, gather)})`,
            opacity: 1 - interpolate(gather, [0.7, 1], [0, 1], clamp),
          }}>
            <DebtCard d={d} u={u} />
          </div>
        );
      })}

      {/* Notification stack (newest on top pushes the others down). */}
      {NOTES.map((n, i) => {
        const at = 30 + i * 22;
        const inP = pop(f, fps, at, 13);
        const pushed = NOTES.slice(i + 1).reduce((acc, _, k) => acc + pop(f, fps, 30 + (i + 1 + k) * 22, 14), 0);
        const out = fade(f, hubAt - 10, hubAt);
        const w = (portrait ? 760 : 640) * u;
        const x = portrait ? cx - w / 2 : width - w - 70 * u;
        const y = (portrait ? 70 : 50) * u + pushed * 130 * u;
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, opacity: inP * (1 - out), transform: `translateY(${(1 - inP) * -40 * u}px) scale(${0.9 + 0.1 * inP})` }}>
            <Notification bank={n.bank} title={n.title} body={n.body} width={w} />
          </div>
        );
      })}

      {/* Kicker for line 1. */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: portrait ? height - 250 * u : height - 170 * u, textAlign: 'center', opacity: kicker, fontFamily }}>
        <span style={{ color: C.white, fontSize: (portrait ? 64 : 58) * u, fontWeight: 800, letterSpacing: -1 * u }}>5 credite · 5 bănci · </span>
        <span style={{ color: C.coral, fontSize: (portrait ? 64 : 58) * u, fontWeight: 800, letterSpacing: -1 * u }}>care te costă?</span>
      </div>

      {/* Hub: the PePlus mark with pulsing rings. */}
      {[0, 1, 2].map(k => {
        const rp = ((f - hubAt - 8 - k * 14) / 45);
        if (rp < 0) return null;
        const r = (rp % 1);
        return <div key={k} style={{ position: 'absolute', left: cx, top: cy, width: 300 * u, height: 300 * u, borderRadius: '50%', border: `${2 * u}px solid ${C.mint}`, transform: `translate(-50%,-50%) scale(${1 + r * 1.3})`, opacity: (1 - r) * 0.45 }} />;
      })}
      <div style={{
        position: 'absolute', left: cx, top: cy, width: 300 * u, height: 300 * u, borderRadius: '50%', transform: `translate(-50%,-50%) scale(${hub})`,
        background: `radial-gradient(circle at 35% 30%, #D6F5E8 0%, ${C.mint} 55%, #8FD3B8 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 ${90 * u}px rgba(181,232,211,0.45), inset 0 ${-10 * u}px ${30 * u}px rgba(18,59,44,0.18)`,
      }}>
        <Logo size={210 * u} variant="ink" />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: cy + 200 * u, textAlign: 'center', opacity: textOne, fontFamily, color: C.white, fontSize: 60 * u, fontWeight: 800, letterSpacing: -1 * u }}>
        Toate datoriile, într-un loc.
      </div>

      {/* Feature nodes. */}
      {NODES.map((n, i) => {
        const s = pop(f, fps, branchAt + i * 4 + 10, 11);
        const hl = i === 0 ? fade(f, costAt, costAt + 8) : 0;
        const [nx, ny] = nodes[i];
        return (
          <div key={n.id} style={{
            position: 'absolute', left: cx + nx * u, top: cy + ny * u, transform: `translate(-50%,-50%) scale(${s * (1 + hl * 0.06) * (portrait ? 1.2 : 1.15)})`,
            display: 'flex', alignItems: 'center', gap: 18 * u, padding: `${18 * u}px ${30 * u}px ${18 * u}px ${18 * u}px`, borderRadius: 999,
            background: hl > 0.5 ? C.mint : 'rgba(18,59,44,0.85)', border: `${2 * u}px solid ${hl > 0.5 ? C.mint : C.mintLine}`,
            boxShadow: `0 0 ${hl * 60 * u}px rgba(181,232,211,0.55)`, fontFamily, whiteSpace: 'nowrap',
          }}>
            <div style={{ width: 64 * u, height: 64 * u, borderRadius: 99, background: hl > 0.5 ? C.ink : C.mintSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon id={n.id} size={38 * u} color={C.mint} />
            </div>
            <div>
              <div style={{ fontSize: 34 * u, fontWeight: 800, color: hl > 0.5 ? C.ink : C.white, letterSpacing: -0.5 * u }}>{n.label}</div>
              <div style={{ fontSize: 22 * u, fontWeight: 600, color: hl > 0.5 ? C.mintDeep : C.dim }}>{n.sub}</div>
            </div>
          </div>
        );
      })}

      {/* Real cost bubble with a ticking counter. */}
      {(() => {
        const s = pop(f, fps, costAt + 4, 12) * (1 - fade(f, dur - 16, dur - 10));
        const v = interpolate(f, [costAt + 4, costAt + 28], [0, 2799], { ...clamp, easing: ease });
        const [nx, ny] = nodes[0];
        const left = portrait ? cx - 330 * u : cx + nx * u - 260 * u;
        const top = portrait ? cy - 330 * u : cy + ny * u + 80 * u;
        return (
          <div style={{
            position: 'absolute', left, top, width: (portrait ? 660 : 560) * u, padding: `${26 * u}px ${32 * u}px`, borderRadius: 32 * u,
            background: 'rgba(245,252,249,0.96)', transform: `scale(${s})`, transformOrigin: 'top center', fontFamily,
            boxShadow: `0 ${20 * u}px ${60 * u}px rgba(0,0,0,0.4)`,
          }}>
            <div style={{ fontSize: 24 * u, fontWeight: 700, color: C.mintDeep, letterSpacing: 2 * u, textTransform: 'uppercase' }}>Radu dă pe dobânzi + comisioane</div>
            <div style={{ fontSize: 76 * u, fontWeight: 800, color: C.ink, letterSpacing: -2 * u, fontVariantNumeric: 'tabular-nums' }}>{lei(v)} lei<span style={{ fontSize: 34 * u, fontWeight: 700, color: C.mintDeep }}> / lună</span></div>
          </div>
        );
      })()}

      {DEBTS.map((_, i) => <Sfx key={i} at={6 + i * 7} src="pop" volume={0.28} />)}
      {NOTES.map((_, i) => <Sfx key={i} at={30 + i * 22} src="ding" volume={0.22} />)}
      <Sfx at={hubAt - 8} src="whoosh" volume={0.35} />
      <Sfx at={hubAt + 8} src="pop" volume={0.5} />
      <Sfx at={hubAt + 6} src="boom" volume={0.55} />
      {NODES.map((_, i) => <Sfx key={i} at={branchAt + i * 4 + 10} src="pop" volume={0.32} />)}
      <Sfx at={costAt + 4} src="ding" volume={0.25} />
      <Sfx at={dur - 12} src="whoosh" volume={0.35} />
    </AbsoluteFill>
  );
};

// ---------- Scene 3+4: the phone (pay first -> pay less) ----------

const Phone: React.FC<{ swapAt: number; w: number }> = ({ swapAt, w }) => {
  const f = useCurrentFrame();
  const { fps, u } = useLayout();
  const swap = interpolate(f, [swapAt, swapAt + 14], [0, 1], { ...clamp, easing: easeInOut });
  const enter = pop(f, fps, 0, 15);
  const ry = lerp(-22, -9, enter) + Math.sin(f / 40) * 2;
  const float = Math.sin(f / 28) * 10 * u;
  const h = w * (2340 / 1080);
  const pad = 16 * u;
  return (
    <div style={{ perspective: 2400 * u }}>
      <div style={{
        transform: `translateY(${(1 - enter) * 500 * u + float}px) rotateY(${ry}deg) rotateX(5deg)`,
        width: w + pad * 2, height: h + pad * 2, borderRadius: 86 * u, padding: pad, boxSizing: 'border-box',
        background: 'linear-gradient(145deg, #2C3833 0%, #101714 45%, #1E2925 100%)',
        boxShadow: `0 ${60 * u}px ${120 * u}px rgba(0,0,0,0.55), inset 0 0 0 ${2 * u}px rgba(255,255,255,0.12)`,
      }}>
        <div style={{ width: w, height: h, borderRadius: 70 * u, overflow: 'hidden', position: 'relative', background: '#F6F5F7' }}>
          <Img src={staticFile('screens/02-plan.png')} style={{ position: 'absolute', width: w, height: h, transform: `translateX(${-swap * 100}%)` }} />
          {/* Pay less is the real app recording (video/backup): the tap on "Refinance with Raiffeisen Bank" lands ~0.8 s in. */}
          <Sequence from={swapAt} layout="none">
            <OffthreadVideo src={staticFile('backup/screen.mp4')} trimBefore={REC_PAYLESS} muted style={{ position: 'absolute', width: w, height: h, transform: `translateX(${(1 - swap) * 100}%)` }} />
          </Sequence>
          {/* Glass sheen. */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,0.16) 0%, transparent 35%)' }} />
        </div>
      </div>
    </div>
  );
};

const Copy: React.FC<{ pill: string; head: React.ReactNode; sub: string; chip?: string; p: number; align: 'left' | 'center' }> = ({ pill, head, sub, chip, p, align }) => {
  const { u, portrait } = useLayout();
  return (
    <div style={{ fontFamily, textAlign: align, opacity: p, transform: `translateY(${(1 - p) * 40 * u}px)` }}>
      <Pill>{pill}</Pill>
      <div style={{ color: C.white, fontSize: (portrait ? 84 : 92) * u, fontWeight: 800, letterSpacing: -2.5 * u, lineHeight: 1.02, marginTop: 26 * u }}>{head}</div>
      <div style={{ color: C.dim, fontSize: (portrait ? 34 : 36) * u, fontWeight: 500, marginTop: 22 * u, lineHeight: 1.3 }}>{sub}</div>
      {chip && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 * u, marginTop: 30 * u, padding: `${14 * u}px ${24 * u}px`, borderRadius: 999, background: C.mint, color: C.ink, fontSize: 28 * u, fontWeight: 700 }}>
          <span style={{ fontSize: 30 * u }}>✓</span>{chip}
        </div>
      )}
    </div>
  );
};

const PhoneScene: React.FC<{ swapAt: number; dur: number }> = ({ swapAt, dur }) => {
  const f = useCurrentFrame();
  const { width, height, fps, portrait, u } = useLayout();
  const a1 = Math.min(fade(f, 6, 18), 1 - fade(f, swapAt - 4, swapAt + 4));
  const a2 = fade(f, swapAt + 2, swapAt + 14);
  const save = interpolate(f, [swapAt + 8, swapAt + 32], [0, 3515], { ...clamp, easing: ease });
  const plus = interpolate(f, [8, 30], [0, 600], { ...clamp, easing: ease });
  const phoneW = portrait ? 600 * u : 540 * u;
  const n1 = pop(f, fps, 22, 13) * (1 - fade(f, swapAt - 6, swapAt + 2));
  const n2 = pop(f, fps, swapAt + 22, 13) * (1 - fade(f, dur - 8, dur));
  const nW = (portrait ? 760 : 600) * u;
  const nPos = portrait ? { left: (width - nW) / 2, top: 620 * u } : { left: width * 0.5 - 40 * u, top: 120 * u };

  const textBox: React.CSSProperties = portrait
    ? { position: 'absolute', left: 70 * u, right: 70 * u, top: 120 * u }
    : { position: 'absolute', left: 150 * u, width: 820 * u, top: height / 2 - 230 * u };
  return (
    <AbsoluteFill>
      <div style={portrait ? { position: 'absolute', left: (width - phoneW) / 2 - 16 * u, top: 760 * u } : { position: 'absolute', left: width - phoneW - 210 * u, top: 100 * u }}>
        <Phone swapAt={swapAt} w={phoneW} />
      </div>
      <div style={textBox}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Copy p={a1} align={portrait ? 'center' : 'left'} pill="Plătește întâi"
            head={<>+{lei(plus)} lei pe cardul<br />de credit BCR</>}
            sub="Costă cel mai mult: 25,7% pe an, cu dobânzi și comisioane." />
        </div>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Copy p={a2} align={portrait ? 'center' : 'left'} pill="Plătește mai puțin"
            head={<>Economisești<br />{lei(save)} lei</>}
            sub="Creditul ING → Raiffeisen Bank, 6,25% fix, după toate comisioanele."
            chip="Ordonat după economia ta, nu după comision" />
        </div>
      </div>
      <div style={{ position: 'absolute', ...nPos, opacity: n1, transform: `translateY(${(1 - n1) * -30 * u}px) scale(${0.92 + 0.08 * n1})` }}>
        <Notification title="Luna asta" body="Pune 600 lei în plus pe cardul BCR" width={nW} />
      </div>
      <div style={{ position: 'absolute', ...nPos, opacity: n2, transform: `translateY(${(1 - n2) * -30 * u}px) scale(${0.92 + 0.08 * n2})` }}>
        <Notification bank="raiffeisen" title="Raiffeisen Bank · probabil eligibil" body="Rata: 1.085 → 1.004 lei pe lună" width={nW} />
      </div>
      <Sfx at={22} src="ding" volume={0.25} />
      <Sfx at={swapAt} src="whoosh" volume={0.3} />
      <Sfx at={swapAt + 22} src="ding" volume={0.25} />
      <Sfx at={swapAt + REC_TAP} src="tick" volume={0.5} />
    </AbsoluteFill>
  );
};

// ---------- Scene 5: the goal counter (2054 -> 2035) ----------

const GoalScene: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { width, height, fps, portrait, u } = useLayout();
  const cx = width / 2, cy = height / 2 - (portrait ? 80 : 30) * u;
  const t0 = 14, t1 = 56;
  const p = interpolate(f, [t0, t1], [0, 1], { ...clamp, easing: easeInOut });
  const year = Math.round(2054 - 19 * p);
  const settled = f >= t1;
  const badge = pop(f, fps, t1 + 4, 9);
  const R = 300 * u, circ = 2 * Math.PI * R;
  const minLabel = fade(f, 4, 14);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, top: cy - R - (portrait ? 210 : 150) * u, textAlign: 'center', fontFamily, opacity: minLabel }}>
        <span style={{ color: C.dim, fontSize: 34 * u, fontWeight: 600 }}>Doar minimul: </span>
        <span style={{ color: C.coral, fontSize: 34 * u, fontWeight: 800, textDecoration: settled ? 'line-through' : 'none' }}>iun. 2054</span>
      </div>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(181,232,211,0.15)" strokeWidth={26 * u} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.mint} strokeWidth={26 * u} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - p)} transform={`rotate(-90 ${cx} ${cy})`} style={{ filter: `drop-shadow(0 0 ${18 * u}px rgba(181,232,211,0.6))` }} />
      </svg>
      <div style={{ position: 'absolute', left: cx, top: cy, transform: 'translate(-50%,-50%)', textAlign: 'center', fontFamily }}>
        <div style={{ color: C.dim, fontSize: 30 * u, fontWeight: 700, letterSpacing: 4 * u, textTransform: 'uppercase' }}>Fără datorii</div>
        <div style={{ color: C.white, fontSize: 170 * u, fontWeight: 800, letterSpacing: -6 * u, lineHeight: 1, fontVariantNumeric: 'tabular-nums', transform: `scale(${settled ? 1 + 0.06 * (1 - fade(f, t1, t1 + 10)) : 1})` }}>{year}</div>
        <div style={{ color: C.mint, fontSize: 40 * u, fontWeight: 700, opacity: fade(f, t1 - 2, t1 + 6) }}>februarie</div>
      </div>
      {/* Burst of dots when it lands. */}
      {Array.from({ length: 18 }).map((_, i) => {
        const a = (i / 18) * Math.PI * 2;
        const bp = interpolate(f, [t1, t1 + 24], [0, 1], { ...clamp, easing: ease });
        const r = R + 40 * u + bp * 170 * u;
        return <div key={i} style={{ position: 'absolute', left: cx + Math.cos(a) * r, top: cy + Math.sin(a) * r, width: 14 * u, height: 14 * u, borderRadius: 99, background: i % 3 ? C.mint : C.white, opacity: bp > 0 ? 1 - bp : 0, transform: 'translate(-50%,-50%)' }} />;
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, top: cy + R + 60 * u, textAlign: 'center', fontFamily }}>
        <div style={{ display: 'inline-block', padding: `${18 * u}px ${36 * u}px`, borderRadius: 999, background: C.mint, color: C.ink, fontSize: 48 * u, fontWeight: 800, letterSpacing: -1 * u, transform: `scale(${badge})` }}>Cu 19 ani mai devreme</div>
        <div style={{ color: C.dim, fontSize: 26 * u, fontWeight: 500, marginTop: 22 * u, opacity: fade(f, t1 + 10, t1 + 20) }}>Profil demo: Radu, 32 de ani, Cluj · fiecare rată achitată trece la următoarea datorie</div>
      </div>
      {Array.from({ length: 10 }).map((_, i) => <Sfx key={i} at={t0 + Math.round(((t1 - t0) * i) / 10)} src="tick" volume={0.35} />)}
      <Sfx at={t1 + 4} src="pop" volume={0.5} />
      <Sfx at={t1} src="boom" volume={0.45} />
    </AbsoluteFill>
  );
};

// ---------- Scene 6: end card ----------

const EndScene: React.FC<{ wordsAt: number }> = ({ wordsAt }) => {
  const f = useCurrentFrame();
  const { width, height, fps, portrait, u } = useLayout();
  const cx = width / 2, cy = height / 2 - (portrait ? 140 : 90) * u;
  const s = pop(f, fps, 2, 11);
  const words = ['Toate datoriile.', 'Un singur plan.'];
  return (
    <AbsoluteFill>
      {[0, 1].map(k => {
        const r = Math.max(0, (f - 4 - k * 16) / 50) % 1;
        return <div key={k} style={{ position: 'absolute', left: cx, top: cy, width: 340 * u, height: 340 * u, borderRadius: '50%', border: `${2 * u}px solid ${C.mint}`, transform: `translate(-50%,-50%) scale(${1 + r * 1.2})`, opacity: f > 4 + k * 16 ? (1 - r) * 0.35 : 0 }} />;
      })}
      <div style={{
        position: 'absolute', left: cx, top: cy, width: 340 * u, height: 340 * u, borderRadius: 96 * u, transform: `translate(-50%,-50%) scale(${s})`,
        background: `radial-gradient(circle at 35% 30%, #D6F5E8 0%, ${C.mint} 55%, #8FD3B8 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 ${110 * u}px rgba(181,232,211,0.45)`,
      }}>
        <Logo size={250 * u} variant="ink" />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: cy + 230 * u, textAlign: 'center', fontFamily }}>
        <div style={{ color: C.white, fontSize: 112 * u, fontWeight: 800, letterSpacing: -4 * u, opacity: fade(f, 6, 16) }}>PePlus</div>
        <div style={{ marginTop: 10 * u }}>
          {words.map((w, i) => {
            const p = fade(f, wordsAt + i * 10, wordsAt + i * 10 + 10);
            return <span key={i} style={{ display: 'inline-block', margin: `0 ${12 * u}px`, color: i ? C.mint : C.white, fontSize: 56 * u, fontWeight: 700, letterSpacing: -1 * u, opacity: p, transform: `translateY(${(1 - p) * 24 * u}px)` }}>{w}</span>;
          })}
        </div>
        <div style={{ color: C.dim, fontSize: 26 * u, fontWeight: 600, marginTop: 50 * u, letterSpacing: 1 * u, opacity: fade(f, wordsAt + 24, wordsAt + 36) }}>
          Android · Creat pentru România · Stripe VibeHack 2026
        </div>
      </div>
      <Sfx at={2} src="chime" volume={0.45} />
      <Sfx at={0} src="boom" volume={0.6} />
    </AbsoluteFill>
  );
};

// Fine film grain over everything (premium texture, changes every frame).
const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: 0.07, mixBlendMode: 'overlay' }}>
      <svg width="100%" height="100%">
        <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 12} /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter="url(#g)" />
      </svg>
    </AbsoluteFill>
  );
};

// Word-by-word captions (for muted autoplay on social), chunks of up to 4 words, current word in mint.
const Captions: React.FC<{ voice: Voice }> = ({ voice }) => {
  const f = useCurrentFrame();
  const { height, fps, portrait, u } = useLayout();
  const t = f / fps;
  const lines = (words as Record<string, { w: string; s: number; e: number }[][]>)[voice].slice(0, -1); // the end card says the last line
  for (const line of lines) {
    const chunks: typeof line[] = [];
    let cur: typeof line = [];
    line.forEach((w, i) => { cur.push(w); if (cur.length === 4 || /[.,]$/.test(w.w) || i === line.length - 1) { chunks.push(cur); cur = []; } });
    const chunk = chunks.find(c => t >= c[0].s - 0.05 && t <= c[c.length - 1].e + 0.25);
    if (!chunk) continue;
    const p = pop(f, fps, Math.round((chunk[0].s - 0.05) * fps), 14);
    return (
      <div style={{ position: 'absolute', left: 0, right: 0, top: portrait ? height - 330 * u : height - 150 * u, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ padding: `${16 * u}px ${30 * u}px`, borderRadius: 26 * u, background: 'rgba(4,20,14,0.78)', border: `${1.5 * u}px solid rgba(181,232,211,0.25)`, transform: `scale(${0.9 + 0.1 * p})`, opacity: p, fontFamily, fontSize: (portrait ? 58 : 46) * u, fontWeight: 800, letterSpacing: -1 * u, maxWidth: 940 * u, textAlign: 'center' }}>
          {chunk.map((w, i) => (
            <span key={i} style={{ color: t >= w.s ? (t <= w.e + 0.05 ? C.mint : C.white) : 'rgba(255,255,255,0.45)', marginRight: i < chunk.length - 1 ? 14 * u : 0 }}>{w.w.replace(/[.,]$/, '')}</span>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// ---------- Composition ----------

export const Ad: React.FC<{ voice: Voice; captions?: boolean }> = ({ voice, captions }) => {
  const { S, E, total, lines } = marks(voice);
  const cut = (i: number) => S[i] - 8; // scenes change just before their line starts
  const XF = 9; // crossfade length
  const mapDur = cut(2);
  const phoneDur = cut(4) - cut(2);
  const goalDur = cut(5) - cut(4);
  const endDur = total - cut(5);
  const hubAt = S[1];
  const branchAt = S[1] + Math.round((E[1] - S[1]) * 0.3);
  const costAt = S[1] + Math.round((E[1] - S[1]) * 0.5);
  // Music dips under the voice (simple ducking), fades in and out.
  const musicVol = (f: number) => {
    const duck = Math.max(0, ...S.map((s, i) => interpolate(f, [s - 8, s, E[i], E[i] + 10], [0, 1, 1, 0], clamp)));
    return interpolate(f, [0, 20, total - 40, total], [0, 0.26, 0.26, 0], clamp) * (1 - 0.5 * duck);
  };
  return (
    <AbsoluteFill style={{ background: C.bg0 }}>
      <Backdrop />
      {/* Each scene runs XF frames into the next one and fades out there, so cuts are crossfades, not dips. */}
      <Sequence durationInFrames={mapDur + XF}><Scene dur={mapDur + XF} inFrames={1} outFrames={XF}><MapScene hubAt={hubAt} branchAt={branchAt} costAt={costAt} dur={mapDur} captions={captions} /></Scene></Sequence>
      <Sequence from={cut(2)} durationInFrames={phoneDur + XF}><Scene dur={phoneDur + XF} outFrames={XF}><PhoneScene swapAt={cut(3) - cut(2) + 4} dur={phoneDur} /></Scene></Sequence>
      <Sequence from={cut(4)} durationInFrames={goalDur + XF}><Scene dur={goalDur + XF} outFrames={XF}><GoalScene dur={goalDur} /></Scene></Sequence>
      <Sequence from={cut(5)} durationInFrames={endDur}><Scene dur={endDur} outFrames={1}><EndScene wordsAt={S[5] - cut(5) + 22} /></Scene></Sequence>
      {captions && <Captions voice={voice} />}
      <Grain />
      <Audio src={staticFile('sfx/pad.wav')} volume={musicVol} />
      {lines.map((l, i) => (
        <Sequence key={i} from={S[i]} layout="none"><Audio src={staticFile(l.file)} volume={1} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
