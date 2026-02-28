import LinkAcceptClient from "./LinkAcceptClient";

type LinkAcceptPageProps = {
  searchParams?: Promise<{ t?: string }>;
};

export default async function LinkAcceptPage({
  searchParams,
}: LinkAcceptPageProps) {
  const params = (await searchParams) ?? {};
  const token = params.t ?? "";

  return <LinkAcceptClient token={token} />;
}
