"use client";

import { cn } from "@/lib/utils";
import { formatCalendarIsoDate, parseWorkOrderDateToIso } from "@/lib/work-order-date";

export type ChecklistFormData = {
  repairNecessary?: boolean;
  technicianName?: string;
  dateOfService?: string;
  workOrderType?: string;
  problemDescription?: string;
  repairNotes?: string;
  serialNumber?: string;
  productName?: string;
  modelNumber?: string;
  checklist?: Array<{
    desc: string;
    reading?: string;
    result?: "Passed" | "Failed" | string;
  }>;
};

export function parseChecklistFormData(raw: string): ChecklistFormData {
  try {
    return JSON.parse(raw) as ChecklistFormData;
  } catch {
    return {};
  }
}

const checklistStyles = `
  .checklist-form-view { color: #262626; }
  .checklist-form-view .form-shell { background: #e8e8e8; padding: 16px; }
  .checklist-form-view .form-card {
    max-width: 820px;
    margin: 0 auto;
    background: #fff;
    border: 1px solid #d4d4d4;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
  }
  .checklist-form-view .form-header {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 32px 16px;
  }
  .checklist-form-view .form-header img.logo-main {
    height: 140px;
    width: auto;
    max-width: min(100%, 40rem);
    object-fit: contain;
  }
  .checklist-form-view .form-body { padding: 0 32px 32px; }
  .checklist-form-view .section { margin-bottom: 16px; }
  .checklist-form-view .section-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
  .checklist-form-view .section-rule { border: 0; border-top: 2px solid #dc2626; margin: 0 0 16px; }
  .checklist-form-view .field-grid { display: grid; gap: 12px 16px; }
  .checklist-form-view .field-grid.cols-2 { grid-template-columns: 1fr 1fr; }
  .checklist-form-view .field-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
  .checklist-form-view .field-grid .span-2 { grid-column: span 2; }
  .checklist-form-view .field-label { font-weight: 700; color: #262626; font-size: 13px; }
  .checklist-form-view .field-value { margin-top: 2px; color: #404040; font-size: 13px; white-space: pre-wrap; }
  .checklist-form-view .center { text-align: center; }
  .checklist-form-view .checklist-head {
    background: rgba(212,212,212,0.7);
    padding: 8px 16px;
    font-size: 18px;
    font-weight: 700;
  }
  .checklist-form-view table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .checklist-form-view th {
    text-align: left;
    font-weight: 700;
    padding: 8px 16px;
    border-bottom: 1px solid #d4d4d4;
  }
  .checklist-form-view th.right { text-align: right; }
  .checklist-form-view td {
    padding: 8px 16px;
    border-bottom: 1px solid #e5e5e5;
    vertical-align: top;
  }
  .checklist-form-view td.desc { color: #1e40af; }
  .checklist-form-view td.right { text-align: right; }
  .checklist-form-view tr.alt { background: #f5f5f5; }
  .checklist-form-view .result-pill {
    display: inline-flex;
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
  }
  .checklist-form-view .result-pill.pass { background: #10b981; }
  .checklist-form-view .result-pill.fail { background: #ef4444; }

  @media screen {
    .checklist-form-view.checklist-form-view--compact .form-shell {
      padding: 0;
      background: transparent;
    }
    .checklist-form-view.checklist-form-view--compact .form-card {
      max-width: min(100%, 680px);
      box-shadow: none;
      border: 1px solid #d4d4d4;
    }
    .checklist-form-view.checklist-form-view--compact .form-header { padding: 12px 14px 8px; }
    .checklist-form-view.checklist-form-view--compact .form-header img.logo-main { height: 72px; }
    .checklist-form-view.checklist-form-view--compact .form-body { padding: 0 14px 14px; }
    .checklist-form-view.checklist-form-view--compact .section { margin-bottom: 12px; }
    .checklist-form-view.checklist-form-view--compact .section-title { font-size: 15px; }
    .checklist-form-view.checklist-form-view--compact .section-rule { margin-bottom: 8px; }
    .checklist-form-view.checklist-form-view--compact .field-grid { gap: 6px 10px; }
    .checklist-form-view.checklist-form-view--compact .field-label { font-size: 11px; }
    .checklist-form-view.checklist-form-view--compact .field-value { font-size: 13px; line-height: 1.35; }
    .checklist-form-view.checklist-form-view--compact .checklist-head { padding: 5px 10px; font-size: 14px; }
    .checklist-form-view.checklist-form-view--compact table { font-size: 12px; }
    .checklist-form-view.checklist-form-view--compact th,
    .checklist-form-view.checklist-form-view--compact td { padding: 5px 8px; }
    .checklist-form-view.checklist-form-view--compact .result-pill { font-size: 10px; padding: 2px 8px; }
  }

  @media print {
    .checklist-form-view .form-shell { padding: 0 !important; background: #fff !important; }
    .checklist-form-view .form-card { max-width: none !important; box-shadow: none !important; border: none !important; }
    .checklist-form-view .form-header { padding: 10px 12px 8px !important; }
    .checklist-form-view .form-header img.logo-main { height: 96px !important; }
    .checklist-form-view .form-body { padding: 0 12px 12px !important; }
    .checklist-form-view .section { margin-bottom: 12px !important; }
    .checklist-form-view .section-title { font-size: 15px !important; }
    .checklist-form-view .section-rule { margin-bottom: 8px !important; }
    .checklist-form-view .field-grid { gap: 6px 10px !important; }
    .checklist-form-view .field-label { font-size: 11px !important; }
    .checklist-form-view .field-value { font-size: 13px !important; line-height: 1.35 !important; }
    .checklist-form-view .checklist-head { padding: 5px 10px !important; font-size: 14px !important; }
    .checklist-form-view table { font-size: 12px !important; }
    .checklist-form-view th,
    .checklist-form-view td { padding: 5px 8px !important; }
    .checklist-form-view tr { break-inside: avoid; page-break-inside: avoid; }
    .checklist-form-view .result-pill { font-size: 10px !important; padding: 2px 8px !important; }
  }

  @media (max-width: 640px) {
    .checklist-form-view .field-grid.cols-2,
    .checklist-form-view .field-grid.cols-3 { grid-template-columns: 1fr; }
    .checklist-form-view .field-grid .span-2 { grid-column: auto; }
    .checklist-form-view .center { text-align: left; }
  }
`;

