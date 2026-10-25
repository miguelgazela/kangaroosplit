import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Guru } from '../components/Guru'
import { Icon } from '../components/Icon'
import { useToast } from '../components/ToastContext'
import { t } from '../i18n/pt'
import type { Category, List, Member } from '../lib/database.types'
import { parseISODate } from '../lib/dates'
import { formatMoney, formatWholeEuros } from '../lib/format'
import { nameForms } from '../lib/people'
import { reviewToday, useYearSummary } from '../lib/useYearReview'
import { shareYear } from '../lib/yearShare'
import type { YearSummary } from '../lib/yearSummary'
import { useCategories, useLists, useMembers } from '../query/hooks'

// "O vosso 2026": a full-screen story player with the couple's year, in the
// style of Spotify Wrapped. Mockup: design/screens/ResumoAno.dc.html.

const STORY_MS = 6000
const LONG_PRESS_MS = 250
const SWIPE_CLOSE_PX = 80
const GOLD = '#FFC94A'

type StoryId = 'intro' | 'total' | 'category' | 'payers' | 'month' | 'moments' | 'reactions' | 'settlements' | 'end'

// Background, text colour and the two soft blobs of each story.
const THEMES: Record<StoryId, { bg: string; fg: string; a: string; b: string; bar: string }> = {
  intro: { bg: 'linear-gradient(160deg, #7B5CFA 0%, #4A2FD0 55%, #2A1B7A 100%)', fg: '#FFFFFF', a: 'rgba(255,255,255,0.10)', b: 'rgba(200,50,60,0.35)', bar: '#7B5CFA' },
  total: { bg: 'linear-gradient(165deg, #C8323C 0%, #8E1D27 100%)', fg: '#FFFFFF', a: 'rgba(255,201,74,0.22)', b: 'rgba(255,255,255,0.08)', bar: '#C8323C' },
  category: { bg: 'linear-gradient(165deg, #FFD36A 0%, #F2A93B 100%)', fg: '#2B1A00', a: 'rgba(255,255,255,0.35)', b: 'rgba(224,112,32,0.30)', bar: '#FFD36A' },
  payers: { bg: 'linear-gradient(165deg, #1B1B22 0%, #0E0E12 100%)', fg: '#FFFFFF', a: 'rgba(37,99,235,0.30)', b: 'rgba(192,54,122,0.30)', bar: '#1B1B22' },
  month: { bg: 'linear-gradient(165deg, #2F80ED 0%, #1452A8 100%)', fg: '#FFFFFF', a: 'rgba(255,255,255,0.12)', b: 'rgba(95,211,154,0.30)', bar: '#2F80ED' },
  moments: { bg: 'linear-gradient(165deg, #6847F0 0%, #C0367A 100%)', fg: '#FFFFFF', a: 'rgba(255,201,74,0.22)', b: 'rgba(255,255,255,0.10)', bar: '#6847F0' },
  reactions: { bg: 'linear-gradient(165deg, #FF8FB1 0%, #E0457B 100%)', fg: '#FFFFFF', a: 'rgba(255,255,255,0.22)', b: 'rgba(104,71,240,0.30)', bar: '#FF8FB1' },
  settlements: { bg: 'linear-gradient(165deg, #1F7A4D 0%, #0D3B25 100%)', fg: '#FFFFFF', a: 'rgba(255,201,74,0.20)', b: 'rgba(255,255,255,0.08)', bar: '#1F7A4D' },
  end: { bg: 'linear-gradient(160deg, #7B5CFA 0%, #4A2FD0 55%, #2A1B7A 100%)', fg: '#FFFFFF', a: 'rgba(200,50,60,0.30)', b: 'rgba(31,122,77,0.35)', bar: '#7B5CFA' },
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// Whole euros for the big amounts, cents for the small ones.
const money = (cents: number) => (cents >= 10_000 ? formatWholeEuros(cents) : formatMoney(cents))

// '2026-12-23' -> '23 de dezembro'
function longDate(iso: string): string {
  const { month, day } = parseISODate(iso)
  return `${day} de ${MONTHS[month - 1]}`
}

function subscribeReducedMotion(listener: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

// Big one-line text that shrinks to fit narrow screens (the content box is a
// size container, so 100cqw is its width).
function fit(text: string, max: number, ratio = 0.6): CSSProperties {
  const chars = Math.max([...text].length, 1)
  return { fontSize: `min(${max}px, calc(100cqw / ${(chars * ratio).toFixed(2)}))` }
}

// Names wrap between words, so only the longest word has to fit on a line.
const longestWord = (text: string) => text.split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a), '')

