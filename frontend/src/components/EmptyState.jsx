import { FileSearch } from "lucide-react";

function EmptyState({
  title = "No records found",
  description = "There is no data available yet."
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <FileSearch size={26} />
      </div>

      <h3>{title}</h3>

      <p>{description}</p>
    </div>
  );
}

export default EmptyState;