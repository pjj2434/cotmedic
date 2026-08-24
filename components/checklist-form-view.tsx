"use client";

import { cn } from "@/lib/utils";
import { formatCalendarIsoDate, parseWorkOrderDateToIso } from "@/lib/work-order-date";
import {
  LIFT_PM_CHECKLIST,
  LIFT_PM_DISPOSITION,
  LIFT_STATUS_CONFIG,
  type LiftChecklistStatus,
} from "@/lib/lift-checklist-items";
import { liftStatusLabel } from "@/components/lift-pm-toggles";

export type ChecklistFormData = {
  variant?: string;
  repairNecessary?: boolean;
  technicianName?: string;
  dateOfService?: string;
  workOrderType?: string;
  problemDescription?: string;
  repairNotes?: string;
  serialNumber?: string;
  equipmentType?: string;
  productName?: string;
  modelNumber?: string;
  checklist?: Array<{
    desc: string;
    reading?: string;
    result?: "Passed" | "Failed" | string;
  }>;
  statuses?: Record<string, LiftChecklistStatus | null | undefined>;
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
    height: 240px;
    width: auto;
    max-width: min(100%, 48rem);
    object-fit: contain;
  }
  .checklist-form-view .form-header img.logo-main.logo-lift {
    height: 96px;
    max-width: min(100%, 18rem);
  }
  .checklist-form-view .form-body { padding: 0 32px 32px; }
  .checklist-form-view .section { margin-bottom: 16px; }
  .checklist-form-view .section-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
  .checklist-form-view .section-rule { border: 0; border-top: 2px solid #dc2626; margin: 0 0 16px; }
  .checklist-form-view .field-grid { display: grid; gap: 12px 16px; }
  .checklist-form-view .field-grid.cols-2 { grid-template-columns: 1fr 1fr; }
  .checklist-form-view .field-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
  .checklist-form-view .field-grid.cols-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
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
  .checklist-form-view .lift-head {
    background: #262626;
    color: #fff;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .checklist-form-view .lift-item {
    padding: 12px 16px;
    border-bottom: 1px solid #e5e5e5;
  }
  .checklist-form-view .lift-item-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
  }
  .checklist-form-view .lift-item-id {
    font-size: 11px;
    font-weight: 600;
    color: #a3a3a3;
  }
  .checklist-form-view .lift-item-desc {
    font-size: 13px;
    color: #262626;
    line-height: 1.35;
  }
  .checklist-form-view .page-title {
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 4px;
    line-height: 1.2;
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
  .checklist-form-view .result-pill.na { background: #737373; }

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
    .checklist-form-view.checklist-form-view--compact .form-header { padding: 14px 14px 10px; }
    .checklist-form-view.checklist-form-view--compact .form-header img.logo-main { height: 160px; }
    .checklist-form-view.checklist-form-view--compact .form-header img.logo-main.logo-lift { height: 72px; }
    .checklist-form-view.checklist-form-view--compact .form-body { padding: 0 14px 14px; }
    .checklist-form-view.checklist-form-view--compact .section { margin-bottom: 12px; }
    .checklist-form-view.checklist-form-view--compact .section-title { font-size: 15px; }
    .checklist-form-view.checklist-form-view--compact .page-title { font-size: 18px; }
    .checklist-form-view.checklist-form-view--compact .section-rule { margin-bottom: 8px; }
    .checklist-form-view.checklist-form-view--compact .field-grid { gap: 6px 10px; }
    .checklist-form-view.checklist-form-view--compact .field-label { font-size: 11px; }
    .checklist-form-view.checklist-form-view--compact .field-value { font-size: 13px; line-height: 1.35; }
    .checklist-form-view.checklist-form-view--compact .checklist-head,
    .checklist-form-view.checklist-form-view--compact .lift-head { padding: 5px 10px; font-size: 13px; }
    .checklist-form-view.checklist-form-view--compact table { font-size: 12px; }
    .checklist-form-view.checklist-form-view--compact th,
    .checklist-form-view.checklist-form-view--compact td { padding: 5px 8px; }
    .checklist-form-view.checklist-form-view--compact .result-pill { font-size: 10px; padding: 2px 8px; }
    .checklist-form-view.checklist-form-view--compact .lift-item { padding: 8px 10px; }
    .checklist-form-view.checklist-form-view--compact .lift-item-desc { font-size: 12px; }
  }

  @media print {
    .checklist-form-view .form-shell { padding: 0 !important; background: #fff !important; }
    .checklist-form-view .form-card { max-width: none !important; box-shadow: none !important; border: none !important; }
    .checklist-form-view .form-header { padding: 10px 12px 8px !important; }
    .checklist-form-view .form-header img.logo-main { height: 180px !important; }
    .checklist-form-view .form-header img.logo-main.logo-lift { height: 64px !important; }
    .checklist-form-view .form-body { padding: 0 12px 10px !important; }
    .checklist-form-view .section { margin-bottom: 10px !important; }
    .checklist-form-view .section-title { font-size: 15px !important; }
    .checklist-form-view .page-title { font-size: 17px !important; }
    .checklist-form-view .section-rule { margin-bottom: 8px !important; }
    .checklist-form-view .field-grid { gap: 5px 10px !important; }
    .checklist-form-view .field-label { font-size: 11px !important; }
    .checklist-form-view .field-value { font-size: 12px !important; line-height: 1.3 !important; }
    .checklist-form-view .checklist-head,
    .checklist-form-view .lift-head { padding: 4px 10px !important; font-size: 12px !important; }
    .checklist-form-view table { font-size: 12px !important; }
    .checklist-form-view th,
    .checklist-form-view td { padding: 5px 8px !important; }
    .checklist-form-view tr { break-inside: avoid; page-break-inside: avoid; }
    .checklist-form-view .lift-item {
      padding: 4px 8px !important;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .checklist-form-view .lift-item-top {
      margin-bottom: 1px !important;
    }
    .checklist-form-view .lift-item-id {
      font-size: 9px !important;
    }
    .checklist-form-view .lift-item-desc {
      font-size: 11px !important;
      line-height: 1.25 !important;
    }
    .checklist-form-view .result-pill { font-size: 9px !important; padding: 1px 7px !important; }
  }

  @media (max-width: 640px) {
    .checklist-form-view .field-grid.cols-2,
    .checklist-form-view .field-grid.cols-3,
    .checklist-form-view .field-grid.cols-4 { grid-template-columns: 1fr; }
    .checklist-form-view .field-grid .span-2 { grid-column: auto; }
    .checklist-form-view .center { text-align: left; }
  }
`;

function statusPillClass(status: string | null | undefined) {
  if (status === "P") return "pass";
  if (status === "F") return "fail";
  if (status === "NA") return "na";
  return "na";
}

export function ChecklistFormView({
  formData,
  technicianName,
  brandType = "cot",
  compact = false,
  mode = "full",
}: {
  formData: ChecklistFormData;
  technicianName?: string;
  brandType?: "cot" | "lift";
  compact?: boolean;
  /** full = entire form; summary = header + info only (no pass/fail rows) */
  mode?: "full" | "summary";
}) {
  const isLift = brandType === "lift" || formData.variant === "lift-pm";
  const dateIso = parseWorkOrderDateToIso(formData.dateOfService);
  const items = Array.isArray(formData.checklist) ? formData.checklist : [];
  const statuses = formData.statuses ?? {};
  const summaryOnly = mode === "summary";

  return (
    <div className={cn("checklist-form-view", compact && "checklist-form-view--compact")}>
      <style dangerouslySetInnerHTML={{ __html: checklistStyles }} />
      <div className="form-shell">
        <div className="form-card">
          <div className="form-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={isLift ? "/liftlogo.png" : "/new-logo.png"}
              alt={isLift ? "Lift Medik" : "Cot Medik"}
              className={cn("logo-main", isLift && "logo-lift")}
            />
          </div>

          <div className="form-body">
            {isLift ? (
              <>
                <section className="section">
                  <h1 className="page-title">Pass / Fail Preventive Maintenance Checklist</h1>
                  <hr className="section-rule" />
                </section>

                <section className="section">
                  <h2 className="section-title">Equipment Information</h2>
                  <hr className="section-rule" />
                  <div className="field-grid cols-2">
                    <Field label="Product Name" span2>
                      {formData.productName || "—"}
                    </Field>
                    <Field label="Serial Number">{formData.serialNumber || "—"}</Field>
                    <Field label="Model Number">{formData.modelNumber || "—"}</Field>
                    <Field label="Technician">
                      {formData.technicianName || technicianName || "—"}
                    </Field>
                    <Field label="Date of Service">
                      {dateIso ? formatCalendarIsoDate(dateIso) : formData.dateOfService || "—"}
                    </Field>
                  </div>
                </section>

                {!summaryOnly && (
                  <>
                    <section className="section">
                      <div className="lift-head">Inspection Items</div>
                      {LIFT_PM_CHECKLIST.map((item) => {
                        const status = statuses[item.id] ?? null;
                        return (
                          <div key={item.id} className="lift-item">
                            <div className="lift-item-top">
                              <div className="lift-item-id">{item.id}</div>
                              <span className={cn("result-pill", statusPillClass(status))}>
                                {liftStatusLabel(status)}
                              </span>
                            </div>
                            <div className="lift-item-desc">{item.desc}</div>
                          </div>
                        );
                      })}
                    </section>

                    <section className="section">
                      <h2 className="section-title">Final Functional Test and Disposition</h2>
                      <hr className="section-rule" />
                      {LIFT_PM_DISPOSITION.map((row) => {
                        const status = statuses[row.id] ?? null;
                        return (
                          <div key={row.id} className="lift-item" style={{ paddingLeft: 0, paddingRight: 0 }}>
                            <div className="lift-item-top">
                              <div className="lift-item-desc" style={{ flex: 1 }}>
                                {row.label}
                              </div>
                              <span className={cn("result-pill", statusPillClass(status))}>
                                {liftStatusLabel(status)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </section>
                  </>
                )}
              </>
            ) : (
              <>
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
                  <div className="field-grid cols-4">
                    <Field label="Serial Number" center>
                      {formData.serialNumber || "—"}
                    </Field>
                    <Field label="Type" center>
                      {formData.equipmentType === "lift"
                        ? "Lift"
                        : formData.equipmentType === "stretcher"
                          ? "Stretcher"
                          : "—"}
                    </Field>
                    <Field label="Product Name" center>
                      {formData.productName || "—"}
                    </Field>
                    <Field label="Model Number" center>
                      {formData.modelNumber || "—"}
                    </Field>
                  </div>
                </section>

                {!summaryOnly && (
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
                          const result = item.result === "Failed"
                            ? "Failed"
                            : item.result === "N/A"
                              ? "N/A"
                              : "Passed";
                          const pill =
                            result === "Passed" ? "pass" : result === "Failed" ? "fail" : "na";
                          return (
                            <tr key={`${item.desc}-${i}`} className={i % 2 === 1 ? "alt" : undefined}>
                              <td className="desc">{item.desc}</td>
                              <td className="right">{item.reading || ""}</td>
                              <td className="right">
                                <span className={cn("result-pill", pill)}>
                                  {result}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </section>
                )}
              </>
            )}
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

/** Exported for type-only consumers that previously imported status config via view. */
export { LIFT_STATUS_CONFIG };
