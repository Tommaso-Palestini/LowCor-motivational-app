export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canShareFiles() {
  try {
    const probe = new File([""], "probe.pdf", { type: "application/pdf" });
    return Boolean(navigator.canShare && navigator.canShare({ files: [probe] }));
  } catch {
    return false;
  }
}

// Sul telefono apre il pannello di condivisione (WhatsApp, Mail, …); altrove scarica il file.
export async function sharePdf(blob, filename, title) {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
    } catch (error) {
      if (error.name !== "AbortError") {
        throw error;
      }
    }
    return;
  }
  downloadBlob(blob, filename);
}
