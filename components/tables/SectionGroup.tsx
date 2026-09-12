'use client'

import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Table } from '@/types/pos'
import TableCard from './TableCard'

interface SectionGroupProps {
  sectionName: string
  tables: Table[]
  onTableClick: (table: Table) => void
  defaultOpen?: boolean
}

const SECTION_ICONS: Record<string, string> = {
  indoor: '🏠',
  garden: '🌿',
  terrace: '☀️',
  bar: '🍷',
  patio: '🌤️',
  rooftop: '🏙️',
  private: '🔒',
  vip: '⭐',
  lounge: '🛋️',
  pool: '🏊',
  beach: '🏖️',
}

const SECTION_BG: Record<string, string> = {
  indoor: 'bg-sky-50',
  garden: 'bg-green-50',
  terrace: 'bg-amber-50',
  bar: 'bg-purple-50',
  patio: 'bg-blue-50',
  rooftop: 'bg-slate-50',
  private: 'bg-rose-50',
  vip: 'bg-yellow-50',
  lounge: 'bg-indigo-50',
  pool: 'bg-cyan-50',
  beach: 'bg-teal-50',
}

function getSectionIcon(name: string): string {
  return SECTION_ICONS[name.toLowerCase()] ?? '🪑'
}

function getSectionBg(name: string): string {
  return SECTION_BG[name.toLowerCase()] ?? 'bg-slate-50'
}

export default function SectionGroup({
  sectionName,
  tables,
  onTableClick,
  defaultOpen = true,
}: SectionGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="mb-6">
      {/* Section Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center gap-3 mb-3 group"
      >
        {/* Icon */}
        <div
          className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-[16px] flex-shrink-0 ${getSectionBg(sectionName)}`}
          aria-hidden="true"
        >
          {getSectionIcon(sectionName)}
        </div>

        {/* Name */}
        <span className="text-[14px] font-bold text-slate-700">{sectionName}</span>

        {/* Count badge */}
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
          {tables.length} {tables.length === 1 ? 'table' : 'tables'}
        </span>

        {/* Divider */}
        <div className="flex-1 h-px bg-slate-200" />

        {/* Chevron */}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>

      {/* Collapsible grid — CSS max-height transition */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? `${tables.length * 300}px` : '0px' }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-1">
          {tables.map((table, i) => (
            <TableCard
              key={table.id}
              table={table}
              onClick={onTableClick}
              animationDelay={i * 40}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
