'use client'

import React from 'react'
import { Users, ArrowRight } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { Table, TableStatus } from '@/types/pos'
import { getStatusLabel, TableStatusLabel } from '@/types/table'

interface TableCardProps {
  table: Table & { occupiedSince?: string | null; activeOrderNumber?: string | null }
  onClick: (table: Table) => void
  animationDelay?: number
}

const STATUS_CONFIG: Record<
  TableStatusLabel,
  {
    dot: string
    topBorder: string
    cardBorder: string
    cardBorderHover: string
    iconBg: string
    iconColor: string
    badgeBg: string
    badgeText: string
    label: string
  }
> = {
  available: {
    dot: 'bg-green-500',
    topBorder: 'bg-green-500',
    cardBorder: 'border-[#E4E6EA]',
    cardBorderHover: 'hover:border-[#BBF7D0]',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    badgeBg: 'bg-green-50',
    badgeText: 'text-green-700',
    label: 'Available',
  },
  occupied: {
    dot: 'bg-[#E8651A]',
    topBorder: 'bg-[#E8651A]',
    cardBorder: 'border-[#FFD4B3]',
    cardBorderHover: 'hover:border-[#E8651A]',
    iconBg: 'bg-orange-50',
    iconColor: 'text-[#E8651A]',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-[#E8651A]',
    label: 'Occupied',
  },
  reserved: {
    dot: 'bg-amber-400',
    topBorder: 'bg-amber-400',
    cardBorder: 'border-[#FDE68A]',
    cardBorderHover: 'hover:border-amber-400',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    label: 'Reserved',
  },
}

function TableIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Table top */}
      <rect x="2" y="6" width="20" height="3" rx="1.5" />
      {/* Legs */}
      <line x1="6" y1="9" x2="5" y2="18" />
      <line x1="18" y1="9" x2="19" y2="18" />
      {/* Under-shelf */}
      <line x1="5.5" y1="14" x2="18.5" y2="14" />
    </svg>
  )
}

function elapsedMinutes(since: string): number {
  return Math.floor((Date.now() - new Date(since).getTime()) / 60000)
}

export default function TableCard({ table, onClick, animationDelay = 0 }: TableCardProps) {
  const { t } = useLocale()
  const status = getStatusLabel(table.status)
  const cfg = STATUS_CONFIG[status]

  const mins =
    status === 'occupied' && table.occupiedSince
      ? elapsedMinutes(table.occupiedSince)
      : null

  return (
    <button
      type="button"
      onClick={() => onClick(table)}
      style={{ animationDelay: `${animationDelay}ms` }}
      className={[
        'relative w-full overflow-hidden rounded-2xl border-[1.5px] bg-white text-start',
        'touch-manipulation transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none active:scale-[0.98]',
        'animate-fadeUp',
        cfg.cardBorder,
        cfg.cardBorderHover,
      ].join(' ')}
      aria-label={`${table.displayName || table.name} - ${t(
        status === 'available'
          ? 'tableEmpty'
          : status === 'occupied'
            ? 'tableOccupied'
            : 'tableReserved'
      )}`}
    >
      {/* Top accent bar */}
      <div className={`h-[3px] w-full ${cfg.topBorder}`} />

      {/* Status dot — top right */}
      <span
        className={`absolute top-3 end-3 w-2.5 h-2.5 rounded-full ${cfg.dot} ${
          status === 'available' ? 'animate-pulse' : ''
        }`}
      />

      <div className="p-4">
        {/* Icon */}
        <div
          className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${cfg.iconBg}`}
        >
          <TableIcon className={`h-6 w-6 ${cfg.iconColor}`} />
        </div>

        {/* Name */}
        <p className="mb-1 line-clamp-2 text-sm font-bold leading-tight text-slate-800 md:text-base">
          {table.displayName || table.name}
        </p>

        {/* Seat count */}
        <div className="mb-3 flex items-center gap-1.5 text-slate-500">
          <Users className="h-4 w-4 flex-shrink-0 text-slate-400" />
          <span className="text-sm md:text-base">
            {table.capacity} {t('seatsLabel')}
          </span>
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex min-h-8 items-center rounded-full px-3 py-1 text-sm font-semibold ${cfg.badgeBg} ${cfg.badgeText}`}
        >
          {t(
            status === 'available'
              ? 'tableEmpty'
              : status === 'occupied'
                ? 'tableOccupied'
                : 'tableReserved'
          )}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
        <span
          className={`min-w-0 text-sm ${status === 'occupied' ? 'font-medium text-[#E8651A]' : 'text-slate-500'}`}
        >
          {status === 'occupied'
            ? table.activeOrderNumber
              ? `${t('orderLabel')} #${table.activeOrderNumber}${mins !== null ? ` · ${mins} ${t('minAgo')}` : ''}`
              : mins !== null
              ? `${t('tableOccupied')} · ${mins} ${t('minAgo')}`
              : t('tableOccupied')
            : status === 'reserved'
            ? t('tableReserved')
            : t('noActiveOrders')}
        </span>
        <ArrowRight className="rtl:-scale-x-100 h-4 w-4 flex-shrink-0 text-slate-300" />
      </div>
    </button>
  )
}
