import './OverviewChart.css';
export default function OverviewChart({ summary = {} }) {
  const total = summary?.claimed || 0;
  const proven = total ? ((summary?.proven || 0) / total) * 100 : 0;
  const partial = total ? ((summary?.partial || 0) / total) * 100 : 0;
  const legend = [
    { label: 'Proven', value: summary?.proven || 0, color: '#85ad61' },
    { label: 'Partial', value: summary?.partial || 0, color: '#dfba64' },
    { label: 'Claimed-only', value: summary?.claimedOnly || 0, color: '#e2e6dc' }
  ];
  return (
    <div className="panel p-6">
      <div className="mb-6">
        <h2 className="font-bold">The evidence picture</h2>
        <p className="mt-1 text-xs text-muted">Skills claimed in the resume</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-8">
        <div
          className="overview-donut"
          style={{ background: `conic-gradient(#85ad61 0% ${proven}%, #dfba64 ${proven}% ${proven+partial}%, #e2e6dc ${proven+partial}% 100%)` }}
          role="img"
          aria-label={`${summary?.proven || 0} proven, ${summary?.partial || 0} partial, ${summary?.claimedOnly || 0} claimed-only, out of ${total} claimed skills`}
        >
          <div>
            <strong className="font-display text-4xl font-bold tracking-tight">{total}</strong>
            <span className="mt-1 text-[10px] text-muted">claimed skills</span>
          </div>
        </div>
        <div className="min-w-36 space-y-4">
          {legend.map(item => (
            <div className="flex items-center gap-2.5 text-xs" key={item.label}>
              <span className="size-2 rounded-sm" style={{ background: item.color }} />
              <span className="flex-1 text-muted">{item.label}</span>
              <span className="ml-5 font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

