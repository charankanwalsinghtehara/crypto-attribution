function PageHeader({
  eyebrow,
  title,
  description,
  action
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && (
          <span className="page-eyebrow">
            {eyebrow}
          </span>
        )}

        <h2>{title}</h2>

        {description && (
          <p>{description}</p>
        )}
      </div>

      {action && (
        <div className="page-header-action">
          {action}
        </div>
      )}
    </div>
  );
}

export default PageHeader;