const delay = (seconds: number): CSSProperties => ({ animationDelay: `${seconds}s` })

function availableStories(summary: YearSummary): StoryId[] {
  const stories: StoryId[] = ['intro', 'total']
  if (summary.categories.length > 0) stories.push('category')
  if (summary.totalCents > 0) stories.push('payers')
  if (summary.topMonth) stories.push('month')
  if (summary.biggest) stories.push('moments')
  if (summary.reactionCount + summary.commentCount > 0) stories.push('reactions')
  if (summary.settlementCount > 0) stories.push('settlements')
  stories.push('end')
  return stories
}

type StoryProps = {
  summary: YearSummary
  members: Member[]
  lists: List[]
  categories: Category[]
  stories: number
  fg: string
  isCurrentYear: boolean
  onShare: () => void
  sharing: boolean
  onRestart: () => void
}

function Column({ children, center = false, gap = 8 }: { children: ReactNode; center?: boolean; gap?: number }) {
  return (
    <div
      className={`flex flex-1 flex-col justify-center ${center ? 'items-center text-center' : ''}`}
      style={{ gap }}
    >
      {children}
    </div>
  )
}

function Intro({ summary, members, stories }: StoryProps) {
  return (
    <Column center gap={10}>
      <span className="ks-rise text-[17px] font-semibold tracking-[2px] uppercase opacity-85">
        {t.yearReview.names(members[0]?.display_name ?? '', members[1]?.display_name ?? '')}
      </span>
      <span className="ks-rise text-[72px] leading-[72px] font-black tracking-[-2px]" style={delay(0.1)}>
        O vosso
        <br />
        {summary.year}
      </span>
      <div className="ks-rise mt-[18px] mb-1.5" style={delay(0.25)}>
        <Guru pose="sucesso" size={220} className="max-h-[28vh] max-w-[28vh]" decorative />
      </div>
      <span className="ks-rise max-w-[280px] text-[17px] leading-[23px] opacity-90" style={delay(0.4)}>
        {t.yearReview.intro(stories)}
      </span>
      <span className="mt-[22px] text-[13px] font-semibold opacity-70">{t.yearReview.tapToContinue}</span>
    </Column>
  )
}

function Total({ summary, isCurrentYear }: StoryProps) {
  const total = formatWholeEuros(summary.totalCents)
  const names = summary.lists.slice(0, 3).map((list) => list.name).join(', ')
  return (
    <Column gap={6}>
      <span className="ks-rise text-[26px] font-bold">
        {isCurrentYear ? t.yearReview.splitThisYear : t.yearReview.splitInYear(summary.year)}
      </span>
      <span
        className="ks-rise leading-[1.05] font-black tracking-[-3px] whitespace-nowrap tabular-nums"
        style={{ ...fit(total, 88, 0.58), ...delay(0.1) }}
      >
        {total}
      </span>
      <span className="ks-rise text-[26px] font-bold" style={delay(0.2)}>
        {t.yearReview.inExpenses} <span style={{ color: GOLD }}>{t.yearReview.expenses(summary.expenseCount)}</span>.
      </span>
      <div className="ks-rise mt-9 grid grid-cols-2 gap-2.5" style={delay(0.35)}>
        <div className="min-w-0 rounded-[20px] bg-white/14 p-4">
          <div className="truncate text-[30px] font-extrabold tabular-nums">{formatWholeEuros(summary.perDayCents)}</div>
          <div className="text-[14px] opacity-85">{t.yearReview.perDay}</div>
        </div>
        <div className="min-w-0 rounded-[20px] bg-white/14 p-4">
          <div className="truncate text-[30px] font-extrabold">{t.yearReview.lists(summary.lists.length)}</div>
          <div className="truncate text-[14px] opacity-85">
            {names}
            {summary.lists.length > 3 ? '…' : ''}
          </div>
        </div>
      </div>
    </Column>
  )
}

