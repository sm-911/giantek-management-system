// ─── StatCard ──────────────────────────────────────────────────────────────────
// Reusable dashboard stat card with icon, value, label, and trend/color.
const StatCard = ({ label, value, icon, color = 'var(--primary)', subtext }) => {
  return (
    <div className="stat-card">
      <div className="stat-card__icon" style={{ background: `${color}22`, color }}>
        {icon}
      </div>
      <div className="stat-card__body">
        <p className="stat-card__value">{value}</p>
        <p className="stat-card__label">{label}</p>
        {subtext && <p className="stat-card__subtext">{subtext}</p>}
      </div>
    </div>
  );
};

export default StatCard;
