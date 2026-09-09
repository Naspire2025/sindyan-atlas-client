import { useIntl, FormattedMessage } from 'react-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({ page, totalPages, onPageChange }: PaginationControlsProps) {
  const intl = useIntl();
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination-controls" aria-label={intl.formatMessage({ id: 'pagination.label' })}>
      <button
        className="icon-button"
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label={intl.formatMessage({ id: 'pagination.previousPage' })}
      >
        <ChevronLeft size={14} />
      </button>
      <span className="pagination-info">
        <FormattedMessage id="pagination.pageInfo" values={{ page, totalPages }} />
      </span>
      <button
        className="icon-button"
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label={intl.formatMessage({ id: 'pagination.nextPage' })}
      >
        <ChevronRight size={14} />
      </button>
    </nav>
  );
}