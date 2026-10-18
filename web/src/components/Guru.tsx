// Guru, the mascot: a kangaroo with a pouch of coins ("canGURU"). Shown only
// at special moments (empty states, success, welcome, no connection), never on
// working screens. See design/README.md.
//
// The four poses the app uses are 3D renders (transparent WebP in
// public/guru). `normal` and the head-only `crop` avatar are still the flat
// vector drawing below.

type Pose = 'normal' | 'ola' | 'vazio' | 'sucesso' | 'dormir'

type PoseParts = {
  label: string
  coins: boolean
  left: 'hold' | 'up'
  right: 'hold' | 'up'
  eyes: 'open' | 'down' | 'happy' | 'closed'
  mouth: 'smile' | 'big' | 'o'
  tilt?: boolean
  flying?: boolean
  jump?: boolean
  zzz?: boolean
}

type PhotoPose = 'ola' | 'vazio' | 'sucesso' | 'dormir'

const PHOTO_POSES: readonly Pose[] = ['ola', 'vazio', 'sucesso', 'dormir']

const POSES: Record<Pose, PoseParts> = {
  normal: { label: 'Guru, o canguru, com moedas na bolsa', coins: true, left: 'hold', right: 'hold', eyes: 'open', mouth: 'smile' },
  ola: { label: 'Guru a acenar', coins: true, left: 'hold', right: 'up', eyes: 'open', mouth: 'big' },
  vazio: { label: 'Guru a espreitar a bolsa vazia', coins: false, left: 'hold', right: 'hold', eyes: 'down', mouth: 'o', tilt: true },
  sucesso: { label: 'Guru a saltar de alegria', coins: true, left: 'up', right: 'up', eyes: 'happy', mouth: 'big', flying: true, jump: true },
  dormir: { label: 'Guru a dormir', coins: true, left: 'hold', right: 'hold', eyes: 'closed', mouth: 'smile', zzz: true, tilt: true },
}

// Fixed in both light and dark mode. The bandana and sparkles take the app's
// accent, which follows the signed-in person's colour.
const FUR = '#E3A465'
const FUR_DARK = '#C98448'
const BELLY = '#F7DEC2'
const EAR_INNER = '#F2AFA6'
const COIN = '#FFC94A'
const COIN_EDGE = '#E0A21A'
const INK = '#3A2A22'
// The bandana in the 3D renders is always this violet, so the extras drawn on
// top (zzz, sparkles) use it too instead of the signed-in person's colour.
const ACCENT = '#6847F0'

function Coin({ cx, cy, r, edge = 1.8 }: { cx: number; cy: number; r: number; edge?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={COIN} />
      <circle cx={cx} cy={cy} r={r * 0.62} fill="none" stroke={COIN_EDGE} strokeWidth={edge} />
    </>
  )
}

function Flying() {
  return (
    <g>
      <Coin cx={34} cy={46} r={9} />
      <Coin cx={166} cy={34} r={10} />
      <Coin cx={160} cy={80} r={7} edge={1.6} />
      <path d="M46 18v10M41 23h10M178 62v8M174 66h8M24 84v7M20.5 87.5h7" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" />
    </g>
  )
}

function Zzz() {
  return (
    <g fill={ACCENT} fontWeight="700">
      <text x="146" y="44" fontSize="18">z</text>
      <text x="160" y="26" fontSize="13">z</text>
      <text x="171" y="12" fontSize="10">z</text>
    </g>
  )
}

