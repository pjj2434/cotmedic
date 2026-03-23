"use client";

const cotStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Mono:wght@400;500&display=swap');
  .wo-form-view { --border: #d0d0d0; --text: #111111; --text-dim: #777777; --mono: 'Roboto Mono', monospace; --sans: 'Roboto', sans-serif; --display: 'Roboto', sans-serif; }
  .wo-form-view * { box-sizing: border-box; margin: 0; padding: 0; }
  .wo-form-view .form-shell { background: #e8e8e8; padding: 24px; font-family: var(--sans); color: var(--text); }
  .wo-form-view .form-card { max-width: 820px; margin: 0 auto; background: #fff; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; box-shadow: 0 4px 40px rgba(0,0,0,0.15); }
  .wo-form-view .form-header { background: linear-gradient(135deg, #1a1a1a 0%, #000 100%); border-bottom: 2px solid #000; padding: 28px 36px 24px; display: flex; align-items: center; gap: 20px; }
  .wo-form-view .logo-mark { background: #fff; border-radius: 4px; padding: 6px 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .wo-form-view .header-brand { display: flex; flex-direction: column; gap: 8px; }
  .wo-form-view .header-tagline { font-family: var(--mono); font-size: 10px; color: #aaa; letter-spacing: 3px; text-transform: uppercase; margin: 0; }
  .wo-form-view .header-badge { margin-left: auto; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); padding: 6px 14px; border-radius: 3px; font-family: var(--display); font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #fff; }
  .wo-form-view .form-body { padding: 28px 36px; }
  .wo-form-view .section { margin-bottom: 28px; }
  .wo-form-view .section-label { font-family: var(--mono); font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #111; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
  .wo-form-view .section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .wo-form-view .section-hint { font-size: 12px; color: var(--text-dim); margin: -6px 0 10px 0; line-height: 1.5; }
  .wo-form-view .row-grid { display: grid; gap: 12px; }
  .wo-form-view .row-grid.cols-2 { grid-template-columns: 1fr 1fr; }
  .wo-form-view .row-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
  .wo-form-view .row-grid.cols-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
  .wo-form-view .field-group { display: flex; flex-direction: column; gap: 5px; }
  .wo-form-view .field-group label { font-family: var(--mono); font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--text-dim); }
  .wo-form-view .field-input { background: #f9f9f9; border: 1px solid var(--border); border-radius: 3px; padding: 9px 12px; font-family: var(--sans); font-size: 14px; color: var(--text); width: 100%; cursor: default; }
  .wo-form-view textarea.field-input { resize: none; min-height: 96px; line-height: 1.6; }
  .wo-form-view .field-input.empty { color: var(--text-dim); }
  .wo-form-view .parts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid var(--border); border-radius: 3px; overflow: hidden; }
  .wo-form-view .parts-col { padding: 0; }
  .wo-form-view .parts-col:first-child { border-right: 1px solid var(--border); }
  .wo-form-view .parts-col-header { font-family: var(--mono); font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: #111; padding: 10px 14px; background: #f0f0f0; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 6px; }
  .wo-form-view .parts-row { padding: 6px 10px; border-bottom: 1px solid rgba(0,0,0,0.08); display: flex; align-items: center; gap: 8px; }
  .wo-form-view .parts-row:last-child { border-bottom: none; }
  .wo-form-view .part-num { font-family: var(--mono); font-size: 10px; color: var(--text-dim); min-width: 20px; }
  .wo-form-view .parts-row .part-val { flex: 1; font-family: var(--sans); font-size: 13px; font-weight: 500; color: var(--text); }
  .wo-form-view .subsection { background: #f7f7f7; border: 1px solid var(--border); border-left: 3px solid #111; border-radius: 3px; padding: 16px 18px; }
  .wo-form-view .subsection-title { font-family: var(--display); font-size: 13px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #333; margin-bottom: 14px; }
  .wo-form-view .lock-row { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; margin-top: 10px; }
  .wo-form-view .lock-item { display: flex; align-items: center; gap: 10px; }
  .wo-form-view .toggle-label { font-family: var(--mono); font-size: 11px; letter-spacing: 1px; color: var(--text-dim); margin-right: 4px; }
  .wo-form-view .toggle-val { font-family: var(--sans); font-size: 14px; font-weight: 500; }
  .wo-form-view .auth-box { background: #f7f7f7; border: 1px solid #ccc; border-left: 3px solid #111; border-radius: 3px; padding: 18px 20px; margin-bottom: 24px; }
  .wo-form-view .auth-notice { font-size: 12px; color: #555; line-height: 1.6; margin-bottom: 16px; font-style: italic; }
  .wo-form-view .form-footer { background: #f0f0f0; border-top: 1px solid var(--border); padding: 14px 36px; display: flex; align-items: center; justify-content: space-between; }
  .wo-form-view .footer-address { font-family: var(--mono); font-size: 10px; color: #666; letter-spacing: 0.5px; }
  .wo-form-view .footer-phone { font-family: var(--mono); font-size: 11px; color: #111; letter-spacing: 1px; }
  .wo-form-view .divider { border: none; border-top: 1px solid var(--border); margin: 28px 0; }
  .wo-form-view .sig-cursive { font-family: 'Brush Script MT', cursive; font-size: 18px; letter-spacing: 1px; }
  @media (max-width: 600px) { .wo-form-view .form-body { padding: 20px 18px; } .wo-form-view .row-grid.cols-4 { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 768px) { .wo-form-view .row-grid.cols-3 { grid-template-columns: 1fr 1fr; } .wo-form-view .parts-grid { grid-template-columns: 1fr; } .wo-form-view .parts-col:first-child { border-right: none; border-bottom: 1px solid var(--border); } }
  @media print {
    .wo-form-view .form-shell { padding: 12px; background: #fff !important; }
    .wo-form-view .form-card { max-width: 100%; box-shadow: none; }
    .wo-form-view .form-header { padding: 14px 20px 12px; }
    .wo-form-view .form-body { padding: 14px 20px; }
    .wo-form-view .section { margin-bottom: 14px; }
    .wo-form-view .section-label { font-size: 8px; margin-bottom: 6px; }
    .wo-form-view .section-hint { font-size: 10px; margin: -4px 0 6px 0; }
    .wo-form-view .field-input { padding: 6px 10px; font-size: 11px; }
    .wo-form-view textarea.field-input { min-height: 60px; }
    .wo-form-view .subsection { padding: 10px 12px; }
    .wo-form-view .subsection-title { font-size: 11px; margin-bottom: 8px; }
    .wo-form-view .parts-col-header { padding: 6px 10px; font-size: 9px; }
    .wo-form-view .parts-row { padding: 4px 8px; }
    .wo-form-view .part-num { font-size: 9px; }
    .wo-form-view .parts-row .part-val { font-size: 11px; }
    .wo-form-view .auth-box { padding: 12px 14px; margin-bottom: 12px; }
    .wo-form-view .auth-notice { font-size: 10px; margin-bottom: 10px; }
    .wo-form-view .form-footer { padding: 8px 20px; }
    .wo-form-view .logo-mark img { height: 28px; }
  }
`;

const liftStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Mono:wght@400;500&display=swap');
  .wo-form-view { --border: #d0d0d0; --text: #111111; --text-dim: #777777; --mono: 'Roboto Mono', monospace; --sans: 'Roboto', sans-serif; --display: 'Roboto', sans-serif; }
  .wo-form-view * { box-sizing: border-box; margin: 0; padding: 0; }
  .wo-form-view .form-shell { background: #e8e8e8; padding: 24px; font-family: var(--sans); color: var(--text); }
  .wo-form-view .form-card { max-width: 820px; margin: 0 auto; background: #fff; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; box-shadow: 0 4px 40px rgba(0,0,0,0.12); }
  .wo-form-view .form-header { background: linear-gradient(135deg, #1a1a1a 0%, #000 100%); border-bottom: 2px solid rgba(255,255,255,0.15); padding: 28px 36px 24px; display: flex; align-items: center; gap: 20px; }
  .wo-form-view .logo-mark { width: 52px; height: 52px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .wo-form-view .header-text h1 { font-family: var(--display); font-size: 24px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #fff; line-height: 1; }
  .wo-form-view .header-text h1 span { color: #aaa; font-weight: 400; }
  .wo-form-view .header-text p { font-family: var(--mono); font-size: 10px; color: #aaa; letter-spacing: 3px; text-transform: uppercase; margin-top: 5px; }
  .wo-form-view .header-badge { margin-left: auto; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.25); padding: 6px 14px; border-radius: 3px; font-family: var(--display); font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #fff; }
  .wo-form-view .form-body { padding: 28px 36px; }
  .wo-form-view .section { margin-bottom: 28px; }
  .wo-form-view .section-label { font-family: var(--mono); font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: var(--text); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
  .wo-form-view .section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .wo-form-view .section-hint { font-size: 12px; color: var(--text-dim); margin: -6px 0 10px 0; line-height: 1.5; }
  .wo-form-view .row-grid { display: grid; gap: 12px; }
  .wo-form-view .row-grid.cols-2 { grid-template-columns: 1fr 1fr; }
  .wo-form-view .row-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
  .wo-form-view .row-grid.cols-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
  .wo-form-view .field-group { display: flex; flex-direction: column; gap: 5px; }
  .wo-form-view .field-group label { font-family: var(--mono); font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--text-dim); }
  .wo-form-view .field-input { background: #f4f4f4; border: 1px solid var(--border); border-radius: 3px; padding: 9px 12px; font-family: var(--sans); font-size: 14px; color: var(--text); width: 100%; cursor: default; }
  .wo-form-view textarea.field-input { resize: none; min-height: 96px; line-height: 1.6; }
  .wo-form-view .field-input.empty { color: var(--text-dim); }
  .wo-form-view .parts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid var(--border); border-radius: 3px; overflow: hidden; }
  .wo-form-view .parts-col:first-child { border-right: 1px solid var(--border); }
  .wo-form-view .parts-col-header { font-family: var(--mono); font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--text); padding: 10px 14px; background: #f0f0f0; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 6px; }
  .wo-form-view .parts-row { padding: 6px 10px; border-bottom: 1px solid rgba(208,208,208,0.4); display: flex; align-items: center; gap: 8px; }
  .wo-form-view .parts-row:last-child { border-bottom: none; }
  .wo-form-view .part-num { font-family: var(--mono); font-size: 10px; color: var(--text-dim); min-width: 20px; }
  .wo-form-view .parts-row .part-val { flex: 1; font-family: var(--sans); font-size: 13px; font-weight: 600; color: var(--text); }
  .wo-form-view .auth-box { background: #f4f4f4; border: 1px solid #ccc; border-left: 3px solid #111; border-radius: 3px; padding: 18px 20px; margin-bottom: 24px; }
  .wo-form-view .auth-notice { font-size: 12px; color: #555; line-height: 1.6; margin-bottom: 16px; font-style: italic; }
  .wo-form-view .form-footer { background: #f0f0f0; border-top: 1px solid var(--border); padding: 14px 36px; display: flex; align-items: center; justify-content: space-between; }
  .wo-form-view .footer-address { font-family: var(--mono); font-size: 10px; color: #666; letter-spacing: 0.5px; }
  .wo-form-view .footer-phone { font-family: var(--mono); font-size: 11px; color: #111; letter-spacing: 1px; }
  .wo-form-view .divider { border: none; border-top: 1px solid var(--border); margin: 28px 0; }
  .wo-form-view .sig-cursive { font-family: 'Brush Script MT', cursive; font-size: 18px; letter-spacing: 1px; }
  @media (max-width: 600px) { .wo-form-view .form-body { padding: 20px 18px; } .wo-form-view .row-grid.cols-3 { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 768px) { .wo-form-view .parts-grid { grid-template-columns: 1fr; } .wo-form-view .parts-col:first-child { border-right: none; border-bottom: 1px solid var(--border); } }
  @media print {
    .wo-form-view .form-shell { padding: 12px; background: #fff !important; }
    .wo-form-view .form-card { max-width: 100%; box-shadow: none; }
    .wo-form-view .form-header { padding: 14px 20px 12px; }
    .wo-form-view .form-body { padding: 14px 20px; }
    .wo-form-view .section { margin-bottom: 14px; }
    .wo-form-view .section-label { font-size: 8px; margin-bottom: 6px; }
    .wo-form-view .section-hint { font-size: 10px; margin: -4px 0 6px 0; }
    .wo-form-view .field-input { padding: 6px 10px; font-size: 11px; }
    .wo-form-view textarea.field-input { min-height: 60px; }
    .wo-form-view .auth-box { padding: 12px 14px; margin-bottom: 12px; }
    .wo-form-view .auth-notice { font-size: 10px; margin-bottom: 10px; }
    .wo-form-view .form-footer { padding: 8px 20px; }
  }
`;

function Field({ label, value, multiline, sig }: { label: string; value: string | undefined; multiline?: boolean; sig?: boolean }) {
  const v = value?.trim() || "";
  return (
    <div className="field-group">
      {label ? <label>{label}</label> : null}
      <div
        className={`field-input ${!v ? "empty" : ""} ${sig ? "sig-cursive" : ""}`}
        style={multiline ? { whiteSpace: "pre-wrap", minHeight: 96 } : undefined}
      >
        {v || "—"}
      </div>
    </div>
  );
}

function PartsColReadonly({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  const filtered = items.filter((x) => x?.trim());
  return (
    <div className="parts-col">
      <div className="parts-col-header">
        <span>{icon}</span> {title}
      </div>
      {filtered.length ? (
        filtered.map((val, i) => (
          <div className="parts-row" key={i}>
            <span className="part-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="part-val">{val}</span>
          </div>
        ))
      ) : (
        <div className="parts-row">
          <span className="part-num">01</span>
          <span className="part-val empty" style={{ color: "var(--text-dim)" }}>—</span>
        </div>
      )}
    </div>
  );
}

function ToggleReadonly({ label, value }: { label: string; value: boolean | null }) {
  const txt = value === true ? "Yes" : value === false ? "No" : "—";
  return (
    <div className="lock-item">
      <span className="toggle-label">{label}</span>
      <span className="toggle-val">{txt}</span>
    </div>
  );
}

type FormData = Record<string, unknown>;

function normalizeDate(value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${m}/${d}/${y}`;
  }

  const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!usMatch) return raw;
  const month = Number(usMatch[1]);
  const day = Number(usMatch[2]);
  const year = Number(usMatch[3]);
  const date = new Date(year, month - 1, day);
  const valid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
  if (!valid) return raw;
  return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
}

function normalizeTime(value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  const twelveHour = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (twelveHour) {
    const hour = Number(twelveHour[1]);
    const mins = Number(twelveHour[2]);
    if (hour >= 1 && hour <= 12 && mins >= 0 && mins <= 59) {
      return `${hour}:${String(mins).padStart(2, "0")} ${twelveHour[3].toUpperCase()}`;
    }
    return raw;
  }

  const twentyFourHour = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!twentyFourHour) return raw;
  const hour24 = Number(twentyFourHour[1]);
  const mins = Number(twentyFourHour[2]);
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, "0")} ${meridiem}`;
}

export function CotFormView({ form }: { form: FormData }) {
  const g = (k: string) => (form[k] as string) ?? "";
  const gDate = (k: string) => normalizeDate(g(k));
  const gTime = (k: string) => normalizeTime(g(k));
  const arr = (k: string) => (form[k] as string[]) ?? [];
  const bool = (k: string) => form[k] as boolean | null | undefined;

  return (
    <div className="wo-form-view">
      <style>{cotStyles}</style>
      <div className="form-shell">
        <div className="form-card">
          <div className="form-header">
            <div className="header-brand">
              <div className="logo-mark">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/cotlogo.png" alt="Cot Medik" width={140} height={48} className="h-9 w-auto" />
              </div>
              <p className="header-tagline">Serving the Ambulance &amp; EMS Community</p>
            </div>
            <div className="header-badge">PM / Repair Report</div>
          </div>

          <div className="form-body">
            <div className="section">
              <div className="section-label">Identification</div>
              <div className="row-grid cols-4">
                <Field label="Date" value={gDate("date")} />
                <Field label="Time" value={gTime("time")} />
                <div className="field-group" style={{ gridColumn: "span 2" }}>
                  <Field label="Technician Name" value={g("techName")} />
                </div>
              </div>
            </div>

            <div className="section">
              <div className="section-label">Equipment</div>
              <div className="row-grid cols-4">
                <Field label="Make" value={g("make")} />
                <Field label="Model" value={g("model")} />
                <Field label="S/N" value={g("sn")} />
                <Field label="Ambulance" value={g("ambulance")} />
              </div>
            </div>

            <div className="section">
              <div className="section-label">What did you do?</div>
              <p className="section-hint">A quick summary helps the next tech and keeps records clear.</p>
              <Field label="" value={g("description")} multiline />
            </div>

            <div className="section">
              <div className="section-label">Parts</div>
              <p className="section-hint">List what you used and anything we should order for next time.</p>
              <div className="parts-grid">
                <PartsColReadonly title="Parts you used / replaced" icon="✔" items={arr("partsUsed")} />
                <PartsColReadonly title="Parts to order" icon="⚠" items={arr("partsNeeded")} />
              </div>
            </div>

            <div className="section">
              <div className="section-label">Stair Chair</div>
              <div className="subsection">
                <div className="subsection-title">Stair Chair Details</div>
                <p className="section-hint" style={{ marginBottom: 14 }}>Help us track this unit and any lock bar work.</p>
                <div className="row-grid cols-3" style={{ marginBottom: 14 }}>
                  <Field label="Model" value={g("stairChairModel")} />
                  <Field label="Serial No." value={g("stairChairSN")} />
                </div>
                <div className="row-grid cols-3" style={{ marginBottom: 14 }}>
                  {(() => {
                    const parts = (form.stairChairParts as string[]) ?? [];
                    const list = parts.length ? parts : [""];
                    return list.map((v, i) => <Field key={i} label={`Part ${i + 1}`} value={v} />);
                  })()}
                </div>
                <div className="field-group" style={{ marginBottom: 14 }}>
                  <Field label="Lock bar notes" value={g("lockBarIssue")} />
                </div>
                <div className="lock-row">
                  <ToggleReadonly label="Adjusted" value={bool("adjusted") ?? null} />
                  <ToggleReadonly label="Lock Bar Replaced" value={bool("lockBarReplaced") ?? null} />
                </div>
              </div>
            </div>
          </div>

          <div className="form-footer">
            <span className="footer-address">Cot Medik INC. · 9189 128th Ave, N., Largo, FL 33773</span>
            <span className="footer-phone">P: 631-256-6777</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LiftFormView({ form }: { form: FormData }) {
  const g = (k: string) => (form[k] as string) ?? "";
  const gDate = (k: string) => normalizeDate(g(k));
  const gTime = (k: string) => normalizeTime(g(k));

  return (
    <div className="wo-form-view">
      <style>{liftStyles}</style>
      <div className="form-shell">
        <div className="form-card">
          <div className="form-header">
            <div className="header-text">
              <h1>Lift <span>/</span> Medik</h1>
              <p>Serving the Mobility Assist Community</p>
            </div>
            <div className="header-badge">PM / Repair Report</div>
          </div>

          <div className="form-body">
            <div className="section">
              <div className="section-label">Identification</div>
              <div className="row-grid cols-4">
                <Field label="Date" value={gDate("date")} />
                <Field label="Time" value={gTime("time")} />
                <div className="field-group" style={{ gridColumn: "span 2" }}>
                  <Field label="Technician Name" value={g("techName")} />
                </div>
              </div>
            </div>

            <div className="section">
              <div className="section-label">Equipment</div>
              <div className="row-grid cols-3">
                <Field label="Model" value={g("model")} />
                <Field label="S/N" value={g("sn")} />
                <Field label="Bus" value={g("bus")} />
              </div>
            </div>

            <div className="section">
              <div className="section-label">What did you do?</div>
              <p className="section-hint">A quick summary helps the next tech and keeps records clear.</p>
              <Field label="" value={g("description")} multiline />
            </div>

            <div className="section">
              <div className="section-label">Parts</div>
              <p className="section-hint">List what you used and anything we should order for next time.</p>
              <div className="parts-grid">
                <PartsColReadonly title="Parts you used / replaced" icon="✔" items={(form.partsUsed as string[]) ?? []} />
                <PartsColReadonly title="Parts to order" icon="⚠" items={(form.partsNeeded as string[]) ?? []} />
              </div>
            </div>
          </div>

          <div className="form-footer">
            <span className="footer-address">Lift Medik INC. · 9189 128th Ave, N., Largo, FL 33773</span>
            <span className="footer-phone">P: 855-268-6335</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkOrderFormView({
  type,
  formData,
}: {
  type: string;
  formData: string | FormData | null | undefined;
}) {
  let data: FormData = {};
  if (typeof formData === "string") {
    try {
      data = JSON.parse(formData) as FormData;
    } catch {
      return <pre className="p-4 text-sm">{formData}</pre>;
    }
  } else if (formData && typeof formData === "object") {
    data = formData;
  } else {
    return <pre className="p-4 text-sm">No form data</pre>;
  }
  return type === "lift" ? <LiftFormView form={data} /> : <CotFormView form={data} />;
}
