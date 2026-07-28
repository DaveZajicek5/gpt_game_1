(() => {
  "use strict";
  const encoded = (window.__CHIMERA_B64 || []).join("");
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const source = new TextDecoder().decode(bytes);
  delete window.__CHIMERA_B64;
  (0, eval)(source);
})();
