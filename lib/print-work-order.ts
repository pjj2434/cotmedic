/**
 * Print work order form content.
 * Uses a new-tab strategy on iOS Safari (iframe print is unreliable there),
 * and hidden iframe printing elsewhere.
 */
export function printWorkOrderContent(
  printRoot: HTMLElement,
  options?: { forcePopupPrint?: boolean }
): void {
  const content = printRoot.innerHTML;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalonePwa =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  const isReportPrint = !!printRoot.querySelector(".report-print-sheet");

  const printStyles = isReportPrint
    ? `
    @page { size: 8.5in 11in; margin: 0.35in; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff !important; width: auto; height: auto; overflow: visible; }
    .print-root { display: block; width: 100%; }
    .report-screen { display: none !important; }
    .report-print-sheet { display: block !important; width: 100%; }
    .report-print-sheet .report-header {
      break-inside: avoid-page;
      page-break-inside: avoid;
      margin-bottom: 14px;
      width: 100% !important;
      text-align: center !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
    }
    .report-print-sheet .report-header-logos {
      display: flex !important;
      flex-direction: row !important;
      justify-content: center !important;
      align-items: center !important;
      width: 100% !important;
      gap: 16px !important;
    }
    .report-print-sheet img.report-logo,
    .report-print-sheet .report-header img {
      display: inline-block !important;
      width: 96px !important;
      height: 22px !important;
      min-width: 96px !important;
      min-height: 22px !important;
      max-width: 96px !important;
      max-height: 22px !important;
      object-fit: contain !important;
      vertical-align: middle !important;
      flex: 0 0 auto !important;
    }
    .report-print-sheet .break-inside-avoid { break-inside: avoid-page; page-break-inside: avoid; }
    .report-print-sheet .report-data-table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      font-size: 8.5px !important;
      line-height: 1.35 !important;
    }
    .report-print-sheet .report-data-table th,
    .report-print-sheet .report-data-table td {
      border: 1px solid #000 !important;
      padding: 4px 5px !important;
      vertical-align: top !important;
      word-wrap: break-word !important;
      overflow-wrap: anywhere !important;
    }
    .report-print-sheet .report-data-table thead th {
      background: #18181b !important;
      color: #fff !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.04em !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .report-print-sheet .report-data-table .report-row-alt td {
      background: #f4f4f5 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .report-print-sheet .report-data-table .cell-center { text-align: center !important; }
    .report-print-sheet .report-data-table .cell-work { font-size: 8.5px !important; }
    .report-print-sheet .report-data-table .cell-work p { margin: 0 0 3px 0 !important; }
    .report-print-sheet .report-data-table .cell-work p:last-child { margin-bottom: 0 !important; }
    .report-print-sheet .report-data-table .cell-label { font-weight: 700 !important; }
  `
    : `
    @page { size: 8.5in 11in; margin: 0.2in; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #fff !important; width: auto; height: auto; overflow: hidden; }
    .print-root { display: block; width: 100%; }
    .print-scale { width: 100% !important; max-width: none !important; margin: 0 !important; transform: none !important; }
    .print-scale > .wo-form-view { width: 100% !important; max-width: none !important; }
    .print-scale > .wo-form-view .form-shell { width: 100% !important; max-width: none !important; min-height: calc(11in - 0.4in) !important; display: flex !important; padding: 0 !important; background: #fff !important; }
    .print-scale > .wo-form-view .form-card { width: 100% !important; max-width: none !important; min-height: 100% !important; display: flex !important; flex-direction: column !important; margin: 0 !important; box-shadow: none !important; }
    .form-shell { min-height: calc(11in - 0.4in) !important; display: flex !important; padding: 0 !important; background: #fff !important; page-break-inside: avoid; break-inside: avoid-page; }
    .form-card { width: 100% !important; max-width: none !important; min-height: 100% !important; display: flex !important; flex-direction: column !important; margin: 0 !important; box-shadow: none !important; page-break-inside: avoid; break-inside: avoid-page; }
    .form-body { flex: 1 1 auto !important; }
    .section, .parts-grid, .subsection { break-inside: avoid-page; page-break-inside: avoid; }
    @media print {
      .print-root, .print-scale, .wo-form-view, .form-shell, .form-card { width: 100% !important; max-width: none !important; }
      .form-body { padding: 16px 20px !important; }
      .section { margin-bottom: 16px !important; }
    }
  `;
  const html = `<!DOCTYPE html><html><head><base href="${origin}/" /><style>${printStyles}</style></head><body><div class="print-root"><div class="print-scale">${content}</div></div></body></html>`;

  if (options?.forcePopupPrint) {
    const pop = window.open("", "_blank");
    if (!pop) return;
    pop.document.open();
    pop.document.write(html);
    pop.document.close();
    const triggerPrint = () => {
      pop.focus();
      pop.print();
    };
    if (pop.document.readyState === "complete") {
      setTimeout(triggerPrint, 100);
    } else {
      pop.addEventListener("load", () => setTimeout(triggerPrint, 100), { once: true });
    }
    return;
  }

  const waitForImages = (root: ParentNode) => {
    const imgEls = root.querySelectorAll("img");
    const imgPromises = Array.from(imgEls).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    );
    return Promise.all(imgPromises);
  };

  if (isIOS && isStandalonePwa) {
    // iOS standalone PWA: render an in-app print preview overlay.
    const existingOverlay = document.getElementById("work-order-pwa-print-overlay");
    if (existingOverlay) existingOverlay.remove();
    const existingStyle = document.getElementById("work-order-pwa-print-style");
    if (existingStyle) existingStyle.remove();

    const styleEl = document.createElement("style");
    styleEl.id = "work-order-pwa-print-style";
    styleEl.textContent = `
      #work-order-pwa-print-overlay {
        position: fixed;
        inset: 0;
        z-index: 999999;
        background: #f5f5f5;
        display: flex;
        flex-direction: column;
        pointer-events: auto;
      }
      #work-order-pwa-print-overlay .toolbar {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 12px;
        background: #111;
        color: #fff;
      }
      #work-order-pwa-print-overlay .toolbar p {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 13px;
        opacity: 0.9;
      }
      #work-order-pwa-print-overlay .toolbar-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #work-order-pwa-print-overlay button {
        border: 0;
        border-radius: 8px;
        color: #fff;
        padding: 10px 14px;
        font-size: 14px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        pointer-events: auto;
        touch-action: manipulation;
      }
      #work-order-pwa-print-overlay .btn-close { background: #3f3f46; }
      #work-order-pwa-print-overlay .btn-print { background: #dc2626; }
      #work-order-pwa-print-overlay .content {
        flex: 1;
        overflow: auto;
        padding: 12px;
      }
      #work-order-pwa-print-overlay .print-scale { transform-origin: top center; }
      @media print {
        body > *:not(#work-order-pwa-print-overlay):not(#work-order-pwa-print-style) { display: none !important; }
        #work-order-pwa-print-overlay .toolbar { display: none !important; }
        #work-order-pwa-print-overlay .content { padding: 0 !important; overflow: visible !important; }
        #work-order-pwa-print-overlay .print-scale {
          transform: scale(var(--fit-scale, 0.84));
          width: calc(100% / var(--fit-scale, 0.84));
        }
      }
    `;
    document.head.appendChild(styleEl);

    const overlay = document.createElement("div");
    overlay.id = "work-order-pwa-print-overlay";
    overlay.innerHTML = `
      <div class="toolbar">
        <p>Tap Print, or use Share → Print.</p>
        <div class="toolbar-actions">
          <button type="button" class="btn-close">Close</button>
          <button type="button" class="btn-print">Print</button>
        </div>
      </div>
      <div class="content">
        <base href="${origin}/" />
        <style>${printStyles}</style>
        <div class="print-root"><div class="print-scale">${content}</div></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const fitToSinglePage = () => {
      const pageHeightPx = (11 - 0.4) * 96;
      const scaleRoot = overlay.querySelector(".print-scale") as HTMLElement | null;
      if (!scaleRoot) return;
      scaleRoot.style.transform = "none";
      scaleRoot.style.width = "100%";
      const fullHeight = scaleRoot.scrollHeight;
      const fitScale = Math.max(0.68, Math.min(1, pageHeightPx / fullHeight));
      document.documentElement.style.setProperty("--fit-scale", String(fitScale));
    };

    const cleanup = () => {
      overlay.remove();
      styleEl.remove();
      window.removeEventListener("afterprint", cleanup);
    };

    const closeBtn = overlay.querySelector(".btn-close");
    const printBtn = overlay.querySelector(".btn-print");
    closeBtn?.addEventListener("click", cleanup);
    printBtn?.addEventListener("click", () => {
      fitToSinglePage();
      window.focus();
      let afterPrintFired = false;
      const markAfterPrint = () => {
        afterPrintFired = true;
        window.removeEventListener("afterprint", markAfterPrint);
      };
      window.addEventListener("afterprint", markAfterPrint, { once: true });
      window.print();
      // Fallback: if iOS PWA suppresses print, open a dedicated print page.
      setTimeout(() => {
        if (afterPrintFired) return;
        const fallbackHtml = `<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><base href="${origin}/" /><style>${printStyles}</style></head><body><div class="print-root"><div class="print-scale">${content}</div></div><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),100));<\/script></body></html>`;
        const pop = window.open("", "_blank");
        if (!pop) return;
        pop.document.open();
        pop.document.write(fallbackHtml);
        pop.document.close();
      }, 500);
      setTimeout(cleanup, 2500);
    });

    requestAnimationFrame(fitToSinglePage);
    window.addEventListener("afterprint", cleanup, { once: true });
    return;
  }

  if (isIOS) {
    // iOS/PWA is more reliable when printing from the current window.
    const existingContainer = document.getElementById("work-order-ios-print-root");
    if (existingContainer) existingContainer.remove();

    const styleEl = document.createElement("style");
    styleEl.id = "work-order-ios-print-style";
    styleEl.textContent = `
      @media print {
        body > *:not(#work-order-ios-print-root) { display: none !important; }
        #work-order-ios-print-root { display: block !important; }
      }
      #work-order-ios-print-root {
        display: none;
      }
      #work-order-ios-print-root .print-root {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        width: 100%;
      }
      #work-order-ios-print-root .print-scale {
        width: 100%;
        max-width: 7.8in;
        margin: 0 auto;
      }
      #work-order-ios-print-root .form-shell {
        padding: 0 !important;
        background: #fff !important;
      }
      #work-order-ios-print-root .form-card {
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(styleEl);

    const container = document.createElement("div");
    container.id = "work-order-ios-print-root";
    container.innerHTML = `<base href="${origin}/" /><style>${printStyles}</style><div class="print-root"><div class="print-scale">${content}</div></div>`;
    document.body.appendChild(container);

    const cleanup = () => {
      container.remove();
      styleEl.remove();
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup, { once: true });

    // Keep print in the same user gesture chain for iOS/PWA.
    void container.offsetHeight;
    window.focus();
    window.print();
    // Some iOS/PWA contexts don't fire afterprint reliably.
    setTimeout(cleanup, 2000);
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "816px"; // 8.5in at 96dpi
  iframe.style.height = "1056px"; // 11in at 96dpi
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  waitForImages(doc).then(() => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 1000);
    }, 100);
  });
}
