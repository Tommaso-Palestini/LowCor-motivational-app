import { getFontEmbedCSS, toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";

// Cattura ogni pagina HTML come immagine (a doppia risoluzione, nitida anche su schermi retina)
// e la mette su una pagina A4 del PDF.
export async function pagesToPdf(nodes, { title, author, width, height }) {
  await document.fonts.ready;
  const fontEmbedCSS = await getFontEmbedCSS(nodes[0]);
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let cover = null;

  for (const [index, node] of nodes.entries()) {
    const image = await toJpeg(node, { pixelRatio: 2, quality: 0.9, fontEmbedCSS, width, height });
    if (index > 0) {
      pdf.addPage();
    }
    pdf.addImage(image, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
    cover = cover || image;
  }

  pdf.setProperties({ title, author, creator: "LowCor" });
  return { blob: pdf.output("blob"), cover };
}