function TopCategory({ summary, categories }: StoryProps) {
  const [first] = summary.categories
  const top = categories.find((category) => category.id === first.categoryId)
  const name = top?.name ?? '—'
  const max = first.totalCents
  return (
    <Column>
      <span className="ks-rise text-[22px] font-bold">{t.yearReview.categoryOfYear}</span>
      <span className="ks-rise text-[96px] leading-[100px]" style={delay(0.1)}>
        {top?.icon ?? '📦'}
      </span>
      <span
        lang="pt-PT"
        className="ks-rise leading-[1.08] font-black tracking-[-1.5px] break-words"
        style={{ ...fit(longestWord(name), 52, 0.6), ...delay(0.15) }}
      >
        {name}
      </span>
      <span className="ks-rise text-[20px] font-semibold" style={delay(0.2)}>
        {t.yearReview.categoryCount(formatWholeEuros(first.totalCents), first.count, name)}
        <br />
        {t.yearReview.frequency(first.count, summary.days)}
      </span>
      <div className="mt-[26px] flex flex-col gap-2.5" aria-hidden="true">
        {summary.categories.slice(0, 5).map((entry, index) => {
          const category = categories.find((candidate) => candidate.id === entry.categoryId)
          return (
            <div key={entry.categoryId} className="flex items-center gap-2.5">
              <span className="w-[22px] text-[15px] font-extrabold opacity-70">{index + 1}</span>
              <span className="relative h-[30px] min-w-0 flex-1 overflow-hidden rounded-[10px] bg-[rgba(17,17,20,0.12)]">
                <span
                  className="ks-grow absolute inset-y-0 left-0 rounded-[10px]"
                  style={{
                    width: `${Math.max(4, (entry.totalCents / max) * 100)}%`,
                    background: index === 0 ? '#FFFFFF' : 'rgba(255,255,255,0.65)',
                    ...delay(0.25 + index * 0.08),
                  }}
                />
                <span className="absolute inset-y-0 right-2 left-2.5 flex items-center truncate text-[14px] font-bold text-[#111114]">
                  {category?.icon} {category?.name}
                </span>
              </span>
              <span className="w-[76px] text-right text-[14px] font-bold tabular-nums">{formatWholeEuros(entry.totalCents)}</span>
            </div>
          )
        })}
      </div>
    </Column>
  )
}

