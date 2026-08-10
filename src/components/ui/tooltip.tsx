"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TOOLTIP_OFFSET_X = 18
const TOOLTIP_OFFSET_Y = 18
const TOOLTIP_EDGE_GAP = 18
const TOOLTIP_MAX_WIDTH = 320
const TOOLTIP_ESTIMATED_HEIGHT = 220

const tooltipCardClassName =
  "pointer-events-none z-[1200] w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-[22px] border border-[rgba(241,210,191,0.18)] bg-[radial-gradient(circle_at_top_left,rgba(241,210,191,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(230,116,59,0.16),transparent_30%),linear-gradient(180deg,rgba(27,20,16,0.98),rgba(11,9,8,0.96))] text-white shadow-[0_24px_80px_rgba(0,0,0,0.46)] backdrop-blur-xl"

function formatValue(value: any): string {
  if (value === undefined || value === null || value === "") return "-"
  if (typeof value === "number") {
    if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(2)
    if (Number.isInteger(value)) return value.toString()
    return value.toFixed(3)
  }
  return String(value)
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (str) => str.toUpperCase())
}

function formatCoordinate(value?: number): string {
  return value === undefined || value === null || !Number.isFinite(value) ? "-" : value.toFixed(5)
}

function formatPercent(value?: number): string {
  return value === undefined || value === null || !Number.isFinite(value) ? "-" : `${value.toFixed(3)}%`
}

function getTooltipPosition(left: number, top: number) {
  if (typeof window === "undefined") {
    return {
      left,
      top,
    }
  }

  const maxLeft = Math.max(
    TOOLTIP_EDGE_GAP,
    window.innerWidth - TOOLTIP_MAX_WIDTH - TOOLTIP_EDGE_GAP
  )
  const maxTop = Math.max(
    TOOLTIP_EDGE_GAP,
    window.innerHeight - TOOLTIP_ESTIMATED_HEIGHT - TOOLTIP_EDGE_GAP
  )

  return {
    left: Math.min(Math.max(left, TOOLTIP_EDGE_GAP), maxLeft),
    top: Math.min(Math.max(top, TOOLTIP_EDGE_GAP), maxTop),
  }
}

