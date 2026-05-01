import LinkAcceptClient from "./LinkAcceptClient";
import { headers } from "next/headers";

type LinkAcceptPageProps = {
  searchParams?: Promise<{ t?: string }>;
};

const hostSchemeMap = new Map([
  ["dev.userekindle.com", "rekindle-dev"],
  ["staging.userekindle.com", "rekindle-staging"],
  ["userekindle.com", "rekindle"],
  ["www.userekindle.com", "rekindle"],
]);

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

function resolveEnvScheme(): string {
  const explicitScheme = process.env.REKINDLE_LINK_SCHEME;

  if (
    explicitScheme === "rekindle-dev" ||
    explicitScheme === "rekindle-staging" ||
    explicitScheme === "rekindle"
  ) {
    return explicitScheme;
  }

  const variant = process.env.WELL_KNOWN_VARIANT;

  if (variant === "dev") return "rekindle-dev";
  if (variant === "staging") return "rekindle-staging";

  return "rekindle";
}

async function resolveDeepLinkScheme(): Promise<string> {
  const host = normalizeHost((await headers()).get("host") ?? "");

  return hostSchemeMap.get(host) ?? resolveEnvScheme();
}

export default async function LinkAcceptPage({
  searchParams,
}: LinkAcceptPageProps) {
  const params = (await searchParams) ?? {};
  const scheme = await resolveDeepLinkScheme();
  const token = params.t ?? "";

  return <LinkAcceptClient scheme={scheme} token={token} />;
}
