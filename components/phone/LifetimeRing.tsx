export function LifetimeRing({ color, progress, muted = false }: { color: string; progress: number; muted?: boolean }) {
  const circumference = 2 * Math.PI * 74;
  return <div className={`phone-lifetime-ring${muted ? " ring-muted" : ""}`} aria-hidden="true"><svg width="168" height="168" viewBox="0 0 168 168"><circle cx="84" cy="84" r="74" fill="none" stroke="var(--phone-track)" strokeWidth="10" /><circle cx="84" cy="84" r="74" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, progress)))} transform="rotate(-90 84 84)" /></svg><span style={{ background: color }} /></div>;
}