function TooltipCard({
  left,
  top,
  eyebrow,
  title,
  badge,
  rows,
  testId,
}: {
  left: number
  top: number
  eyebrow: string
  title: string
  badge?: string
  rows: Array<{ label: string; value: string }>
  testId?: string
}) {
  const position = getTooltipPosition(left, top)

  return (
    <div
      data-testid={testId}
      className={tooltipCardClassName}
      style={{
        position: "fixed",
        left: position.left,
        top: position.top,
        transform: `translate(${TOOLTIP_OFFSET_X}px, ${TOOLTIP_OFFSET_Y}px)`,
      }}
    >
      <div className="relative px-4 py-3.5">
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-white/10 pb-2.5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f1d2bf]/62">
              {eyebrow}
            </p>
            <h4 className="mt-1 truncate text-sm font-semibold text-white/96">{title}</h4>
          </div>
          {badge ? (
            <span className="rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/62">
              {badge}
            </span>
          ) : null}
        </div>
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li
              key={`${row.label}-${row.value}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.045] px-3 py-2"
            >
              <span className="text-[11px] uppercase tracking-[0.16em] text-white/44">{row.label}</span>
              <span className="text-right text-[12px] font-medium leading-5 text-white/92">{row.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// Consistent tooltip styles matching the design system
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 max-w-[320px] overflow-hidden rounded-[18px] border border-[rgba(255,239,229,0.14)]",
      "bg-[radial-gradient(circle_at_top_left,rgba(241,210,191,0.1),transparent_38%),linear-gradient(180deg,rgba(27,20,16,0.98),rgba(11,9,8,0.96))]",
      "px-3.5 py-2.5 text-sm text-white shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur-xl",
      "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// ============================================
// Data Tooltip Components - For all data viewers
// ============================================

interface DataTooltipProps {
  data: {
    display: boolean;
    top: number;
    left: number;
    content: any;
  } | null;
  title?: string;
  fields?: string[];
}

// Generic Data Tooltip - Works with any data structure
const DataTooltip = ({ data, title = "Entity Properties", fields }: DataTooltipProps) => {
  if (!data || !data.display || !data.content) return null;

  // Get all entries or specific fields
  const entries = fields
    ? fields.filter((f) => f in data.content).map((f) => [f, data.content[f]] as const)
    : Object.entries(data.content).filter(([_, v]) => v !== undefined && v !== null);

  return (
    <TooltipCard
      left={data.left}
      top={data.top}
      eyebrow="Entity"
      title={title}
      testId="entity-tooltip"
      rows={entries.map(([key, value]) => ({
        label: formatKey(key),
        value: formatValue(value),
      }))}
    />
  )
}

// Drillhole-specific tooltip
interface DrillholeTooltipProps {
  data: {
    display: boolean;
    top: number;
    left: number;
    content: {
      hole_id?: string | number;
      latitude?: number;
      longitude?: number;
      depth_from?: number;
      depth_to?: number;
      lithology?: string;
      graphitic_carbon?: number;
      max_graphitic_carbon?: number;
    };
  } | null;
}

const DrillholeTooltip = ({ data }: DrillholeTooltipProps) => {
  if (!data || !data.display || !data.content) return null;

  const { content } = data;
  const intervalLabel =
    content.depth_from !== undefined && content.depth_to !== undefined
      ? `${formatValue(content.depth_from)} m - ${formatValue(content.depth_to)} m`
      : null

  const rows = [
    { label: "Latitude", value: formatCoordinate(content.latitude) },
    { label: "Longitude", value: formatCoordinate(content.longitude) },
    ...(intervalLabel ? [{ label: "Interval", value: intervalLabel }] : []),
    ...(content.lithology ? [{ label: "Lithology", value: String(content.lithology) }] : []),
    ...(content.graphitic_carbon !== undefined
      ? [{ label: content.max_graphitic_carbon !== undefined ? "Avg. TGC" : "TGC", value: formatPercent(content.graphitic_carbon) }]
      : []),
    ...(content.max_graphitic_carbon !== undefined
      ? [{ label: "Max. TGC", value: formatPercent(content.max_graphitic_carbon) }]
      : []),
  ].filter((row) => row.value !== "-")

  return (
    <TooltipCard
      left={data.left}
      top={data.top}
      eyebrow="Drillhole"
      title={String(content.hole_id ?? "Unknown")}
      badge="Hover"
      testId="drillhole-tooltip"
      rows={rows.length > 0 ? rows : [{ label: "Status", value: "No data" }]}
    />
  )
}

// Block Model tooltip
interface BlockModelTooltipProps {
  data: {
    display: boolean;
    top: number;
    left: number;
    content: any;
  } | null;
}

const BlockModelTooltip = ({ data }: BlockModelTooltipProps) => {
  if (!data || !data.display || !data.content) return null;

  const entries = Object.entries(data.content).filter(
    ([key, v]) =>
      !["id", "Id", "block_id", "Block ID", "classification", "RescCalc"].includes(key) &&
      v !== undefined &&
      v !== null
  );

  const title =
    data.content.block_id ??
    data.content.BlockID ??
    data.content.BlockId ??
    data.content.id ??
    data.content.Id ??
    "Block sample"

  const badge = data.content.classification ?? data.content.RescCalc ?? undefined

  return (
    <TooltipCard
      left={data.left}
      top={data.top}
      eyebrow="Block model"
      title={String(title)}
      badge={badge ? String(badge) : undefined}
      testId="block-model-tooltip"
      rows={entries.map(([key, value]) => ({
        label: formatKey(key),
        value: formatValue(value),
      }))}
    />
  )
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  DataTooltip,
  DrillholeTooltip,
  BlockModelTooltip,
}
