/**
 * Chart primitives (Recharts) styled with system tokens. One series color = accent; comparisons use
 * accent + muted line. Axes are quiet; data is the loudest thing on the chart.
 */
import { Area, AreaChart, Bar, BarChart, CartesianGrid, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';

const axis = { stroke: 'var(--text-faint)', fontSize: 11, fontFamily: 'var(--font-mono)', tickLine: false, axisLine: false } as const;

function ChartTooltip({ active, payload, label, unit, labelFormat }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string; unit?: string; labelFormat?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md bg-raised px-3 py-2 text-xs [box-shadow:var(--elev-2),inset_0_0_0_1px_var(--line)]">
      <div className="mb-1 text-faint">{labelFormat && label ? labelFormat(label) : label}</div>
      {payload.map((p) => (
        <div key={p.name} className="type-data flex items-center gap-2 text-text">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.value.toLocaleString('en-US', { maximumFractionDigits: 1 })}
          {unit}
        </div>
      ))}
    </div>
  );
}

export function AreaTrend<T extends object>({
  data,
  x,
  y,
  height = 240,
  unit,
  xFormat,
}: {
  data: T[];
  x: keyof T & string;
  y: keyof T & string;
  height?: number;
  unit?: string;
  xFormat?: (v: string) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id={`fill-${y}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey={x} {...axis} tickFormatter={xFormat} dy={6} />
        <YAxis {...axis} width={48} />
        <Tooltip cursor={{ stroke: 'var(--line-strong)' }} content={<ChartTooltip unit={unit} labelFormat={xFormat} />} />
        <Area type="monotone" dataKey={y} stroke="var(--accent)" strokeWidth={2} fill={`url(#fill-${y})`} animationDuration={900} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Bars<T extends object>({
  data,
  x,
  y,
  height = 220,
  unit,
  xFormat,
  layout = 'horizontal',
}: {
  data: T[];
  x: keyof T & string;
  y: keyof T & string;
  height?: number;
  unit?: string;
  xFormat?: (v: string) => string;
  layout?: 'horizontal' | 'vertical';
}) {
  const vertical = layout === 'vertical';
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={vertical ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 8, left: vertical ? 8 : -18, bottom: 0 }}>
        <CartesianGrid vertical={vertical} horizontal={!vertical} stroke="var(--line)" />
        {vertical ? (
          <>
            <XAxis type="number" {...axis} />
            <YAxis type="category" dataKey={x} {...axis} width={110} tickFormatter={xFormat} />
          </>
        ) : (
          <>
            <XAxis dataKey={x} {...axis} tickFormatter={xFormat} dy={6} />
            <YAxis {...axis} width={48} />
          </>
        )}
        <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<ChartTooltip unit={unit} labelFormat={xFormat} />} />
        <Bar dataKey={y} fill="var(--accent)" radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={36} animationDuration={800} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SkillRadar({ data, height = 260 }: { data: { axis: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--line-strong)" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }} />
        <Radar dataKey="value" stroke="var(--accent)" strokeWidth={2} fill="var(--accent)" fillOpacity={0.22} animationDuration={900} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function ChartCard({ title, description, children, action }: { title: ReactNode; description?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg bg-surface p-5 [box-shadow:var(--elev-1),inset_0_0_0_1px_var(--line)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="type-title text-[16px] text-text">{title}</h3>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Ranked horizontal bars in plain HTML — label, bar, value. Crisper than SVG for short category lists. */
export function RankedBars({ data, unit = '' }: { data: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.label} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2.5rem] items-center gap-3 text-[13px]">
          <span className="truncate text-muted">{d.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-line">
            <motion.span
              className="block h-full rounded-full bg-accent"
              style={{ opacity: 1 - i * (0.5 / Math.max(1, data.length)) }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(d.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
          </span>
          <span className="type-data text-right text-text">
            {d.value}
            {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}
