import { useState } from "react";
import { Icon } from "../Icon";
import { getViolationContext } from "../../data/violationContext";

export default function Violations({ violations, passCount }) {
  const [impactFilter, setImpactFilter] = useState("All");
  const [expanded, setExpanded] = useState({});
  const [activeDetailTab, setActiveDetailTab] = useState({});
  const [openElementRows, setOpenElementRows] = useState({});

  const filteredViolations = violations.filter(v =>
    impactFilter === "All" || v.impact === impactFilter
  );

  function toggleExpanded(id) { setExpanded(p => ({ ...p, [id]: !p[id] })); }

  return (
    <div>
      <div className="filter-bar">
        <div className="filter-group">
          <span className="filter-label">Severity</span>
          {["All","critical","serious","moderate","minor"].map(v => (
            <button
              key={v}
              className={`filter-btn filter-btn--${v.toLowerCase()} ${impactFilter===v?"filter-btn--active":""}`}
              onClick={() => setImpactFilter(v)}
            >{v==="All"?"All":v.charAt(0).toUpperCase()+v.slice(1)}</button>
          ))}
        </div>
      </div>

      {filteredViolations.length === 0 && (
        <div className="empty-state empty-state--success">
          <span className="empty-state-tick">✓</span>
          <p className="empty-title">
            {violations.length === 0 ? "No violations found" : "No issues match this filter"}
          </p>
          <p className="empty-hint">{violations.length===0 ? `${passCount} checks passed` : "Try a different filter"}</p>
        </div>
      )}

      <div className="violations">
        {filteredViolations.map(v => {
          const isOpen = expanded[v.id];
          const detailTab = activeDetailTab[v.id] || "why";
          const ctx = getViolationContext(v.id);
          const wcagRef = v.tags?.find(t => t.startsWith("wcag") && /\d{3}/.test(t));
          const wcagLabel = wcagRef ? "WCAG "+wcagRef.replace("wcag","").replace(/(\d)(\d{2})$/,"$1.$2") : "";
          const impact = v.impact || "minor";

          return (
            <div key={v.id} className={`violation violation--${impact} ${isOpen?"violation--active":""}`}>
              <div className="violation-header" onClick={() => toggleExpanded(v.id)}>
                <div className="violation-info">
                  <div className="violation-title-row">
                    <span className="violation-title">{v.description}</span>
                  </div>
                  <div className="violation-meta">
                    <span className={`impact-badge impact-badge--${impact}`}>{impact}</span>
                    <span className="node-count">{v.nodes.length}×</span>
                    {wcagLabel && <span className="wcag-version-badge">{wcagLabel}</span>}
                  </div>
                </div>
                <button
                  className="expand-btn"
                  onClick={e => { e.stopPropagation(); toggleExpanded(v.id); }}
                  aria-expanded={isOpen}
                >
                  {isOpen ? "Close" : "View"}
                  <Icon name={isOpen?"expand_less":"expand_more"} size={14} />
                </button>
              </div>

              {!isOpen && (
                <div className="violation-quick-actions">
                  <button className="tool-btn" onClick={e=>{e.stopPropagation();setExpanded(p=>({...p,[v.id]:true}));setActiveDetailTab(p=>({...p,[v.id]:"why"}));}}>
                    Why it matters
                  </button>
                  <button className="tool-btn" onClick={e=>{e.stopPropagation();setExpanded(p=>({...p,[v.id]:true}));setActiveDetailTab(p=>({...p,[v.id]:"fix"}));}}>
                    How to fix
                  </button>
                  <button className="tool-btn" onClick={e=>{e.stopPropagation();const sel=v.nodes?.[0]?.target?.[0];if(sel)chrome.runtime.sendMessage({type:"SCROLL_TO_ELEMENT",selector:sel});}}>
                    Jump ↗
                  </button>
                </div>
              )}

              {isOpen && (
                <div className="violation-detail">
                  <div className="detail-tabs">
                    {[{id:"why",label:"Why it matters"},{id:"fix",label:"How to fix"},{id:"elements",label:`Elements (${v.nodes.length})`}].map(t => (
                      <button
                        key={t.id}
                        className={`detail-tab ${detailTab===t.id?"detail-tab--active":""}`}
                        onClick={e=>{e.stopPropagation();setActiveDetailTab(p=>({...p,[v.id]:t.id}));}}
                      >{t.label}</button>
                    ))}
                  </div>
                  <div className="detail-body" onClick={e=>e.stopPropagation()}>
                    {detailTab==="why" && (
                      <>
                        <p className="detail-why">{ctx?.why || v.help}</p>
                        {v.helpUrl && <a href={v.helpUrl} target="_blank" rel="noreferrer" className="violation-link">WCAG documentation ↗</a>}
                      </>
                    )}
                    {detailTab==="fix" && ctx?.fix && (
                      <div className="detail-code"><code>{ctx.fix}</code></div>
                    )}
                    {detailTab==="elements" && (
                      <div className="nodes-list">
                        {v.nodes.map((node, i) => {
                          const key = v.id+"_"+i;
                          const isElOpen = openElementRows[key];
                          const html = node.html || "";
                          const match = html.match(/^<(\w+)/i);
                          const tag = match ? match[1].toLowerCase() : "element";
                          const labels = {a:"Link",button:"Button",input:"Input field",textarea:"Text area",select:"Dropdown",img:"Image",svg:"SVG image",h1:"Heading 1",h2:"Heading 2",h3:"Heading 3",h4:"Heading 4",h5:"Heading 5",h6:"Heading 6",p:"Paragraph",div:"Container",span:"Inline text",nav:"Navigation",form:"Form",label:"Label",table:"Table",li:"List item"};
                          const typeLabel = labels[tag] || `<${tag}>`;
                          const selector = node.target?.[0];
                          return (
                            <div key={i} className={`element-row ${isElOpen?"element-row--open":""}`}>
                              <div className="element-row-header">
                                <span className="element-row-num">#{i+1}</span>
                                <span className="element-row-type">{typeLabel}</span>
                                <div className="element-row-actions">
                                  {selector && (
                                    <button className="element-row-btn element-row-btn--jump" onClick={()=>chrome.runtime.sendMessage({type:"SCROLL_TO_ELEMENT",selector})}>
                                      <Icon name="open_in_new" size={13}/> Jump
                                    </button>
                                  )}
                                  <button className="element-row-btn" onClick={()=>setOpenElementRows(p=>({...p,[key]:!p[key]}))}>
                                    {isElOpen?"Hide":"Details"}
                                    <Icon name={isElOpen?"expand_less":"expand_more"} size={13}/>
                                  </button>
                                </div>
                              </div>
                              {isElOpen && (
                                <div className="element-row-body">
                                  {selector && <div className="element-row-section"><span className="element-row-label">Selector</span><code className="element-row-code">{selector}</code></div>}
                                  {node.html && <div className="element-row-section"><span className="element-row-label">HTML</span><code className="element-row-code">{node.html.slice(0,300)}</code></div>}
                                  {node.failureSummary && <div className="element-row-section"><span className="element-row-label">Why this fails</span><p className="element-row-text">{node.failureSummary}</p></div>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