export function Guru({
  pose = 'normal',
  size = 200,
  crop = false,
  decorative = false,
  className,
}: {
  pose?: Pose
  // Width in pixels; height follows (square for the 3D poses).
  size?: number
  // Head only, for a small round avatar.
  crop?: boolean
  // Purely ornamental next to text that already says it.
  decorative?: boolean
  className?: string
}) {
  const parts = POSES[pose]
  const pupilY = parts.eyes === 'down' ? 80 : 76

  if (!crop && PHOTO_POSES.includes(pose)) {
    return (
      <span className={`relative inline-block ${className ?? ''}`} style={{ width: size, height: size }}>
        <img
          src={`${import.meta.env.BASE_URL}guru/${pose as PhotoPose}.webp`}
          width={size}
          height={size}
          alt={decorative ? '' : parts.label}
          draggable={false}
          className="block size-full object-contain"
          {...(decorative ? { 'aria-hidden': true } : {})}
        />
        {(parts.flying || parts.zzz) && (
          <svg viewBox="0 0 200 200" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
            {parts.flying && <Flying />}
            {parts.zzz && <Zzz />}
          </svg>
        )}
      </span>
    )
  }

  return (
    <svg
      width={size}
      height={Math.round(crop ? (size * 116) / 108 : size * 1.2)}
      viewBox={crop ? '46 6 108 116' : '0 0 200 240'}
      className={className}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': parts.label })}
    >
      {parts.flying && <Flying />}
      {parts.zzz && <Zzz />}

      {/* Tail, feet, legs, body, belly */}
      <path d="M62 196C22 206 6 176 16 144C20 130 34 132 33 146C30 170 46 186 72 182Z" fill={FUR_DARK} />
      <ellipse cx="78" cy="224" rx="25" ry="9" fill={FUR_DARK} />
      <ellipse cx="124" cy="224" rx="25" ry="9" fill={FUR_DARK} />
      <ellipse cx="72" cy="194" rx="22" ry="26" fill={FUR} />
      <ellipse cx="128" cy="194" rx="22" ry="26" fill={FUR} />
      <ellipse cx="100" cy="162" rx="46" ry="54" fill={FUR} />
      <ellipse cx="100" cy="170" rx="32" ry="42" fill={BELLY} />

      {parts.coins && (
        <g>
          <Coin cx={100} cy={160} r={9.5} />
          <Coin cx={88} cy={168} r={10} />
          <Coin cx={112} cy={167} r={10} />
        </g>
      )}
      {/* Pouch, with the same stitching as the app icon */}
      <path d="M69 174h62v6c0 18-13.5 30-31 30s-31-12-31-30z" fill="#FFFFFF" stroke="#E3C7AB" strokeWidth="1.6" />
      <path d="M76 183h48" stroke="#B9A8F5" strokeWidth="2.2" strokeDasharray="4 4" strokeLinecap="round" />

      {/* Arms */}
      {parts.left === 'hold' ? (
        <ellipse cx="68" cy="166" rx="9" ry="15" transform="rotate(-28 68 166)" fill={FUR_DARK} />
      ) : (
        <ellipse cx="52" cy="104" rx="9" ry="20" transform="rotate(-32 52 104)" fill={FUR_DARK} />
      )}
      {parts.right === 'hold' ? (
        <ellipse cx="132" cy="166" rx="9" ry="15" transform="rotate(28 132 166)" fill={FUR_DARK} />
      ) : (
        <ellipse cx="148" cy="104" rx="9" ry="20" transform="rotate(32 148 104)" fill={FUR_DARK} />
      )}

      {/* Bandana */}
      <path d="M74 110Q100 124 126 110L112 122L100 138L88 122Z" fill={ACCENT} />

      <g transform={parts.tilt ? 'rotate(-6 100 80)' : undefined}>
        <ellipse cx="75" cy="40" rx="12" ry="28" transform="rotate(-20 75 40)" fill={FUR} />
        <ellipse cx="75" cy="43" rx="6" ry="18" transform="rotate(-20 75 43)" fill={EAR_INNER} />
        <ellipse cx="125" cy="40" rx="12" ry="28" transform="rotate(20 125 40)" fill={FUR} />
        <ellipse cx="125" cy="43" rx="6" ry="18" transform="rotate(20 125 43)" fill={EAR_INNER} />
        <ellipse cx="100" cy="80" rx="40" ry="36" fill={FUR} />
        <ellipse cx="100" cy="96" rx="20" ry="14" fill={BELLY} />
        <circle cx="73" cy="91" r="6" fill="#F49C9C" opacity="0.55" />
        <circle cx="127" cy="91" r="6" fill="#F49C9C" opacity="0.55" />
        <ellipse cx="100" cy="89" rx="6.5" ry="4.5" fill={INK} />

        {(parts.eyes === 'open' || parts.eyes === 'down') && (
          <g>
            <circle cx="84" cy={pupilY} r="5.5" fill={INK} />
            <circle cx="116" cy={pupilY} r="5.5" fill={INK} />
            <circle cx="86" cy={pupilY - 2} r="1.8" fill="#FFFFFF" />
            <circle cx="118" cy={pupilY - 2} r="1.8" fill="#FFFFFF" />
          </g>
        )}
        {parts.eyes === 'happy' && (
          <path d="M78 78Q84 70 90 78M110 78Q116 70 122 78" stroke={INK} strokeWidth="2.8" strokeLinecap="round" fill="none" />
        )}
        {parts.eyes === 'closed' && (
          <path d="M78 76Q84 82 90 76M110 76Q116 82 122 76" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        )}

        {parts.mouth === 'smile' && (
          <path d="M93 98Q100 105 107 98" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        )}
        {parts.mouth === 'big' && <path d="M92 97Q100 108 108 97Z" fill={INK} />}
        {parts.mouth === 'o' && <ellipse cx="100" cy="100" rx="3" ry="3.6" fill={INK} />}
      </g>

      {parts.jump && (
        <path d="M62 238h18M120 238h18" stroke={FUR_DARK} strokeWidth="2.4" strokeLinecap="round" opacity="0.5" />
      )}
    </svg>
  )
}