function Payers({ summary, members }: StoryProps) {
  const people = summary.payers
    .map((payer) => ({ ...payer, member: members.find((member) => member.user_id === payer.userId)! }))
    .filter((payer) => payer.member)
  const total = summary.totalCents
  const percents = people.map((person) => Math.round((person.totalCents * 100) / total))

  let line: ReactNode = null
  let averages: string | null = null
  if (people.length === 2) {
    const [a, b] = people
    const paidAll = a.count === 0 ? b : b.count === 0 ? a : null
    if (paidAll) {
      line = t.yearReview.paidBoth(nameForms(paidAll.member).subject)
    } else {
      const avgA = a.totalCents / a.count
      const avgB = b.totalCents / b.count
      const often = a.count === b.count ? null : a.count > b.count ? a : b
      const bigger = Math.round(avgA / 100) === Math.round(avgB / 100) ? null : avgA > avgB ? a : b
      if (often && often === bigger) line = t.yearReview.paidBoth(nameForms(often.member).subject)
      else
        line = (
          <>
            {often ? t.yearReview.paidMoreOften(nameForms(often.member).subject) : t.yearReview.paidSameCount}
            {bigger && (
              <>
                <br />
                {t.yearReview.paidBigger(nameForms(bigger.member).subject)}
              </>
            )}
          </>
        )
      const [high, low] = avgA >= avgB ? [a, b] : [b, a]
      const highAvg = formatWholeEuros(Math.max(avgA, avgB))
      const lowAvg = formatWholeEuros(Math.min(avgA, avgB))
      averages =
        highAvg === lowAvg
          ? t.yearReview.sameAverage(highAvg)
          : t.yearReview.averages(nameForms(high.member).of, highAvg, nameForms(low.member).of, lowAvg)
    }
  }

  return (
    <Column gap={10}>
      <span className="ks-rise text-[22px] font-bold">{t.yearReview.whoPaid}</span>
      <div className="ks-rise mt-2.5 mb-1 flex gap-3" style={delay(0.1)}>
        {people.map((person, index) => (
          <div
            key={person.userId}
            className="flex min-h-[230px] min-w-0 flex-col justify-end gap-1 rounded-[24px] px-4 py-[18px] text-white"
            style={{ flex: Math.max(percents[index], 30), background: person.member.color }}
          >
            <span className="truncate text-[15px] font-bold opacity-90">{person.member.display_name}</span>
            <span className="text-[44px] font-black tracking-[-1px] tabular-nums">{percents[index]} %</span>
            <span className="text-[14px] opacity-90">{t.yearReview.paidTimes(formatWholeEuros(person.totalCents), person.count)}</span>
          </div>
        ))}
      </div>
      {line && (
        <span className="ks-rise text-[24px] leading-[30px] font-extrabold" style={delay(0.25)}>
          {line}
        </span>
      )}
      {averages && (
        <span className="ks-rise text-[16px] opacity-85" style={delay(0.35)}>
          {averages}
        </span>
      )}
    </Column>
  )
}

