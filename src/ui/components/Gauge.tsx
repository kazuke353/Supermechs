/** Segmented console bar for HP (with a trailing damage ghost), energy and heat. */
export function Gauge({ kind, value, max, small, over }: { kind: 'hp' | 'en' | 'ht'; value: number; max: number; small?: boolean; over?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
  return (
    <div class={`gauge ${kind}${small ? ' small' : ''}${over ? ' over' : ''}`}>
      {kind === 'hp' && <u style={{ width: `${pct}%` }} />}
      <i style={{ width: `${pct}%` }} />
      <span>
        {Math.max(0, Math.round(value)).toLocaleString()} / {Math.round(max).toLocaleString()}
      </span>
    </div>
  )
}
