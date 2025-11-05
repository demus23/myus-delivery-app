const defaults: Record<string, string[]> = {
  GB: [
    "HS","ZE","KW","IV","PH","PA20","PA38","PA39","PA40","PA41","PA42","PA43","PA44",
    "PA45","PA46","PA47","PA48","PA49","PA60","PA61","PA62","PA63","PA64","PA65","PA66",
    "PA67","PA68","PA69","PA70","PA71","PA72","PA73","PA74","PA75","PA76","PA77","PA78",
    "IM","GY","JE"
  ],
  CA: ["A0","X0","Y0"],
};

export function isRemotePostcode(country?: string, postcode?: string, extraPrefixes: string[] = []) {
  if (!postcode) return false;
  const c = (country || "").toUpperCase();
  const pc = postcode.toUpperCase().replace(/\s+/g, "");
  const list = [...(defaults[c] || []), ...extraPrefixes];
  return list.some((p) => pc.startsWith(p));
}