function TopMonth({ summary, lists, categories }: StoryProps) {
  const top = summary.topMonth!
  const list = top.listId ? lists.find((candidate) => candidate.id === top.listId) : undefined
  const icon = list?.icon ?? categories.find((category) => category.id === top.categoryId)?.icon ?? ''
  const title = `${MONTHS[top.month - 1]} ${icon}`.trim()
  const max = Math.max(...summary.months, 1)
  return (
    <Column>
      <span className="ks-rise text-[22px] font-bold">{t.yearReview.topMonth}</span>
      <span className="ks-rise leading-[1.05] font-black tracking-[-2px] whitespace-nowrap" style={{ ...fit(title, 72, 0.56), ...delay(0.1) }}>
        {title}
      </span>
      <span className="ks-rise text-[20px] font-semibold" style={delay(0.2)}>
        {list
          ? t.yearReview.topMonthList(formatWholeEuros(top.totalCents), list.name)
          : t.yearReview.topMonthPlain(formatWholeEuros(top.totalCents))}
      </span>
      <div className="mt-[34px] flex h-[210px] items-end gap-1.5" aria-hidden="true">
        {summary.months.map((cents, index) => (
          <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span
              className="ks-growy w-full rounded-[8px_8px_3px_3px]"
              style={{
                height: `${Math.max(2, (cents / max) * 100)}%`,
                background: index === top.month - 1 ? GOLD : 'rgba(255,255,255,0.45)',
                ...delay(0.2 + index * 0.04),
              }}
            />
            <span className="text-[11px] font-bold" style={{ opacity: index === top.month - 1 ? 1 : 0.75 }}>
              {MONTHS[index][0].toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </Column>
  )
}

function Moments({ summary, categories }: StoryProps) {
  const iconOf = (id: string) => categories.find((category) => category.id === id)?.icon ?? '📦'
  const monthOf = (iso: string) => MONTHS[parseISODate(iso).month - 1]
  const restaurantIcon = categories.find((category) => category.name.toLowerCase() === 'restaurantes')?.icon ?? '🍽️'
  const items = [
    summary.biggest && {
      icon: iconOf(summary.biggest.categoryId),
      k: t.yearReview.biggest,
      t: summary.biggest.description,
      s: `${money(summary.biggest.amountCents)} · ${monthOf(summary.biggest.spentOn)}`,
    },
    summary.smallest && {
      icon: iconOf(summary.smallest.categoryId),
      k: t.yearReview.smallest,
      t: summary.smallest.description,
      s: `${formatMoney(summary.smallest.amountCents)} · ${monthOf(summary.smallest.spentOn)}`,
    },
    summary.restaurant && {
      icon: restaurantIcon,
      k: t.yearReview.restaurant,
      t: summary.restaurant.description,
      s: t.yearReview.visits(summary.restaurant.count, money(summary.restaurant.totalCents)),
    },
  ].filter((item) => !!item)
  return (
    <Column gap={12}>
      <span className="ks-rise text-[30px] leading-9 font-black tracking-[-0.5px]">{t.yearReview.moments}</span>
      {items.map((item, index) => (
        <div
          key={item.k}
          className="ks-rise flex items-center gap-3.5 rounded-[22px] bg-white/14 px-4 py-3.5"
          style={delay(0.1 + index * 0.1)}
        >
          <span className="flex size-14 flex-none items-center justify-center rounded-2xl bg-white/18 text-[30px]">{item.icon}</span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[13px] font-semibold tracking-[0.6px] uppercase opacity-80">{item.k}</span>
            <span className="truncate text-[19px] font-extrabold">{item.t}</span>
            <span className="text-[14px] opacity-85">{item.s}</span>
          </span>
        </div>
      ))}
    </Column>
  )
}

function Reactions({ summary }: StoryProps) {
  const big = summary.reactionCount > 0 ? summary.reactionCount : summary.commentCount
  const max = summary.topEmojis[0]?.count ?? 1
  return (
    <Column center>
      <span className="ks-rise text-[22px] font-bold">{t.yearReview.exchanged}</span>
      <span className="ks-rise text-[96px] leading-[100px] font-black tracking-[-3px] tabular-nums" style={delay(0.1)}>
        {big}
      </span>
      <span className="ks-rise text-[22px] font-bold" style={delay(0.15)}>
        {summary.reactionCount > 0
          ? t.yearReview.reactionsAnd(summary.reactionCount, summary.commentCount)
          : t.yearReview.commentsOnly(summary.commentCount)}
      </span>
      {summary.topEmojis.length > 0 && (
        <div className="mt-7 flex items-end gap-3.5">
          {summary.topEmojis.map((entry, index) => (
            <div key={entry.emoji} className="ks-rise flex flex-col items-center gap-1.5" style={delay(0.25 + index * 0.08)}>
              <span className="leading-none" style={{ fontSize: Math.round(36 + (28 * entry.count) / max) }}>
                {entry.emoji}
              </span>
              <span className="text-[15px] font-extrabold tabular-nums">{entry.count}</span>
            </div>
          ))}
        </div>
      )}
      {summary.mostCommented && (
        <span className="ks-rise mt-[26px] max-w-[290px] text-[17px] leading-[23px] opacity-90" style={delay(0.5)}>
          {t.yearReview.mostCommented(summary.mostCommented.description, summary.mostCommented.count)}
        </span>
      )}
    </Column>
  )
}

function Settlements({ summary }: StoryProps) {
  const times = t.yearReview.times(summary.settlementCount)
  const quites = summary.outstandingCents === 0
  const months = Math.max(1, Math.round(summary.days / 30.4))
  return (
    <Column>
      <span className="ks-rise text-[22px] font-bold">{t.yearReview.settled}</span>
      <span className="ks-rise leading-[1.05] font-black tracking-[-3px] whitespace-nowrap" style={{ ...fit(times, 96, 0.56), ...delay(0.1) }}>
        {times}
      </span>
      <span className="ks-rise text-[20px] font-semibold" style={delay(0.2)}>
        {t.yearReview.settleLine(summary.settlementCount, months)}
      </span>
      <div className="ks-rise mt-[30px] flex items-center gap-3.5 rounded-[24px] bg-white p-[18px] text-[#111114]" style={delay(0.35)}>
        <span
          className="flex size-[52px] flex-none items-center justify-center rounded-full text-white"
          style={{ background: quites ? '#1F7A4D' : '#6847F0' }}
        >
          <Icon name={quites ? 'check' : 'settle'} size={28} strokeWidth={3} />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[20px] font-extrabold">
            {quites ? t.yearReview.enterQuites(summary.year + 1) : t.yearReview.leftToSettle(formatMoney(summary.outstandingCents))}
          </span>
          {summary.lastSettlement && (
            <span className="text-[14px] text-[#4A4A55]">
              {t.yearReview.lastSettlement(longDate(summary.lastSettlement.settledOn), formatMoney(summary.lastSettlement.amountCents))}
            </span>
          )}
        </span>
      </div>
    </Column>
  )
}

function End({ summary, onShare, sharing, onRestart }: StoryProps) {
  return (
    <Column center gap={12}>
      <Guru pose="ola" size={200} className="max-h-[24vh] max-w-[24vh]" decorative />
      <span className="ks-rise text-[40px] leading-[44px] font-black tracking-[-1px]">{t.yearReview.thanks(summary.year)}</span>
      <span className="ks-rise text-[17px] opacity-90" style={delay(0.15)}>
        {t.yearReview.seeYou}
      </span>
      <div className="pointer-events-auto relative z-10 mt-[22px] flex w-full flex-col gap-2.5">
        <button
          type="button"
          disabled={sharing}
          onClick={onShare}
          className="flex h-[52px] items-center justify-center gap-2 rounded-[26px] bg-white text-[17px] font-bold text-[#4B2FD0] disabled:opacity-70"
        >
          <Icon name="share" size={20} strokeWidth={2.2} />
          {t.yearReview.share}
        </button>
        <button type="button" onClick={onRestart} className="h-12 rounded-3xl bg-white/16 text-[16px] font-semibold text-white">
          {t.yearReview.again}
        </button>
      </div>
    </Column>
  )
}

const STORIES: Record<StoryId, (props: StoryProps) => ReactNode> = {
  intro: Intro,
  total: Total,
  category: TopCategory,
  payers: Payers,
  month: TopMonth,
  moments: Moments,
  reactions: Reactions,
  settlements: Settlements,
  end: End,
}

// Paints the browser and status bar with the story's colour while it is open.
function useThemeColor(color: string) {
  useEffect(() => {
    const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')]
    const before = metas.map((meta) => meta.content)
    metas.forEach((meta) => (meta.content = color))
    return () => metas.forEach((meta, index) => (meta.content = before[index]))
  }, [color])
}

export function YearReview() {
  const params = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const year = Number(params.ano)
  const summary = useYearSummary(year)
  const { data: members } = useMembers()
  const { data: lists } = useLists()
  const { data: categories } = useCategories()
  const reducedMotion = useReducedMotion()

  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  // Keyboard or screen-reader use: no auto-advance.
  const [manual, setManual] = useState(false)
  const [drag, setDrag] = useState(0)
  const [sharing, setSharing] = useState(false)

  const stories = summary ? availableStories(summary) : (['intro'] as StoryId[])
  const last = stories.length - 1
  const current = stories[Math.min(index, last)]
  const theme = THEMES[current]
  const auto = !reducedMotion && !manual && index < last

  useThemeColor(theme.bar)

  const close = useCallback(() => {
    // Back to where the player was opened from; to Início when opened directly.
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
    else navigate('/', { replace: true })
  }, [navigate])

  // Where the current segment is, kept across a pause.
  const progressRef = useRef(0)
  const go = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(last, next)))
      progressRef.current = 0
      setProgress(0)
    },
    [last],
  )

  // Auto-advance: the current segment fills over STORY_MS, then the next story.
  useEffect(() => {
    if (!auto || paused || !summary) return
    const start = performance.now() - progressRef.current * STORY_MS
    let frame = 0
    const tick = (now: number) => {
      const value = Math.min(1, (now - start) / STORY_MS)
      if (value >= 1) {
        go(index + 1)
        return
      }
      progressRef.current = value
      setProgress(value)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [auto, paused, index, go, summary])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      else if (event.key === 'ArrowRight') go(index + 1)
      else if (event.key === 'ArrowLeft') go(index - 1)
      else if (event.key !== 'Tab') return
      setManual(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, go, index])

  // Long press pauses; a swipe down closes. Either one cancels the tap.
  const gesture = useRef<{ x: number; y: number; timer: number; long: boolean; moved: boolean } | null>(null)
  const swallowClick = useRef(false)
  const onPointerDown = (event: React.PointerEvent) => {
    const timer = window.setTimeout(() => {
      if (gesture.current) gesture.current.long = true
      setPaused(true)
    }, LONG_PRESS_MS)
    gesture.current = { x: event.clientX, y: event.clientY, timer, long: false, moved: false }
  }
  const onPointerMove = (event: React.PointerEvent) => {
    const current = gesture.current
    if (!current) return
    const dy = event.clientY - current.y
    if (Math.abs(dy) > 10 || Math.abs(event.clientX - current.x) > 10) {
      current.moved = true
      window.clearTimeout(current.timer)
    }
    if (dy > 0 && current.moved) setDrag(dy)
  }
  const onPointerEnd = () => {
    const current = gesture.current
    if (!current) return
    window.clearTimeout(current.timer)
    swallowClick.current = current.long || current.moved
    gesture.current = null
    setPaused(false)
    if (drag > SWIPE_CLOSE_PX) close()
    else setDrag(0)
  }
  const tap = (step: number) => (event: React.MouseEvent) => {
    if (swallowClick.current) {
      swallowClick.current = false
      return
    }
    // A click without a pointer (detail 0) comes from the keyboard or VoiceOver.
    if (event.detail === 0) setManual(true)
    go(index + step)
  }

  const share = async () => {
    if (!summary || !categories) return
    setSharing(true)
    const top = summary.categories[0] && categories.find((category) => category.id === summary.categories[0].categoryId)
    try {
      await shareYear(
        {
          year: summary.year,
          title: t.yearReview.title(summary.year),
          names: t.yearReview.names(members?.[0]?.display_name ?? '', members?.[1]?.display_name ?? ''),
          total: formatWholeEuros(summary.totalCents),
          expenses: t.yearReview.imageSplit(summary.expenseCount),
          category: top
            ? { label: t.yearReview.imageTopCategory, value: `${top.icon} ${top.name} · ${formatWholeEuros(summary.categories[0].totalCents)}` }
            : null,
          month: summary.topMonth
            ? { label: t.yearReview.imageTopMonth, value: `${MONTHS[summary.topMonth.month - 1]} · ${formatWholeEuros(summary.topMonth.totalCents)}` }
            : null,
          quites:
            summary.outstandingCents === 0
              ? t.yearReview.imageQuites(summary.year + 1)
              : t.yearReview.imageLeft(formatMoney(summary.outstandingCents)),
        },
        t.yearReview.shareTitle(summary.year),
      )
    } catch {
      toast({ kind: 'error', message: t.system.error })
    } finally {
      setSharing(false)
    }
  }

  const ready = summary && members && lists && categories
  const Story = STORIES[current]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.yearReview.dialog(year, index + 1, stories.length)}
      className="fixed inset-0 z-50 overflow-hidden select-none"
      style={
        {
          background: theme.bg,
          color: theme.fg,
          touchAction: 'none',
          transform: drag ? `translateY(${drag}px)` : undefined,
          transition: drag ? undefined : 'transform 0.2s ease-out',
          '--story-fg': theme.fg,
        } as CSSProperties
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <div aria-hidden="true" className="absolute -top-[170px] -right-[230px] size-[520px] rounded-full" style={{ background: theme.a }} />
      <div aria-hidden="true" className="absolute -bottom-[120px] -left-[190px] size-[380px] rounded-full" style={{ background: theme.b }} />

      <div className="absolute inset-x-3 z-30 flex gap-1" style={{ top: 'calc(env(safe-area-inset-top) + 10px)' }} aria-hidden="true">
        {stories.map((id, k) => (
          <span
            key={id}
            className="h-[3px] flex-1 overflow-hidden rounded-[2px]"
            style={{ background: theme.fg === '#FFFFFF' ? 'rgba(255,255,255,0.35)' : 'rgba(43,26,0,0.25)' }}
          >
            <span
              className="block h-full"
              style={{
                width: `${k < index ? 100 : k === index ? (auto ? progress * 100 : 100) : 0}%`,
                background: theme.fg,
              }}
            />
          </span>
        ))}
      </div>

      <div
        className="absolute right-2 left-4 z-30 flex h-11 items-center gap-2"
        style={{ top: 'calc(env(safe-area-inset-top) + 22px)' }}
      >
        {members && members.length >= 2 && (
          <span className="flex items-center" aria-hidden="true">
            <Avatar member={members[0]} size={26} className="border-2 border-[var(--story-fg)] text-[10px]" />
            <Avatar member={members[1]} size={26} className="-ml-2 border-2 border-[var(--story-fg)] text-[10px]" />
          </span>
        )}
        <span className="flex-1 text-[14px] font-semibold opacity-90">{t.yearReview.title(year)}</span>
        <button
          type="button"
          aria-label={t.yearReview.close}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={close}
          className="flex size-11 items-center justify-center"
        >
          <Icon name="close" size={20} strokeWidth={2.6} />
        </button>
      </div>

      <button
        type="button"
        aria-label={t.yearReview.previous}
        disabled={index === 0}
        onClick={tap(-1)}
        className="absolute bottom-0 left-0 z-10 w-[35%] cursor-pointer"
        style={{ top: 'calc(env(safe-area-inset-top) + 68px)' }}
      />
      <button
        type="button"
        aria-label={t.yearReview.next}
        disabled={index === last}
        onClick={tap(1)}
        className="absolute right-0 bottom-0 z-10 w-[65%] cursor-pointer"
        style={{ top: 'calc(env(safe-area-inset-top) + 68px)' }}
      />

      <div
        key={current}
        aria-live="polite"
        className={`pointer-events-none absolute inset-x-6 flex flex-col [container-type:inline-size] ${current === 'end' ? 'z-20' : 'z-0'}`}
        style={{ top: 'calc(env(safe-area-inset-top) + 84px)', bottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
      >
        {ready ? (
          <Story
            summary={summary}
            members={members}
            lists={lists}
            categories={categories}
            stories={stories.length}
            fg={theme.fg}
            isCurrentYear={year === parseISODate(reviewToday()).year}
            onShare={share}
            sharing={sharing}
            onRestart={() => {
              swallowClick.current = false
              go(0)
            }}
          />
        ) : (
          <Column center>
            <span className="text-[17px] font-semibold opacity-85">{t.yearReview.loading}</span>
          </Column>
        )}
      </div>
    </div>
  )
}
