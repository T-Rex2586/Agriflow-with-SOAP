'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function getPageNumbers(total: number, current: number): (number | 'ellipsis')[] {
  if (total <= 3) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | 'ellipsis')[] = []

  if (current <= 2) {
    pages.push(1, 2, 3, 'ellipsis', total)
  } else if (current >= total - 1) {
    pages.push(1, 'ellipsis', total - 2, total - 1, total)
  } else {
    pages.push(1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total)
  }

  return pages
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = getPageNumbers(totalPages, currentPage)

  const btnBase: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: '8px',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: '#ddd',
    background: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '13px',
    color: '#333',
    transition: 'all 0.15s',
  }

  const btnActive: React.CSSProperties = {
    ...btnBase,
    background: '#1e6b1e',
    borderColor: '#1e6b1e',
    color: 'white',
  }

  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    cursor: 'not-allowed',
    opacity: 0.5,
  }

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <button
        type="button"
        aria-label="Halaman sebelumnya"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        style={currentPage === 1 ? btnDisabled : btnBase}
      >
        <ChevronLeft size={14} />
      </button>

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e-${i}`} style={{ width: 24, textAlign: 'center', fontSize: '14px', color: '#888' }}>
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-label={`Halaman ${p}`}
            onClick={() => onPageChange(p)}
            style={p === currentPage ? btnActive : btnBase}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        aria-label="Halaman selanjutnya"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        style={currentPage === totalPages ? btnDisabled : btnBase}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}
