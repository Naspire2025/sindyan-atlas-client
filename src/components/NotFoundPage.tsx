import { TriangleAlert } from 'lucide-react';

import PageHeader from './PageHeader.js';

interface NotFoundPageProps {
  onMenu: () => void;
}

export default function NotFoundPage({ onMenu }: NotFoundPageProps) {
  return (
    <>
      <PageHeader
        eyebrow="Error"
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        onMenu={onMenu}
      />
      <div className="empty-state">
        <span className="empty-state-icon">
          <TriangleAlert size={18} />
        </span>
        <h3>404 — Not found</h3>
        <p>Check the URL or navigate back to the dashboard.</p>
      </div>
    </>
  );
}
