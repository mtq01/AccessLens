import { Icon } from "../Icon";

export default function Dynamic({ dynamicIssues = [] }) {
  if (dynamicIssues.length === 0) {
    return (
      <div className="dynamic-tab">
        <div className="tab-explainer">
          <div className="tab-explainer-title">Form error detection</div>
          <div className="tab-explainer-body">
            Catches form validation errors that JavaScript adds after submit. Those errors need <code>role="alert"</code> so screen readers hear them.
          </div>
          <div className="tab-step"><span className="tab-step-num">1</span><span>Run a scan from the Scan tab first</span></div>
          <div className="tab-step"><span className="tab-step-num">2</span><span>Submit a form with empty or invalid fields</span></div>
          <div className="tab-step"><span className="tab-step-num">3</span><span>Issues appear here automatically</span></div>
        </div>
      </div>
    );
  }

  // Group issues by category for display
  const groups = {};
  dynamicIssues.forEach(i => {
    const c = i.category || i.description || "Content";
    if (!groups[c]) groups[c] = [];
    groups[c].push(i);
  });

  return (
    <div className="dynamic-tab">
      <div className="dynamic-summary">
        <Icon name="info_outline" size={14}/>
        <span>
          <strong>{dynamicIssues.length}</strong> pattern{dynamicIssues.length!==1?"s":""} found. Fix each once to fix all copies.
        </span>
      </div>
      <div className="violations">
        {Object.entries(groups).slice(0, 10).map(([cat, items]) => {
          const total = items.reduce((s, i) => s + (i.count || 1), 0);
          return (
            <div key={cat} className="violation violation--serious">
              <div className="violation-header">
                <div className="violation-info">
                  <div className="violation-title-row"><span className="violation-title">{cat}</span></div>
                  <div className="violation-meta">
                    <span className="impact-badge impact-badge--serious">serious</span>
                    <span className="node-count">{total}×</span>
                    <span className="wcag-version-badge">Missing ARIA</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
