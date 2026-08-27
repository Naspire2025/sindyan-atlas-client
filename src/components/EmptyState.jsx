import Icon from './Icon.jsx';

export default function EmptyState({ icon = 'projects', title, message, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon"><Icon name={icon} size={18} /></span>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}
