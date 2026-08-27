import Icon from './Icon.jsx';

export default function PaginationControls({ page, totalPages, onPageChange }) {
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
        <Icon name="chevron" size={14} />
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
        <Icon name="chevron" size={14} />
      </button>
    </nav>
  );
}
