(async () => {
  "use strict";
  try {
    const binary = atob(window.__CHIMERA_GZIP || "");
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    const source = await new Response(stream).text();
    delete window.__CHIMERA_GZIP;
    (0, eval)(source);
  } catch (error) {
    console.error("CHIMERA LOOP v0.3 boot failed", error);
    const output = document.getElementById("test-output");
    if (output) output.textContent = `BOOT_ERROR: ${error.stack || error}`;
  }
})();
