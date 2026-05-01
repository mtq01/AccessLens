import { useState } from "react";

function ReadingLevelCard({ data }) {
  const [tab, setTab] = useState("what");

  const gradeLabel = (grade) => {
    if (grade <= 5)  return "Elementary school level";
    if (grade <= 8)  return "Middle school level";
    if (grade <= 12) return `Grade ${grade} (High school level)`;
    return "University / post-secondary level";
  };

  const howToFix = `Your page scores at Grade ${data.grade} reading level. The goal is Grade 8 or below.

Why it matters:
About 1 in 5 adults read at Grade 8 level or lower. Many more read English as a second language. Hard text loses readers.

How to fix it:

1. Make sentences shorter.
   If a sentence has more than 20 words, split it in two.

   Hard:  "If you would like to update the email address that we use to send you notifications, please go to the account settings page where you can make this change."

   Easy:  "Want to change your email? Go to account settings."

2. Use simple words instead of fancy ones.

   Instead of           Use this
   ---------            --------
   utilize              use
   demonstrate          show
   purchase             buy
   commence             start
   subsequently         then
   facilitate           help
   require              need
   approximately        about
   in order to          to
   prior to             before

3. Talk to the reader. Use "you" not "users".

   Hard:  "Users must verify their identity."
   Easy:  "You need to verify it's you."

4. Use active voice.

   Hard:  "The form must be filled out by the user."
   Easy:  "Fill out the form."

5. Add a plain-English summary at the top of complex pages.
   2 or 3 short sentences that explain the page in simple words.

Note: Legal terms, medical words, and code names raise the score. If you must use them, add a plain-English version next to them.`;

  return (
    <div className={`reading-card reading-card--${data.tier}`}>
      <div className="reading-header">
        <div>
          <div className="reading-grade">Grade {data.grade}</div>
          <div className="reading-label">{data.label}</div>
        </div>
        <div className="reading-meta-right">
          <span className="reading-meta">{data.wordCount} words</span>
          <span className="reading-meta">{data.sentenceCount} sentences</span>
          <span className={`pass-badge ${data.passesWcag ? "pass-badge--pass" : "pass-badge--fail"}`}>
            WCAG 3.1.5
          </span>
        </div>
      </div>

      <div className="detail-tabs">
        <button className={`detail-tab ${tab==="what"?"detail-tab--active":""}`} onClick={()=>setTab("what")}>What this means</button>
        <button className={`detail-tab ${tab==="fix"?"detail-tab--active":""}`} onClick={()=>setTab("fix")}>How to fix</button>
      </div>

      {tab==="what" && (
        <div className="reading-body">
          <p>{data.explanation}</p>
          <p>This score is based on the Flesch-Kincaid formula, applied to all readable text on this page. This includes paragraphs, headings, labels, and error messages. A Grade {data.grade} score means your content is written at a <strong>{gradeLabel(data.grade).toLowerCase()}</strong> reading level.</p>
          {!data.passesWcag && (
            <div className="content-flag">
              ⚠ WCAG 3.1.5 recommends Grade 8 or below. Consider simplifying your content or adding a plain-language summary.
            </div>
          )}
        </div>
      )}

      {tab==="fix" && (
        <pre className="detail-code detail-code--prose">
          <code>{howToFix}</code>
        </pre>
      )}
    </div>
  );
}

export default function ContentTab({ contentStatus, contentAnalysis, runContentAnalysis }) {
  return (
    <div className="content-tab">
      {contentStatus === "idle" && (
        <div className="tab-explainer">
          <div className="tab-explainer-title">Content analysis</div>
          <div className="tab-explainer-body">Checks reading level, link text quality, and motion animations on the page.</div>
          <button className="btn-scan" onClick={runContentAnalysis}>Analyse content</button>
        </div>
      )}
      {contentStatus === "running" && (
        <div className="empty-state">
          <div className="spinner"/>
          <p className="empty-hint">Analysing content…</p>
        </div>
      )}
      {contentStatus === "done" && contentAnalysis && (
        <ReadingLevelCard data={contentAnalysis.readingLevel} />
      )}
    </div>
  );
}
