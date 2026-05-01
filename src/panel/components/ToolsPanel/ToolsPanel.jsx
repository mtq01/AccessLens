import { useState } from "react";
import Focus from "./Focus";
import Visuals from "./Visuals";
import Dynamic from "./Dynamic";

const TOOL_TABS = [
  { id: "focus",   label: "Focus" },
  { id: "visuals", label: "Visuals" },
  { id: "dynamic", label: "Dynamic" },
];

export default function ToolsPanel({ scanData }) {
  const [activeTab, setActiveTab] = useState("focus");
  const violations    = scanData?.violations || [];
  const dynamicIssues = scanData?.dynamicIssues || [];

  return (
    <div className="tools-panel">
      <div className="subtabs">
        {TOOL_TABS.map(t => {
          const showAmber = t.id === "dynamic" && dynamicIssues.length > 0;
          const count = t.id === "dynamic" && dynamicIssues.length > 0 ? dynamicIssues.length : null;
          return (
            <button
              key={t.id}
              className={`subtab ${activeTab===t.id?"subtab--active":""}`}
              onClick={() => setActiveTab(t.id)}
              role="tab"
              aria-selected={activeTab===t.id}
            >
              {t.label}
              {count != null && (
                <span className={`subtab-count${showAmber?" subtab-count--amber":""}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "focus"   && <Focus />}
      {activeTab === "visuals" && <Visuals violations={violations} />}
      {activeTab === "dynamic" && <Dynamic dynamicIssues={dynamicIssues} />}
    </div>
  );
}
