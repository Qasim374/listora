import Image from 'next/image'

export type AgentIdentity = {
  name: string
  headshotUrl: string | null
  brokerageName: string | null
  brokerageLogoUrl: string | null
  licenseNumber: string | null
}

/**
 * The agent's identity, rendered server-side and visible by default.
 *
 * Deliberately contains no email or phone number. Buyers get in touch through
 * the enquiry form, which means the agent captures the lead AND their address
 * never sits in the HTML of a widely-shared page for scrapers to harvest.
 *
 * Identity without contact details is the point: a buyer needs to know who is
 * selling before they will write to them.
 */
export function AgentCard({ agent }: { agent: AgentIdentity }) {
  const initials = agent.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="flex items-start gap-4">
      {agent.headshotUrl ? (
        <Image
          src={agent.headshotUrl}
          alt={agent.name}
          width={112}
          height={112}
          sizes="56px"
          className="h-14 w-14 shrink-0 rounded-full object-cover"
        />
      ) : (
        // Initials rather than a generic silhouette — less impersonal when an
        // agent hasn't uploaded a photo yet.
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 font-medium text-brand-700">
          {initials || '·'}
        </span>
      )}

      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-ink-muted">Listed by</p>
        <p className="mt-0.5 font-medium text-ink">{agent.name}</p>

        {agent.brokerageName ? (
          <div className="mt-1 flex items-center gap-2">
            {agent.brokerageLogoUrl ? (
              <Image
                src={agent.brokerageLogoUrl}
                alt={agent.brokerageName}
                width={80}
                height={40}
                sizes="40px"
                className="h-5 w-auto object-contain"
              />
            ) : null}
            <span className="truncate text-sm text-ink-soft">{agent.brokerageName}</span>
          </div>
        ) : null}

        {agent.licenseNumber ? (
          <p className="mt-1 text-xs text-ink-muted">Reg. {agent.licenseNumber}</p>
        ) : null}
      </div>
    </div>
  )
}
