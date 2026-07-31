import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import './App.css'

type GamePhase = 'setup' | 'playing' | 'finished' | 'focus' | 'complete'

type Settings = {
  min: number
  max: number
}

type SettingsDraft = {
  min: string
  max: string
}

type DropTone = 'mint' | 'gold' | 'coral' | 'blue'

type Drop = {
  id: number
  x: number
  y: number
  vx: number
  size: number
  speed: number
  tone: DropTone
}

type Stats = {
  caught: number
  missed: number
}

type Result = {
  minutes: number
  catchRate: number
}

const GAME_DURATION_MS = 60_000
const BASKET_WIDTH = 76
const BASKET_HEIGHT = 48
const BASKET_BOTTOM = 22
const DROP_TONES: DropTone[] = ['mint', 'gold', 'coral', 'blue']

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const randomBetween = (min: number, max: number) =>
  min + Math.random() * (max - min)

const parseDraftNumber = (value: string) => {
  const trimmedValue = value.trim()

  if (trimmedValue === '') return null

  const parsedValue = Number(trimmedValue)

  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN
}

const validateSettingsDraft = (draft: SettingsDraft) => {
  const min = parseDraftNumber(draft.min)
  const max = parseDraftNumber(draft.max)

  if (min === null || max === null) {
    return { settings: null, error: null }
  }

  if (Number.isNaN(min) || Number.isNaN(max)) {
    return { settings: null, error: '숫자만 입력할 수 있습니다.' }
  }

  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    return { settings: null, error: '분 단위 정수로 입력하세요.' }
  }

  if (min < 1 || min > 179) {
    return { settings: null, error: '최소 시간은 1~179분 사이여야 합니다.' }
  }

  if (max < 2 || max > 180) {
    return { settings: null, error: '최대 시간은 2~180분 사이여야 합니다.' }
  }

  if (max <= min) {
    return { settings: null, error: '최대 시간은 최소 시간보다 커야 합니다.' }
  }

  return { settings: { min, max }, error: null }
}

