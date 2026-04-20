export default function HelpPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Help &amp; Guide</h1>
        <p className="text-gray-500 text-sm mt-1">Learn how to use the platform from start to finish.</p>
      </div>

      {/* Quick nav */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">On this page</p>
        <div className="flex flex-wrap gap-2">
          {['overview','clients','briefs','generate','approvals','portal','calendar','export','team'].map(id => (
            <a key={id} href={`#${id}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline capitalize">
              {id === 'overview' ? 'How It Works' : id === 'generate' ? 'Generating Content' : id.charAt(0).toUpperCase() + id.slice(1)}
            </a>
          ))}
        </div>
      </div>

      <div className="space-y-6">

        {/* Overview */}
        <SectionCard id="overview" icon="Overview" title="How It Works — Overview">
          <p>This platform manages the full lifecycle of social media content for your clients — from briefing through AI generation to client approval and export.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            {[
              { step: '1. Setup', desc: 'Create a client, then create a brief for the month.' },
              { step: '2. Generate', desc: 'Run AI generation to produce captions, images, and videos.' },
              { step: '3. Approve', desc: 'Client reviews content in the portal; you action feedback.' },
            ].map(item => (
              <div key={item.step} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="font-semibold text-gray-900 mb-1">{item.step}</p>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Clients */}
        <SectionCard id="clients" icon="Clients" title="Clients">
          <p>A <strong>Client</strong> is a business you manage social media for. Every brief and piece of content belongs to a client.</p>
          <Step n={1} text='Go to Clients in the sidebar and click "New Client".' />
          <Step n={2} text="Fill in the business name, industry, and any brand notes (tone of voice, colours, things to avoid). These are fed directly into AI prompts." />
          <Step n={3} text="Save. The client now appears in the list and can be selected when creating briefs." />
          <Tip text="Detailed brand notes produce much better AI output. Include adjectives that describe the brand voice (e.g. friendly but professional, avoid jargon)." />
        </SectionCard>

        {/* Briefs */}
        <SectionCard id="briefs" icon="Briefs" title="Briefs">
          <p>A <strong>Brief</strong> defines what content to create for a client in a given month. You pick the platforms, content types, and goals once — then generate everything from it.</p>
          <Step n={1} text='Go to Briefs then "New Brief". Select the client and the scheduled month.' />
          <Step n={2} text="Add one or more platform rows. Each row is a combination of: Platform (e.g. Instagram) + Content Type (Image / Video / Carousel) + Goal (e.g. Brand Awareness) + number of posts." />
          <Step n={3} text="Write the Content Brief — what the posts should be about this month, key messages, tone, and any offers to highlight. This is the main prompt context for Claude." />
          <Step n={4} text='Save the brief. It will appear in the Briefs list with status "Draft".' />
          <Note text="Each platform row in a brief becomes an independent content item that can be generated, regenerated, and approved separately." />
          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Content Types explained</p>
            <div className="space-y-2">
              <ContentTypeRow label="Image" desc="Single static image with caption. Generated via Flux-1.1-pro." />
              <ContentTypeRow label="Video" desc="Short-form video clip. Thumbnail generated first, then RunwayML renders the video (takes ~2 min)." />
              <ContentTypeRow label="Carousel" desc="Multi-slide post. Each slide gets its own image — generation takes longer." />
            </div>
          </div>
        </SectionCard>

        {/* Generate */}
        <SectionCard id="generate" icon="Generate" title="Generating Content">
          <p>The <strong>Generate</strong> page is where AI creates the actual content from your briefs.</p>
          <Step n={1} text="Go to Generate. Use the Client and Status filters to find the brief you want to work on." />
          <Step n={2} text='Click "Generate" on a single platform row, or use "Generate All" on a brief to kick off all rows at once.' />
          <Step n={3} text="Claude writes the caption and visual prompt. Then the media pipeline runs automatically — image/video appears once ready." />
          <Step n={4} text="Review the result. If the caption or image is not right, hit Regenerate to try again (this replaces the existing content)." />
          <Note text="Video generation (RunwayML) runs asynchronously and may take 1-3 minutes. The status indicator updates automatically — you do not need to refresh the page." />
          <Tip text="If a media job fails (red indicator), use the Retry Media button to re-run only the media pipeline without re-generating text and prompts." />
          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Media status indicators</p>
            <div className="space-y-2">
              <StatusRow label="None" color="bg-gray-100 text-gray-600" desc="No media generated yet." />
              <StatusRow label="Generating" color="bg-blue-100 text-blue-700" desc="Pipeline running — wait for it to complete." />
              <StatusRow label="Ready" color="bg-green-100 text-green-700" desc="Media available for preview and download." />
              <StatusRow label="Failed" color="bg-red-100 text-red-700" desc="Pipeline error — use Retry Media." />
            </div>
          </div>
        </SectionCard>

        {/* Approvals */}
        <SectionCard id="approvals" icon="Approvals" title="Approvals & Revisions">
          <p>The <strong>Approvals</strong> page shows all content awaiting a decision. Clients review via their own portal; you action their feedback here.</p>
          <div className="border-t border-gray-100 pt-3">
            <p className="font-medium text-gray-900 mb-2">Content statuses</p>
            <div className="space-y-2">
              <StatusRow label="Pending" color="bg-gray-100 text-gray-700" desc="Awaiting client review." />
              <StatusRow label="Approved" color="bg-green-100 text-green-700" desc="Client has approved — ready to schedule." />
              <StatusRow label="Revision Requested" color="bg-yellow-100 text-yellow-700" desc="Client left a comment requesting changes." />
              <StatusRow label="Rejected" color="bg-red-100 text-red-700" desc="Client rejected — regenerate or discuss." />
            </div>
          </div>
          <Step n={1} text="When a client requests a revision, read their comment on the Approvals page." />
          <Step n={2} text="Go to Generate, find the content, and regenerate (or manually edit the caption if only text needs changing)." />
          <Step n={3} text='Once updated, the status resets to "Pending" and the client is notified to review again.' />
          <Tip text="You can also approve or reject content on behalf of the client directly from the Approvals page — useful for internal sign-off workflows." />
        </SectionCard>

        {/* Portal */}
        <SectionCard id="portal" icon="Portal" title="Client Portal">
          <p>Clients log in at <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">/portal</code> with their own credentials (CLIENT role). They see only their own content — no other client data is visible.</p>
          <Step n={1} text='Create a CLIENT-role user via Team then "New Member" and assign them to the correct client.' />
          <Step n={2} text="Share their login credentials. They visit the site and log in — they land directly on the portal." />
          <Step n={3} text="In the portal, clients can Approve, Request Revision (with a comment), or Reject each content item." />
          <Note text="Clients cannot see the Generate page, Briefs, other Clients, or any admin/team functionality." />
        </SectionCard>

        {/* Calendar */}
        <SectionCard id="calendar" icon="Calendar" title="Calendar">
          <p>The <strong>Calendar</strong> gives a month-view of all scheduled content across clients and platforms.</p>
          <Step n={1} text="Use the month navigation arrows to move between months." />
          <Step n={2} text="Click any content chip on the calendar to open the detail view." />
          <Step n={3} text='To set or change a post scheduled date, open it from Generate or Approvals and edit the "Scheduled Date" field.' />
          <Note text="If no scheduled date is set on a content item, it defaults to the first day of its brief's month on the calendar." />
        </SectionCard>

        {/* Export */}
        <SectionCard id="export" icon="Export" title="Export & Reports">
          <p>The <strong>Export</strong> page lets you download content data for reporting or handoff.</p>
          <Step n={1} text="Choose the client and month range you want to export." />
          <Step n={2} text='Click "Export CSV" to download a spreadsheet with all content items, statuses, captions, and media URLs.' />
          <Step n={3} text='Click "Export PDF" (or use the Print Report view) to generate a formatted report suitable for client presentations.' />
          <Tip text="The PDF renderer uses text-only output — emoji in captions are automatically converted to Latin characters to ensure they print correctly." />
        </SectionCard>

        {/* Team */}
        <SectionCard id="team" icon="Team" title="Team Management">
          <p><strong>Admin only.</strong> The Team page manages who has access to the platform.</p>
          <div className="space-y-2">
            <ContentTypeRow label="ADMIN" desc="Full access — clients, briefs, generate, approvals, team management, export." />
            <ContentTypeRow label="TEAM" desc="Full access except Team management (cannot create/delete users)." />
            <ContentTypeRow label="CLIENT" desc="Portal-only access — can only view and approve their own content." />
          </div>
          <Step n={1} text='Go to Team then "New Member". Enter name, email, password, and role.' />
          <Step n={2} text="For CLIENT role, also select which client account they belong to." />
          <Step n={3} text="The user can now log in. Share their credentials — they cannot change their email from the portal." />
          <Tip text="Team members can change their own password and display name from the Settings page." />
        </SectionCard>

      </div>
    </div>
  )
}

// ── Reusable sub-components ───────────────────────────────────────────────────

function SectionCard({ id, icon, title, children }: {
  id: string
  icon: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded">{icon}</span>
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4 text-sm text-gray-700 leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </span>
      <p>{text}</p>
    </div>
  )
}

function Note({ text }: { text: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800 text-sm">
      <span className="font-semibold">Note: </span>{text}
    </div>
  )
}

function Tip({ text }: { text: string }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-blue-800 text-sm">
      <span className="font-semibold">Tip: </span>{text}
    </div>
  )
}

function ContentTypeRow({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded shrink-0 mt-0.5 h-fit">{label}</span>
      <p className="text-gray-600">{desc}</p>
    </div>
  )
}

function StatusRow({ label, color, desc }: { label: string; color: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${color}`}>{label}</span>
      <span className="text-gray-600">{desc}</span>
    </div>
  )
}