export function ChecklistFormView({
  formData,
  technicianName,
  compact = false,
}: {
  formData: ChecklistFormData;
  technicianName?: string;
  compact?: boolean;
}) {
  const dateIso = parseWorkOrderDateToIso(formData.dateOfService);
  const items = Array.isArray(formData.checklist) ? formData.checklist : [];

  return (
    <div className={cn("checklist-form-view", compact && "checklist-form-view--compact")}>
      <style dangerouslySetInnerHTML={{ __html: checklistStyles }} />
      <div className="form-shell">
        <div className="form-card">
          <div className="form-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/new-logo.png" alt="COTMEDIC" className="logo-main" />
          </div>

          <div className="form-body">
            <section className="section">
              <h2 className="section-title">Work Order Information</h2>
              <hr className="section-rule" />
              <div className="field-grid cols-2">
                <Field label="Repair Necessary?">
                  {formData.repairNecessary ? "Yes" : "No"}
                </Field>
                <Field label="Technician">
                  {formData.technicianName || technicianName || "—"}
                </Field>
                <Field label="Date of Service">
                  {dateIso ? formatCalendarIsoDate(dateIso) : formData.dateOfService || "—"}
                </Field>
                <Field label="Work Order Type">{formData.workOrderType || "—"}</Field>
                <Field label="Problem Description">{formData.problemDescription || "—"}</Field>
                <Field label="Repair/Service Notes" span2>
                  {formData.repairNotes || "—"}
                </Field>
              </div>
            </section>

            <section className="section">
              <h2 className="section-title">Asset Information</h2>
              <hr className="section-rule" />
              <div className="field-grid cols-3">
                <Field label="Serial Number" center>
                  {formData.serialNumber || "—"}
                </Field>
                <Field label="Product Name" center>
                  {formData.productName || "—"}
                </Field>
                <Field label="Model Number" center>
                  {formData.modelNumber || "—"}
                </Field>
              </div>
            </section>

            <section className="section">
              <div className="checklist-head">Checklist</div>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="right" style={{ width: "18%" }}>
                      Reading
                    </th>
                    <th className="right" style={{ width: "18%" }}>
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const passed = item.result === "Passed";
                    return (
                      <tr key={`${item.desc}-${i}`} className={i % 2 === 1 ? "alt" : undefined}>
                        <td className="desc">{item.desc}</td>
                        <td className="right">{item.reading || ""}</td>
                        <td className="right">
                          <span className={cn("result-pill", passed ? "pass" : "fail")}>
                            {item.result || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  span2,
  center,
}: {
  label: string;
  children: React.ReactNode;
  span2?: boolean;
  center?: boolean;
}) {
  return (
    <div className={cn(span2 && "span-2", center && "center")}>
      <div className="field-label">{label}</div>
      <div className="field-value">{children}</div>
    </div>
  );
}