const formatClock = (ms: number) => {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const calculatePomodoroMinutes = (
  stats: Stats,
  minMinutes: number,
  maxMinutes: number,
) => {
  const attempts = stats.caught + stats.missed
  const catchRate = attempts === 0 ? 0 : stats.caught / attempts
  const weightedRate = Math.pow(catchRate, 1.18)
  const minutes = Math.round(maxMinutes - weightedRate * (maxMinutes - minMinutes))

  return clamp(minutes, minMinutes, maxMinutes)
}

function createDrop(stageWidth: number, progress: number, id: number): Drop {
  const size = randomBetween(22, 34)
  const tone = DROP_TONES[Math.floor(Math.random() * DROP_TONES.length)] ?? 'mint'
  const speed = randomBetween(260, 420) + progress * 260

  return {
    id,
    x: randomBetween(10, Math.max(12, stageWidth - size - 10)),
    y: -size,
    vx: randomBetween(-82, 82) + randomBetween(-42, 42) * progress,
    size,
    speed,
    tone,
  }
}

function PomoGame() {
  const [phase, setPhase] = useState<GamePhase>('setup')
  const [settings, setSettings] = useState<Settings>({ min: 15, max: 45 })
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>({
    min: '15',
    max: '45',
  })
  const [remainingMs, setRemainingMs] = useState(GAME_DURATION_MS)
  const [drops, setDrops] = useState<Drop[]>([])
  const [stats, setStats] = useState<Stats>({ caught: 0, missed: 0 })
  const [result, setResult] = useState<Result | null>(null)
  const [focusRemainingMs, setFocusRemainingMs] = useState(0)
  const [focusPaused, setFocusPaused] = useState(false)

  const stageRef = useRef<HTMLDivElement | null>(null)
  const dropsRef = useRef<Drop[]>([])
  const basketXRef = useRef(0.5)
  const statsRef = useRef<Stats>({ caught: 0, missed: 0 })
  const activeSettingsRef = useRef<Settings>({ min: 15, max: 45 })
  const nextDropIdRef = useRef(1)

  const draftValidation = useMemo(
    () => validateSettingsDraft(settingsDraft),
    [settingsDraft],
  )
  const hasValidSettings = draftValidation.settings !== null
  const livePomodoroMinutes = useMemo(
    () => calculatePomodoroMinutes(stats, settings.min, settings.max),
    [settings.max, settings.min, stats],
  )

  const setBasketPosition = useCallback((nextX: number) => {
    const clampedX = clamp(nextX, 0.06, 0.94)

    basketXRef.current = clampedX
    stageRef.current?.style.setProperty('--basket-x', `${clampedX * 100}%`)
  }, [])

  const finishGame = useCallback(() => {
    const finalStats = statsRef.current
    const activeSettings = activeSettingsRef.current
    const attempts = finalStats.caught + finalStats.missed
    const catchRate = attempts === 0 ? 0 : finalStats.caught / attempts
    const minutes = calculatePomodoroMinutes(
      finalStats,
      activeSettings.min,
      activeSettings.max,
    )

    dropsRef.current = []
    setDrops([])
    setRemainingMs(0)
    setResult({ minutes, catchRate })
    setPhase('finished')
  }, [])

  const startGame = useCallback(() => {
    if (!draftValidation.settings) return

    const nextSettings = draftValidation.settings

    activeSettingsRef.current = nextSettings
    statsRef.current = { caught: 0, missed: 0 }
    dropsRef.current = []
    nextDropIdRef.current = 1

    setSettings(nextSettings)
    setSettingsDraft({
      min: String(nextSettings.min),
      max: String(nextSettings.max),
    })
    setStats({ caught: 0, missed: 0 })
    setResult(null)
    setDrops([])
    setRemainingMs(GAME_DURATION_MS)
    setBasketPosition(0.5)
    setPhase('playing')
  }, [draftValidation.settings, setBasketPosition])

  const restart = useCallback(() => {
    dropsRef.current = []
    statsRef.current = { caught: 0, missed: 0 }

    setPhase('setup')
    setDrops([])
    setStats({ caught: 0, missed: 0 })
    setRemainingMs(GAME_DURATION_MS)
    setFocusRemainingMs(0)
    setFocusPaused(false)
  }, [])

  const startFocusTimer = useCallback(() => {
    if (!result) return

    setFocusRemainingMs(result.minutes * 60_000)
    setFocusPaused(false)
    setPhase('focus')
  }, [result])

  useEffect(() => {
    if (phase !== 'playing') return undefined

    const handlePointerMove = (event: PointerEvent) => {
      const stage = stageRef.current
      if (!stage) return

      const rect = stage.getBoundingClientRect()
      setBasketPosition((event.clientX - rect.left) / rect.width)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

      event.preventDefault()
      setBasketPosition(
        basketXRef.current + (event.key === 'ArrowLeft' ? -0.055 : 0.055),
      )
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [phase, setBasketPosition])

  useEffect(() => {
    if (phase !== 'playing') return undefined

    let frameId = 0
    let cancelled = false
    let lastTime = performance.now()
    const startTime = lastTime
    let nextDropAt = startTime + 90

    const tick = (now: number) => {
      if (cancelled) return

      const elapsedMs = now - startTime
      const progress = clamp(elapsedMs / GAME_DURATION_MS, 0, 1)
      const deltaSeconds = Math.min(0.04, (now - lastTime) / 1000)
      const stage = stageRef.current
      const stageWidth = stage?.clientWidth ?? 720
      const stageHeight = stage?.clientHeight ?? 520
      const basketCenter = basketXRef.current * stageWidth
      const basketLeft = basketCenter - BASKET_WIDTH / 2
      const basketRight = basketCenter + BASKET_WIDTH / 2
      const basketTop = stageHeight - BASKET_HEIGHT - BASKET_BOTTOM
      let caught = 0
      let missed = 0
      let nextDrops = dropsRef.current
        .map((drop) => {
          const minX = 6
          const maxX = Math.max(minX, stageWidth - drop.size - 6)
          let nextX = drop.x + drop.vx * deltaSeconds
          let nextVx = drop.vx

          if (nextX <= minX || nextX >= maxX) {
            nextX = clamp(nextX, minX, maxX)
            nextVx = -nextVx
          }

          return {
            ...drop,
            x: nextX,
            y: drop.y + drop.speed * deltaSeconds,
            vx: nextVx,
          }
        })
        .filter((drop) => {
          const dropRight = drop.x + drop.size
          const dropBottom = drop.y + drop.size
          const overlapsBasket =
            dropRight > basketLeft + 8 && drop.x < basketRight - 8
          const hitsBasket =
            overlapsBasket &&
            dropBottom >= basketTop &&
            drop.y <= basketTop + BASKET_HEIGHT

          if (hitsBasket) {
            caught += 1
            return false
          }

          if (drop.y > stageHeight + 12) {
            missed += 1
            return false
          }

          return true
        })

      if (now >= nextDropAt && elapsedMs < GAME_DURATION_MS - 800) {
        const burstCount =
          1 +
          (Math.random() < 0.28 + progress * 0.46 ? 1 : 0) +
          (Math.random() < progress * 0.22 ? 1 : 0)
        const newDrops = Array.from({ length: burstCount }, () => {
          const drop = createDrop(stageWidth, progress, nextDropIdRef.current)
          nextDropIdRef.current += 1
          return drop
        })

        nextDrops = [...nextDrops, ...newDrops]
        nextDropAt = now + randomBetween(145 - progress * 45, 280 - progress * 70)
      }

      if (caught > 0 || missed > 0) {
        const nextStats = {
          caught: statsRef.current.caught + caught,
          missed: statsRef.current.missed + missed,
        }

        statsRef.current = nextStats
        setStats(nextStats)
      }

      dropsRef.current = nextDrops
      setDrops(nextDrops)
      setRemainingMs(Math.max(0, GAME_DURATION_MS - elapsedMs))
      lastTime = now

      if (elapsedMs >= GAME_DURATION_MS) {
        finishGame()
        return
      }

      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
    }
  }, [finishGame, phase])

  useEffect(() => {
    if (phase !== 'focus' || focusPaused) return undefined

    const intervalId = window.setInterval(() => {
      setFocusRemainingMs((currentMs) => {
        const nextMs = Math.max(0, currentMs - 1000)

        if (nextMs === 0) {
          setFocusPaused(false)
          setPhase('complete')
        }

        return nextMs
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [focusPaused, phase])

  const stageStyle = {
    '--basket-x': '50%',
  } as CSSProperties

  return (
    <div className="pomo-game-route">
      <main className="pomo-game">
        <header className="app-header">
          <span className="brand-mark" aria-hidden="true"></span>
          <span>랜덤 뽀모도로</span>
        </header>

        {phase === 'setup' && (
          <section className="setup-panel" aria-labelledby="setup-title">
            <div className="setup-copy">
              <p className="eyebrow">60초 결정전</p>
              <h1 id="setup-title">잡은 만큼 짧아지는 뽀모도로</h1>
              <p className="lede">
                직접 고르기 싫은 긴 공부 시간을 게임 결과에 맡깁니다.
              </p>
            </div>

            <form
              className="settings-form"
              onSubmit={(event) => {
                event.preventDefault()
                if (hasValidSettings) startGame()
              }}
            >
              <label className="number-field">
                <span>최소</span>
                <input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  value={settingsDraft.min}
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value

                    setSettingsDraft((current) => ({
                      ...current,
                      min: nextValue,
                    }))
                  }}
                />
                <small>분</small>
              </label>

              <label className="number-field">
                <span>최대</span>
                <input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  value={settingsDraft.max}
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value

                    setSettingsDraft((current) => ({
                      ...current,
                      max: nextValue,
                    }))
                  }}
                />
                <small>분</small>
              </label>

              <button
                className="primary-button"
                type="submit"
                disabled={!hasValidSettings}
              >
                게임 시작
              </button>

              {draftValidation.error && (
                <p className="form-error">{draftValidation.error}</p>
              )}
            </form>
          </section>
        )}

        {phase === 'playing' && (
          <section className="play-layout" aria-label="낙하물 잡기 게임">
            <div className="scorebar">
              <div className="metric">
                <span>남은 시간</span>
                <strong>{formatClock(remainingMs)}</strong>
              </div>
              <div className="metric">
                <span>잡음</span>
                <strong>{stats.caught}</strong>
              </div>
              <div className="metric">
                <span>놓침</span>
                <strong>{stats.missed}</strong>
              </div>
              <div className="metric metric--accent">
                <span>현재 결과</span>
                <strong>{livePomodoroMinutes}분</strong>
              </div>
            </div>

            <div
              className="game-stage"
              ref={stageRef}
              style={stageStyle}
              tabIndex={0}
              aria-label="하늘에서 떨어지는 조각을 바구니로 잡는 60초 게임"
            >
              <div className="fall-zone" aria-hidden="true">
                {drops.map((drop) => (
                  <span
                    className={`drop drop--${drop.tone}`}
                    key={drop.id}
                    style={{
                      width: drop.size,
                      height: drop.size,
                      transform: `translate3d(${drop.x}px, ${drop.y}px, 0)`,
                    }}
                  >
                    <span className="drop-shine"></span>
                  </span>
                ))}
              </div>
              <div className="basket" aria-hidden="true">
                <span className="basket-lip"></span>
                <span className="basket-grid basket-grid--left"></span>
                <span className="basket-grid basket-grid--right"></span>
              </div>
            </div>
          </section>
        )}

        {phase === 'finished' && result && (
          <section className="result-panel" aria-labelledby="result-title">
            <p className="eyebrow">오늘의 시간</p>
            <h1 id="result-title">{result.minutes}분</h1>
            <div className="result-stats">
              <span>{stats.caught}개 잡음</span>
              <span>{Math.round(result.catchRate * 100)}%</span>
            </div>
            <div className="action-row">
              <button
                className="primary-button"
                type="button"
                onClick={startFocusTimer}
              >
                뽀모도로 시작
              </button>
              <button className="secondary-button" type="button" onClick={startGame}>
                다시 도전
              </button>
            </div>
          </section>
        )}

        {phase === 'focus' && (
          <section className="focus-panel" aria-labelledby="focus-title">
            <p className="eyebrow">뽀모도로 진행 중</p>
            <h1 id="focus-title">{formatClock(focusRemainingMs)}</h1>
            <div className="action-row">
              <button
                className="primary-button"
                type="button"
                onClick={() => setFocusPaused((current) => !current)}
              >
                {focusPaused ? '계속' : '일시정지'}
              </button>
              <button className="secondary-button" type="button" onClick={restart}>
                새 게임
              </button>
            </div>
          </section>
        )}

        {phase === 'complete' && (
          <section className="focus-panel" aria-labelledby="complete-title">
            <p className="eyebrow">완료</p>
            <h1 id="complete-title">끝</h1>
            <button
              className="primary-button"
              type="button"
              onClick={restart}
            >
              새 게임
            </button>
          </section>
        )}
      </main>
    </div>
  )
}

export default PomoGame
