function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "blue"
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon stat-icon-${tone}`}>
        <Icon size={21} />
      </div>

      <div className="stat-content">
        <span className="stat-label">{label}</span>

        <strong className="stat-value">{value}</strong>

        <span className="stat-description">
          {description}
        </span>
      </div>
    </article>
  );
}

export default StatCard;