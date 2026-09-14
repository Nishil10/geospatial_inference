import { memo } from 'react';

// All geometry lives at module scope. Login holds controlled inputs, so every
// keystroke re-renders its parent — this subtree must never re-reconcile.

// 7 columns x 9 rows at 136/104 pitch with 110x78 blocks gives a uniform 26px
// street gap. Oversized so the -18deg rotation still covers the 600x600 viewBox.
const BLOCKS: { x: number; y: number }[] = [];
for (let i = 0; i < 7; i++) {
  for (let j = 0; j < 9; j++) BLOCKS.push({ x: -190 + i * 136, y: -190 + j * 104 });
}

// Site 02 canopy: 4x4 grid, 18px pitch, r 4.5, centred on (288, 331).
const CANOPY: { cx: number; cy: number }[] = [];
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 4; c++) CANOPY.push({ cx: 261 + c * 18, cy: 304 + r * 18 });
}

// Eleven of sixteen are felled. Kept as data so the survivors read organic
// rather than striped.
const CANOPY_KEPT = new Set([0, 5, 6, 10, 15]);

const BAY = 'M 600 380 C 545 400, 512 452, 505 520 L 505 660 L 660 660 L 660 360 Z';

const TOWERS = [
  { shadow: [186, 249, 34, 30], body: [183, 246, 34, 30] },
  { shadow: [226, 252, 30, 44], body: [223, 249, 30, 44] },
  { shadow: [189, 288, 30, 26], body: [186, 285, 30, 26] },
] as const;

// Both eras render from this one component so the viewBox and
// preserveAspectRatio can never diverge — any mismatch and the two states
// misregister exactly where the seam draws the eye.
function CityPlan({ year }: { year: 2019 | 2024 }) {
  const after = year === 2024;

  return (
    <svg
      viewBox="0 0 600 600"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      focusable="false"
      className="absolute inset-0 h-full w-full"
    >
      <rect x="-300" y="-300" width="1200" height="1200" fill="#080e1a" />

      {/* Block field. The -18deg rotation is what makes a vertical wipe cut the
          grid obliquely, so the plate reads as a map rather than a wireframe. */}
      <g transform="rotate(-18 300 300)">
        {BLOCKS.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width="110" height="78" rx="1.5" fill="#0f172a" />
        ))}

        {after && (
          <>
            {/* Site 03 — the avenue widens 26 -> 44 by shaving 18px off the
                west edge of column 4. Page colour reads as new roadway. */}
            <rect x="354" y="-200" width="18" height="1000" fill="#080e1a" />
            <line x1="328" y1="140" x2="328" y2="470" stroke="#10b981" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="372" y1="140" x2="372" y2="470" stroke="#10b981" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="350" y1="140" x2="350" y2="470" stroke="#334155" strokeWidth="1.5" strokeDasharray="10 12" />
          </>
        )}
      </g>

      {/* Bay and piers, drawn after the blocks so water sits over land. */}
      <path d={BAY} fill="#0b1a2b" />
      <path d={BAY} fill="#3b82f6" fillOpacity="0.08" />
      {[400, 428, 456, 484].map((y) => (
        <rect key={y} x="468" y={y} width="48" height="5" rx="1" fill="#0f172a" transform="rotate(-18 492 480)" />
      ))}

      {/* Site 01 — surface parking becomes three towers. */}
      <g transform="rotate(-18 219 270)">
        {after ? (
          <>
            <rect x="180" y="304" width="46" height="34" rx="1.5" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            {TOWERS.map((t, i) => (
              <g key={i}>
                <rect x={t.shadow[0]} y={t.shadow[1]} width={t.shadow[2]} height={t.shadow[3]} rx="1" fill="#0a1120" />
                <rect
                  x={t.body[0]}
                  y={t.body[1]}
                  width={t.body[2]}
                  height={t.body[3]}
                  rx="1"
                  fill="#10b981"
                  fillOpacity="0.14"
                  stroke="#10b981"
                  strokeWidth="1"
                />
              </g>
            ))}
          </>
        ) : (
          <>
            <rect x="180" y="240" width="78" height="56" rx="2" fill="#0b1220" stroke="#1e293b" strokeWidth="1" />
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <rect key={k} x={186 + k * 12} y="246" width="2.5" height="44" fill="#1e293b" />
            ))}
            <rect x="180" y="304" width="46" height="34" rx="1.5" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          </>
        )}
      </g>

      {/* Site 02 — the payload. Eleven hollow rings where trees used to stand:
          absence drawn as a ghost outline, which is what change detection
          actually looks like. Keep the rings hollow and lighter than the
          survivors or the whole idea flattens. */}
      <g transform="rotate(-18 288 331)">
        <rect x="254" y="297" width="68" height="68" rx="2" fill="#0d1a1c" />
        {CANOPY.map((t, i) =>
          !after || CANOPY_KEPT.has(i) ? (
            <circle key={i} cx={t.cx} cy={t.cy} r="4.5" fill="#334155" />
          ) : (
            <circle
              key={i}
              cx={t.cx}
              cy={t.cy}
              r="4.5"
              fill="none"
              stroke="#10b981"
              strokeOpacity="0.6"
              strokeWidth="0.75"
            />
          )
        )}
      </g>

      {/* Site 04 — rail spur. Renders nothing in 2019; nothing becoming
          something is the fourth kind of change. */}
      {after && (
        <g transform="rotate(-18 388 300)">
          <line
            x1="388"
            y1="228"
            x2="388"
            y2="372"
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="1 7"
            strokeLinecap="round"
          />
          {[248, 296, 344].map((y) => (
            <rect key={y} x="384.5" y={y} width="7" height="7" rx="1" fill="#10b981" fillOpacity="0.9" />
          ))}
        </g>
      )}
    </svg>
  );
}

export default memo(CityPlan);
