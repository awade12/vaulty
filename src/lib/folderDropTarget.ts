export function folderKeyElementFromPoint(clientX: number, clientY: number): string | null {
  const el = document.elementFromPoint(clientX, clientY);
  if (el == null) return null;
  const folderEl = el.closest("[data-vaulty-folder-key]");
  if (folderEl == null) return null;
  return folderEl.getAttribute("data-vaulty-folder-key");
}
