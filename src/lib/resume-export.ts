// Client-side resume export helpers: printable HTML, PDF (print dialog), DOCX and plain text.

export interface ExportResume {
  fullName?: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  portfolio?: string;
  github?: string;
  summary?: string;
  skills?: string[];
  experience?: { role: string; org: string; period: string; details: string[] }[];
  education?: { degree: string; institution: string; period: string; result: string }[];
  certifications?: string[];
  languages?: string[];
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) =>
    char === "&" ? "&amp;" : char === "<" ? "&lt;" : char === ">" ? "&gt;" : char === '"' ? "&quot;" : "&#39;",
  );

export function resumeFileName(content: ExportResume, extension: string) {
  const base = (content.fullName || "resume").trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
  return `${base || "resume"}-cv.${extension}`;
}

/** Full A4 print/export document for the resume. */
export function buildResumeHtml(content: ExportResume, templateName = "Resume") {
  const joinMeta = (values: (string | undefined)[]) =>
    values.filter((value): value is string => Boolean(value)).map(escapeHtml).join(" &nbsp;•&nbsp; ");
  const contactLine = joinMeta([content.email, content.phone, content.location]);
  const linkLine = joinMeta([content.linkedin, content.portfolio, content.github]);

  const section = (title: string, body: string) =>
    body ? `<section><h2>${escapeHtml(title)}</h2>${body}</section>` : "";

  const experience = (content.experience ?? [])
    .filter((item) => item.role || item.org)
    .map(
      (item) => `
      <div class="entry">
        <p class="entry-title">${escapeHtml(item.role || "")}${item.org ? ` — ${escapeHtml(item.org)}` : ""}</p>
        ${item.period ? `<p class="entry-meta">${escapeHtml(item.period)}</p>` : ""}
        ${
          (item.details ?? []).filter(Boolean).length
            ? `<ul>${item.details.filter(Boolean).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
            : ""
        }
      </div>`,
    )
    .join("");

  const education = (content.education ?? [])
    .filter((item) => item.degree || item.institution)
    .map(
      (item) => `
      <div class="entry">
        <p class="entry-title">${escapeHtml(item.degree || "")}${item.institution ? ` — ${escapeHtml(item.institution)}` : ""}</p>
        <p class="entry-meta">${[item.period, item.result].filter(Boolean).map(escapeHtml).join(" · ")}</p>
      </div>`,
    )
    .join("");

  const listBlock = (values?: string[]) =>
    values && values.filter(Boolean).length ? `<p>${values.filter(Boolean).map(escapeHtml).join(", ")}</p>` : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${escapeHtml(content.fullName || templateName)} — CV</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11.5pt; line-height: 1.5; }
  header { border-bottom: 2px solid #2563ff; padding-bottom: 10px; margin-bottom: 16px; }
  h1 { font-size: 22pt; margin: 0 0 4px; letter-spacing: -0.4px; }
  .headline { color: #2563ff; font-weight: 600; margin: 0 0 6px; }
  .meta { color: #475569; font-size: 10pt; margin: 2px 0; }
  h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 1px; color: #2563ff; margin: 16px 0 6px; }
  section { page-break-inside: avoid; }
  .entry { margin-bottom: 10px; }
  .entry-title { font-weight: 700; margin: 0; }
  .entry-meta { color: #64748b; font-size: 10pt; margin: 1px 0 4px; }
  ul { margin: 4px 0 0 18px; padding: 0; }
  li { margin-bottom: 2px; }
  p { margin: 0 0 4px; }
</style></head>
<body>
  <header>
    <h1>${escapeHtml(content.fullName || "Your Name")}</h1>
    ${content.headline ? `<p class="headline">${escapeHtml(content.headline)}</p>` : ""}
    ${contactLine ? `<p class="meta">${contactLine}</p>` : ""}
    ${linkLine ? `<p class="meta">${linkLine}</p>` : ""}
  </header>
  ${section("Professional Summary", content.summary ? `<p>${escapeHtml(content.summary)}</p>` : "")}
  ${section("Skills", listBlock(content.skills))}
  ${section("Experience", experience)}
  ${section("Education", education)}
  ${section("Certifications", listBlock(content.certifications))}
  ${section("Languages", listBlock(content.languages))}
</body></html>`;
}

export function buildResumeText(content: ExportResume) {
  const lines: string[] = [];
  lines.push(content.fullName || "Your Name");
  if (content.headline) lines.push(content.headline);
  const contact = [content.email, content.phone, content.location].filter(Boolean).join(" | ");
  if (contact) lines.push(contact);
  const links = [content.linkedin, content.portfolio, content.github].filter(Boolean).join(" | ");
  if (links) lines.push(links);
  if (content.summary) lines.push("", "SUMMARY", content.summary);
  if (content.skills?.length) lines.push("", "SKILLS", content.skills.join(", "));
  if (content.experience?.length) {
    lines.push("", "EXPERIENCE");
    for (const item of content.experience) {
      lines.push(`${item.role}${item.org ? ` — ${item.org}` : ""}${item.period ? ` (${item.period})` : ""}`);
      for (const detail of item.details ?? []) if (detail) lines.push(`  - ${detail}`);
    }
  }
  if (content.education?.length) {
    lines.push("", "EDUCATION");
    for (const item of content.education) {
      lines.push(`${item.degree}${item.institution ? ` — ${item.institution}` : ""}${item.period ? ` (${item.period})` : ""}${item.result ? ` · ${item.result}` : ""}`);
    }
  }
  if (content.certifications?.length) lines.push("", "CERTIFICATIONS", content.certifications.join(", "));
  if (content.languages?.length) lines.push("", "LANGUAGES", content.languages.join(", "));
  return lines.join("\n");
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Opens the browser print dialog with only the resume rendered (Save as PDF works from there). */
export function printResume(html: string) {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    throw new Error("Unable to open the print view");
  }
  doc.open();
  doc.write(html);
  doc.close();

  const run = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 1000);
  };
  if (doc.readyState === "complete") window.setTimeout(run, 150);
  else frame.contentWindow.addEventListener("load", () => window.setTimeout(run, 150));
}

