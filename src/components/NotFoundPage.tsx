import { useIntl } from 'react-intl';
import { TriangleAlert } from 'lucide-react';

import PageHeader from './PageHeader.js';

interface NotFoundPageProps {
  onMenu: () => void;
}

export default function NotFoundPage({ onMenu }: NotFoundPageProps) {
  const intl = useIntl();
  return (
    <>
      <PageHeader
        eyebrow={intl.formatMessage({ id: 'permission.error' })}
        title={intl.formatMessage({ id: 'permission.title' })}
        description={intl.formatMessage({ id: 'permission.description' })}
        onMenu={onMenu}
      />
      <div className="empty-state">
        <span className="empty-state-icon">
          <TriangleAlert size={18} />
        </span>
        <h3>{intl.formatMessage({ id: 'permission.notFound404' })}</h3>
        <p>{intl.formatMessage({ id: 'permission.checkUrl' })}</p>
      </div>
    </>
  );
}
