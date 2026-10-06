type MetricCardProps = { icon: string; label: string; value: string };

export function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <article className="metric">
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <div className="metric-value">{value}</div>
    </article>
  );
}