export function downloadResumeHtml(content: ExportResume, html: string) {
  downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), resumeFileName(content, "html"));
}

/** Word-compatible .doc (HTML) file — opens natively in Word, Google Docs and Pages. */
export function downloadResumeDocx(content: ExportResume, html: string) {
  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">${html.replace(/^[\s\S]*?<html[^>]*>/i, "").replace(/<\/html>\s*$/i, "")}</html>`;
  downloadBlob(new Blob(["\ufeff", doc], { type: "application/msword" }), resumeFileName(content, "doc"));
}

export function downloadResumeText(content: ExportResume) {
  downloadBlob(new Blob([buildResumeText(content)], { type: "text/plain;charset=utf-8" }), resumeFileName(content, "txt"));
}

export function emailResume(content: ExportResume) {
  const subject = `${content.fullName || "My"} CV${content.headline ? ` — ${content.headline}` : ""}`;
  const body = buildResumeText(content).slice(0, 1800);
  window.location.href = `mailto:${content.email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function shareResume(content: ExportResume, html: string) {
  const fileName = resumeFileName(content, "html");
  const file = new File([html], fileName, { type: "text/html" });
  const nav = navigator as Navigator & { canShare?: (data: { files?: File[] }) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({ title: `${content.fullName || "My"} CV`, files: [file] });
    return "shared" as const;
  }
  if (nav.share) {
    await nav.share({ title: `${content.fullName || "My"} CV`, text: buildResumeText(content).slice(0, 1200) });
    return "shared" as const;
  }
  await navigator.clipboard.writeText(buildResumeText(content));
  return "copied" as const;
}
