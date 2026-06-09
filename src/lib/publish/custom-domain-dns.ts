import "server-only";

import dns from "node:dns/promises";

const CNAME_TARGET = process.env.VODEX_CUSTOM_DOMAIN_CNAME?.trim() || "cname.vodex.dev";
const TXT_PREFIX = "vodex-verify=";

export type DnsVerificationResult = {
  txtVerified: boolean;
  cnameVerified: boolean;
  aVerified: boolean;
  sslStatus: "pending" | "active" | "unknown";
  records: { txt: string[]; cname: string[]; a: string[] };
  expected: {
    cname: { type: string; name: string; host: string; value: string };
    txt: { type: string; name: string; host: string; value: string };
  };
  detected: { cname: string[]; txt: string[]; a: string[] };
  errors: string[];
  propagationNote: string;
};

export type CustomDomainDnsRecords = {
  cname: { type: "CNAME"; name: string; host: string; value: string };
  txt: { type: "TXT"; name: string; host: string; value: string };
  apexRedirectNote?: string;
  inputHostname?: string;
};

/** Apex = registrable root (example.com). CNAME cannot target apex — use www. */
export function isApexHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  const parts = host.split(".").filter(Boolean);
  return parts.length === 2;
}

/** Normalize user input: apex domains become www.{apex} for CNAME verification. */
export function normalizeCustomDomainHostname(raw: string): {
  inputHostname: string;
  hostname: string;
  isApex: boolean;
} {
  const inputHostname = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.replace(/\.$/, "") ?? "";
  const isApex = isApexHostname(inputHostname);
  const hostname = isApex ? `www.${inputHostname}` : inputHostname;
  return { inputHostname, hostname, isApex };
}

/** DNS provider "Name" column — subdomain label only, never the full apex domain. */
export function dnsRecordLabel(hostname: string): string {
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length <= 2) return "www";
  return parts[0] ?? hostname;
}

async function resolveTxtHosts(hosts: string[]): Promise<{ records: string[]; matched: boolean; token: string }> {
  const token = "";
  const all: string[] = [];
  let matched = false;
  for (const h of hosts) {
    try {
      const txts = await dns.resolveTxt(h);
      for (const row of txts) {
        const joined = row.join("");
        all.push(joined);
      }
    } catch {
      /* try next host */
    }
  }
  return { records: all, matched, token };
}

export async function verifyCustomDomainDns(
  hostname: string,
  verificationToken: string,
): Promise<DnsVerificationResult> {
  const host = hostname.trim().toLowerCase();
  const errors: string[] = [];
  const expected = buildCustomDomainDnsInstructions(host, verificationToken);
  const txtExpected = expected.txt.value;
  const txtHostFqdn = `_vodex.${host}`;
  const txtLabel = `_vodex.${dnsRecordLabel(host)}`;

  const txtRecords: string[] = [];
  let txtVerified = false;
  const txtHostsToTry = [txtHostFqdn, txtLabel];
  for (const txtHost of txtHostsToTry) {
    try {
      const txts = await dns.resolveTxt(txtHost);
      for (const row of txts) {
        const joined = row.join("");
        if (!txtRecords.includes(joined)) txtRecords.push(joined);
        if (joined === txtExpected) txtVerified = true;
      }
    } catch {
      /* continue */
    }
  }
  if (!txtVerified) {
    errors.push(
      `TXT not found at ${txtHostFqdn}. In IONOS use Name: ${txtLabel} with value ${txtExpected}`,
    );
  }

  const cnameRecords: string[] = [];
  let cnameVerified = false;
  try {
    const cnames = await dns.resolveCname(host);
    cnameRecords.push(...cnames);
    cnameVerified = cnames.some((c) => c.toLowerCase().replace(/\.$/, "") === CNAME_TARGET);
  } catch {
    const label = dnsRecordLabel(host);
    errors.push(
      `CNAME on ${host} should point to ${CNAME_TARGET}. In IONOS use Name: ${label} (not the full domain).`,
    );
    const zoneParts = host.split(".").filter(Boolean);
    if (zoneParts.length >= 2) {
      const zone = zoneParts.slice(-2).join(".");
      const mistakenHost = `${zoneParts[zoneParts.length - 2]}.${zone}`;
      if (mistakenHost !== host) {
        try {
          const wrong = await dns.resolveCname(mistakenHost);
          if (wrong.length) {
            errors.push(
              `Detected CNAME at ${mistakenHost} — likely doubled label (e.g. reciplyai.reciplyai.app). Use Name "${label}" only.`,
            );
            cnameRecords.push(...wrong.map((c) => `${mistakenHost}→${c}`));
          }
        } catch {
          /* no mistaken record */
        }
      }
    }
  }

  const aRecords: string[] = [];
  let aVerified = false;
  const apexCandidate = host.replace(/^www\./, "");
  if (isApexHostname(apexCandidate) || host.startsWith("www.")) {
    try {
      const a = await dns.resolve4(host);
      aRecords.push(...a);
      aVerified = a.length > 0;
    } catch {
      /* A not required when CNAME works */
    }
  }

  const sslStatus: DnsVerificationResult["sslStatus"] =
    cnameVerified && txtVerified ? "pending" : "unknown";

  const propagationNote =
    "DNS changes can take 5–60 minutes to propagate. Re-check after updating records at your provider.";

  return {
    txtVerified,
    cnameVerified,
    aVerified,
    sslStatus,
    records: { txt: txtRecords, cname: cnameRecords, a: aRecords },
    expected: {
      cname: expected.cname,
      txt: expected.txt,
    },
    detected: { cname: cnameRecords, txt: txtRecords, a: aRecords },
    errors,
    propagationNote,
  };
}

export function buildCustomDomainDnsInstructions(
  hostname: string,
  token: string,
): CustomDomainDnsRecords {
  const normalized = normalizeCustomDomainHostname(hostname);
  const host = normalized.hostname;
  const cnameName = dnsRecordLabel(host);
  const txtName = `_vodex.${cnameName}`;

  return {
    inputHostname: normalized.inputHostname,
    cname: { type: "CNAME", name: cnameName, host, value: CNAME_TARGET },
    txt: {
      type: "TXT",
      name: txtName,
      host: `_vodex.${host}`,
      value: `${TXT_PREFIX}${token}`,
    },
    apexRedirectNote: normalized.isApex
      ? `Root domains cannot use CNAME at apex. Add records for ${host}, then redirect ${normalized.inputHostname} → ${host} at your registrar.`
      : undefined,
  };
}

export type DnsProviderId = "ionos" | "godaddy" | "namecheap" | "cloudflare" | "other";

export function providerDnsGuidance(
  provider: DnsProviderId,
  instructions: CustomDomainDnsRecords,
): string {
  const base = [
    `CNAME — Name/Host: ${instructions.cname.name} → Value: ${instructions.cname.value}`,
    `TXT — Name/Host: ${instructions.txt.name} → Value: ${instructions.txt.value}`,
  ];
  switch (provider) {
    case "ionos":
      return [
        "IONOS: Use subdomain labels only in the Name field — never the full domain.",
        ...base,
        instructions.apexRedirectNote ?? "",
      ]
        .filter(Boolean)
        .join("\n");
    case "godaddy":
      return ["GoDaddy: DNS → Add → use Host as label only.", ...base].join("\n");
    case "namecheap":
      return ["Namecheap: Advanced DNS → Add New Record.", ...base].join("\n");
    case "cloudflare":
      return [
        "Cloudflare: DNS → Proxy OFF (grey cloud) for CNAME to Vodex.",
        ...base,
      ].join("\n");
    default:
      return base.join("\n");
  }
}
