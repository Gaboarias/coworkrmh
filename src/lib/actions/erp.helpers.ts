export const ER = "/operations";

// requireWs / requireWsCan se mudaron a ./guards junto con el resto de los
// guards (antes cada área tenía el suyo). Se re-exportan para no tocar los
// imports de los 6 archivos del ERP.
export { requireWs, requireWsCan } from "./guards";
