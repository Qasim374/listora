import { AgentProfileForm } from '@/components/agent-profile-form'
import { requireAgent } from '@/lib/auth/current-agent'
import { isBlobConfigured } from '@/lib/blob'

export const metadata = { title: 'Your profile' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const agent = await requireAgent()

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl text-brand-900">Your profile</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        This appears on every listing you publish. Buyers are far more likely to make contact when
        they can see who is selling.
      </p>

      <div className="mt-8">
        <AgentProfileForm
          uploadsEnabled={isBlobConfigured()}
          initial={{
            name: agent.name,
            email: agent.email,
            market: agent.market,
            phone: agent.phone,
            brokerageName: agent.brokerageName,
            brokerageLogoUrl: agent.brokerageLogoUrl,
            licenseNumber: agent.licenseNumber,
            headshotUrl: agent.headshotUrl,
          }}
        />
      </div>
    </div>
  )
}
