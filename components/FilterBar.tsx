'use client'

import type { TaskFilters, TaskStatus } from '@/lib/types'

interface FilterBarProps {
  filters: TaskFilters
  onChange: (f: TaskFilters) => void
}

const STATUS_OPTIONS: { label: string; value: TaskStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Todo', value: 'todo' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Done', value: 'done' },
]

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  function setStatus(status: TaskStatus | undefined) {
    onChange({ ...filters, status })
  }

  function toggleSort() {
    onChange({ ...filters, sort: filters.sort === 'priority' ? 'date' : 'priority' })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status filter pills */}
      <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/60 p-1">
        {STATUS_OPTIONS.map(({ label, value }) => {
          const active = filters.status === value
          return (
            <button
              key={label}
              onClick={() => setStatus(value)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                active
                  ? 'bg-zinc-600 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Sort toggle */}
      <button
        onClick={toggleSort}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
        </svg>
        {filters.sort === 'priority' ? 'By Priority' : 'By Date'}
      </button>
    </div>
  )
}
