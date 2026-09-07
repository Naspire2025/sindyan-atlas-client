import { ChevronDown } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({ page, totalPages, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination-controls" aria-label="Pagination">
      <button
        className="icon-button"
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronDown size={14} />
      </button>
      <span className="pagination-info">
        Page {page} of {totalPages}
      </span>
      <button
        className="icon-button"
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronDown size={14} />
      </button>
    </nav>
  );
}
