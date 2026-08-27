import Icon from './Icon.jsx';
import PageHeader from './PageHeader.jsx';

export default function NotFoundPage({ onMenu }) {
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
          <Icon name="alert" size={18} />
        </span>
        <h3>404 — Not found</h3>
        <p>Check the URL or navigate back to the dashboard.</p>
      </div>
    </>
  );
}
