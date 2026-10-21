import DOMPurify from "dompurify";

// Endurece los enlaces generados por HTML sanitizado: cualquier <a
// target="_blank"> que sobreviva al sanitize recibe rel="noopener noreferrer"
// (mitigación de reverse tabnabbing). El hook vive en el singleton, por lo que
// todos los importadores de "dompurify" quedan cubiertos.
DOMPurify.addHook("afterSanitizeAttributes", function (node) {
  if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export default DOMPurify;
