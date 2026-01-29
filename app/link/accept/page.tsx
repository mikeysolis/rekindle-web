import LinkAcceptClient from './LinkAcceptClient'

type LinkAcceptPageProps = {
  searchParams?: { t?: string }
}

export default function LinkAcceptPage({ searchParams }: LinkAcceptPageProps) {
  const token = searchParams?.t ?? ''

  return <LinkAcceptClient token={token} />
}
