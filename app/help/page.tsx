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
          {['overview','clients','briefs','generate','approvals','reports','portal','calendar','export','team'].map(id => (
            <a key={id} href={`#${id}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline capitalize">
              {id === 'overview' ? 'How It Works' : id === 'generate' ? 'Generating Content' : id === 'reports' ? 'Approval Report' : id.charAt(0).toUpperCase() + id.slice(1)}
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
              { step: '2. Generate', desc: 'Generate text content first, review it, then generate images or videos per platform.' },
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
          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Brand Voice Profile</p>
            <p className="text-gray-600 mb-3">Each client has a <strong>Brand Voice Profile</strong> — a set of structured fields that are automatically injected into every AI generation prompt for that client, ensuring consistent tone and messaging across all content.</p>
            <div className="space-y-2">
              <ContentTypeRow label="Tone Keywords" desc="Pick from preset adjectives (Friendly, Bold, Professional…) or type your own, comma-separated. These words steer Claude's writing style for every post." />
              <ContentTypeRow label="Always Do" desc="Things the brand must always include — e.g. 'Mention our 5-year warranty', 'Use first-person plural (we/our)'." />
              <ContentTypeRow label="Never Do" desc="Hard restrictions — e.g. 'Never mention competitor prices', 'No exclamation marks'." />
              <ContentTypeRow label="Competitors to Avoid" desc="Brand or product names that should never appear in any generated content." />
              <ContentTypeRow label="Preferred Hashtags" desc="Hashtags to include or draw from — Claude will weave these into the hashtag suggestions for each post." />
            </div>
            <Tip text="You can leave any Brand Voice field blank — only the fields you fill in are sent to Claude. Existing clients without Brand Voice data continue to work exactly as before." />
          </div>
        </SectionCard>

        {/* Briefs */}
        <SectionCard id="briefs" icon="Briefs" title="Briefs">
          <p>A <strong>Brief</strong> defines what content to create for a client in a given month. You pick the platforms, content types, and goals once — then generate everything from it.</p>
          <Step n={1} text='Go to Briefs then "New Brief". Select the client and the scheduled month.' />
          <Step n={2} text="Select platform and content type combinations using the toggle buttons — e.g. Instagram Image, LinkedIn Video. Each platform you enable defaults to 4 posts for the month. Use the − / + buttons or type a number to set how many posts you need per platform." />
          <Step n={3} text="Write the Content Brief — what the posts should be about this month, key messages, tone, and any offers to highlight. This is the main prompt context for Claude." />
          <Step n={4} text='Save the brief. It will appear in the Briefs list with status "Draft".' />
          <Note text="Each platform row tracks its own post count. All posts for a platform are generated from the same brief but Claude uses a different angle, hook, and message for each — so a brief set to 8 Instagram posts will produce 8 distinct captions." />

          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Viewing and reviewing posts from the brief</p>
            <p className="text-gray-600 mb-3">Each generated post has a <strong>View →</strong> button. Clicking it opens a slide-over panel on the right — without leaving the brief — showing the full post: media preview, caption, copy, hashtags, revision thread, and all approval actions. You can also set the post&apos;s scheduled date and retry failed media from inside the panel. Press <strong>Escape</strong> or click the backdrop to close it.</p>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-800 mb-1">Caption character counter</p>
                <p className="text-gray-600">The Caption field shows a live character counter in the top-right corner — e.g. <em>312 / 2,200</em>. The counter turns amber when you pass 80% of the platform limit and red with a ⚠ warning when you exceed it. Platform limits: Instagram &amp; TikTok 2,200 · LinkedIn 3,000 · Facebook 63,206 · Twitter 280 · Google Business 1,500 · YouTube 5,000 (video description).</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 mb-1">Regenerate with Direction</p>
                <p className="text-gray-600">At the bottom of the panel there is a <strong>Regenerate Text</strong> field. Type a direction — e.g. <em>&ldquo;make it shorter and punchier&rdquo;</em>, <em>&ldquo;focus on the discount offer&rdquo;</em>, <em>&ldquo;more emotional tone&rdquo;</em> — then click <strong>↺ Regenerate</strong>. This replaces only that single post with a new AI-generated version guided by your direction. All other posts in the platform are untouched. The direction is the top priority for Claude and overrides the brief and brand voice for that generation.</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 mb-1">Internal Notes</p>
                <p className="text-gray-600">Each post has an <strong>Internal Note</strong> field — an amber text area visible only to ADMIN and TEAM users. Use it for things like <em>&ldquo;client wants to post this on Tuesday&rdquo;</em> or <em>&ldquo;waiting for client photo&rdquo;</em>. Notes auto-save when you click away (no save button needed). Internal notes are <strong>never shown</strong> in the client portal.</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 mb-1">Revision Thread</p>
                <p className="text-gray-600">The <strong>Revision Thread</strong> section in the panel shows the full back-and-forth history with the client. Client comments appear in orange; team replies appear in blue. Use the reply box below the thread to send a message back to the client — it is added to the thread without changing the content status.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Collapsible platform sections</p>
            <p className="text-gray-600">On the brief detail page, each platform is shown as a collapsible card. Platforms where all planned posts have been generated are <strong>collapsed by default</strong> to keep the page tidy. Click the chevron (›) on any platform card to expand or collapse it.</p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Duplicating a brief to next month</p>
            <p className="text-gray-600">Click <strong>Duplicate to next month</strong> in the brief header. A new brief is created with the same title, platforms, post counts, and brief text — but scheduled one calendar month ahead. No generated content is copied, so you can generate fresh posts for the new month from scratch. You are taken to the new brief immediately after duplication.</p>
            <Tip text="Use duplication for recurring monthly retainer clients — duplicate last month's brief, update the Content Brief field with any new messaging, then generate." />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Deleting a brief</p>
            <p className="text-gray-600">Click <strong>Delete Brief</strong> in the page header. You will be asked to confirm before anything is removed. Deleting a brief permanently removes it along with all its generated content, media, and revision history — this cannot be undone.</p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Content Types explained</p>
            <div className="space-y-2">
              <ContentTypeRow label="Image" desc="Single static image with caption. Generated via Flux-1.1-pro." />
              <ContentTypeRow label="Video" desc="AI generates a 10-second silent visual clip (RunwayML Gen-3 Turbo maximum). The script and duration field guide Claude on concept and pacing for the full video — a human editor assembles the final cut. No voiceover is added automatically." />
              <ContentTypeRow label="Carousel" desc="Multi-slide post. Each slide gets its own image — generation takes longer." />
              <ContentTypeRow label="Ad Copy" desc="Paid-ad text for Meta Ads or Google Ads — see the dedicated section below. No media is generated for this type." />
              <ContentTypeRow label="Blog Post" desc="Full SEO article under the Website platform — see the dedicated section below. No media is generated for this type." />
              <ContentTypeRow label="Landing Page" desc="Conversion-focused page copy under the Website platform — see the dedicated section below. No media is generated for this type." />
            </div>
            <Note text='Image and Carousel posts now also generate accessibility/SEO Alt Text alongside the image prompt — shown as an "Alt Text" field in the View → drawer, and used as the real alt attribute on the image itself. No extra step needed, it comes with the normal generation.' />
            <Note text='YouTube only offers the Video content type (its native format) and generates an extra "Title" field — the SEO-critical video title, shown above the description in the View → drawer. The Caption field doubles as the video description for this platform.' />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Ad Copy — Meta Ads &amp; Google Ads</p>
            <p className="text-gray-600 mb-3"><strong>Meta Ads</strong> and <strong>Google Ads</strong> are separate platform entries lower down the platform list — they only offer the <strong>Ad Copy</strong> toggle, since paid-ad text has no image/video/carousel format. This tool only generates the copy text; nothing is submitted to Meta Ads Manager or Google Ads automatically — the team copy-pastes the result in themselves.</p>
            <Step n={1} text='Toggle "Ad Copy" under Meta Ads and/or Google Ads. Each one you select adds a Landing Page URL field to the selected-platforms list below — enter the page the ad should point to.' />
            <Step n={2} text='Set "Ad variants" (the same − / + control used for post counts elsewhere). For Meta, each variant is one complete ad (primary text, headline, description, call-to-action). For Google, each variant is one complete Responsive Search Ad — a pool of headlines and descriptions Google itself mixes and matches, not separate ads.' />
            <Step n={3} text="Generate as usual. Open a generated ad with View → to review it." />
            <div className="mt-3">
              <p className="font-medium text-gray-800 mb-1">Policy Check panel</p>
              <p className="text-gray-600 mb-2">Every generated ad shows a Policy Check panel at the top of the View → drawer, checked automatically against Meta and Google&apos;s actual advertising policies:</p>
              <div className="space-y-2">
                <StatusRow label="Will likely be rejected" color="bg-red-100 text-red-700" desc="A Google hard limit was exceeded (e.g. a description over 90 characters) — Google's own ad builder will not accept this text as written." />
                <StatusRow label="Amber warning" color="bg-amber-100 text-amber-700" desc="A Meta soft/recommended limit was exceeded, or the copy may run into Meta's Personal Attributes policy (implying the reader has a specific health, financial, or other protected attribute) — worth a second look, not a guaranteed rejection." />
              </div>
              <Note text="Policy Check is always advisory — it never blocks saving or silently edits the AI's draft. The team makes the final call, exactly like every other AI-assisted draft in this tool." />
            </div>
            <div className="mt-3">
              <p className="font-medium text-gray-800 mb-1">A/B testing angles</p>
              <p className="text-gray-600 mb-2">When you set more than one ad variant, each one is now written to test a specific, labeled psychological angle — shown as a coloured badge at the top of the ad (e.g. <em>Urgency / Scarcity</em>, <em>Social Proof</em>). The angles rotate automatically: Direct Offer, Urgency/Scarcity, Social Proof, Curiosity Gap, Benefit-Led, Problem-Agitate-Solve. This turns &ldquo;3 variants&rdquo; into a real, labeled A/B test set instead of just differently-worded copy — you can track which angle actually performs best once the ads are live.</p>
              <Note text="Urgency/Scarcity never invents a fake deadline, and Social Proof never invents a specific stat or client count — both angles are written from only what the brief actually supports." />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Blog Post &amp; Landing Page — Website Content</p>
            <p className="text-gray-600 mb-3">The <strong>Website</strong> platform entry (lower down the platform list, alongside Meta Ads and Google Ads) offers two content types for long-form, SEO-oriented writing that lives on the client&apos;s own site rather than social media: <strong>Blog Post</strong> (a full article) and <strong>Landing Page</strong> (conversion-focused page copy — hero headline/subheadline, benefit sections, a closing call to action).</p>
            <Step n={1} text='Toggle "Blog Post" and/or "Landing Page" under Website. Each one you select adds a Target Keyword field to the selected-platforms list below — the SEO keyword this piece should be written around.' />
            <Step n={2} text="Generate as usual. The result includes a Title, Meta Title, Meta Description, URL Slug, Excerpt, and the full Body in Markdown." />
            <Note text='Landing Page copy never invents a fake customer testimonial, review, or statistic for its social-proof section — it leaves an obvious bracketed placeholder like "[Insert client testimonial here]" for the team to fill in with something real.' />
            <div className="mt-3">
              <p className="font-medium text-gray-800 mb-1">Humanize &amp; Check Originality</p>
              <p className="text-gray-600 mb-2">Inside the View → drawer for a Blog Post or Landing Page, click <strong>✨ Humanize &amp; Check Originality</strong> to rewrite the body so it reads less like AI-generated text, and spot-check it against a live web search for close or near-verbatim matches elsewhere online. It shows an <strong>Originality Score</strong> (0–100, higher is better) and, if anything close was found, the matching excerpt and its source URL.</p>
              <Note text="This overwrites the Body field with the rewritten version — review it before approving. The score and flags are advisory, a best-effort spot-check, not a guaranteed plagiarism-detector replacement." />
            </div>
            <div className="mt-3">
              <p className="font-medium text-gray-800 mb-1">SEO Meta-Pack</p>
              <p className="text-gray-600">Also inside the View → drawer, the <strong>SEO Meta-Pack</strong> section shows a ready-to-copy Schema.org JSON-LD <code className="bg-gray-100 px-1 rounded text-xs">&lt;script&gt;</code> tag — <em>Article</em> schema for a Blog Post, <em>Service</em> schema for a Landing Page — for the developer to paste into the page&apos;s <code className="bg-gray-100 px-1 rounded text-xs">&lt;head&gt;</code> for rich Google search results. It&apos;s computed directly from the Title, Meta Description, and Slug fields, so it always matches what&apos;s on screen.</p>
            </div>
          </div>
        </SectionCard>

        {/* Generate */}
        <SectionCard id="generate" icon="Generate" title="Generating Content">
          <p>The <strong>Generate</strong> page is where AI creates the actual content from your briefs. Generation is intentionally split into two steps — text first, then media — so you can review and approve the copy before spending time on image or video generation.</p>
          <Step n={1} text="Go to Generate. Use the All / Incomplete filter to find platforms that still need content." />
          <Step n={2} text='Click the primary button on a platform row — this generates text-only posts (caption, copy, hashtags, script, etc.). No image or video is created yet. Each row shows an X/N badge tracking how many of the planned posts have been generated.' />
          <Step n={3} text='Review the text. When you are happy, click "Generate Media" on that row to kick off the image or video pipeline for all posts that are missing media.' />
          <Step n={4} text="If the text is not right, click the chevron (▾) next to the button and choose Regenerate All (replaces all posts + media) or Content only (replaces all text, keeps media decision open)." />
          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Button behaviour at a glance</p>
            <div className="space-y-2">
              <ContentTypeRow label="Generate N Posts" desc="No posts yet — generates all planned posts as text only." />
              <ContentTypeRow label="Generate N More" desc="Some posts exist but not all — generates the remaining posts as text only." />
              <ContentTypeRow label="Generate Media (N)" desc="All text posts exist but media is missing — starts the image or video pipeline for each post." />
              <ContentTypeRow label="Regenerate All" desc="Deletes all posts and regenerates them as text only." />
              <ContentTypeRow label="Content only" desc="Replaces all posts with fresh text; does not start media." />
              <ContentTypeRow label="Media only" desc="Re-runs the media pipeline for posts that are missing media, without changing text." />
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Generate All button (Brief detail page)</p>
            <p className="text-gray-600">The <strong>Generate All</strong> button on a brief generates text for every platform one at a time, respecting each platform&apos;s post count. The button shows live progress — <em>Generating post 3 of 12...</em> — and each post appears on screen as soon as it is ready. No media is started. Once you are happy with the text on a row, click its <strong>Generate Media</strong> button. To generate text and media together for all platforms at once, click the chevron next to the button and choose <strong>Generate All with Media</strong>.</p>
          </div>
          <Note text="Video generation (RunwayML) runs asynchronously and may take 1–3 minutes after you click Generate Media. The status updates automatically — no need to refresh. The AI clip is always 10 seconds; voiceover and final assembly are done outside this tool." />
          <Note text='Ad Copy (Meta Ads / Google Ads) skips the media step entirely — there is no image or video to generate, so once its text is generated the button simply offers "Regenerate All".' />
          <Tip text="If a media job fails (red indicator), use Media only from the dropdown to re-run only the media pipeline without re-generating text." />
          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Media status indicators</p>
            <div className="space-y-2">
              <StatusRow label="None" color="bg-gray-100 text-gray-600" desc='No media generated yet — "Generate Media" button will appear.' />
              <StatusRow label="Generating" color="bg-blue-100 text-blue-700" desc="Pipeline running — wait for it to complete." />
              <StatusRow label="Ready" color="bg-green-100 text-green-700" desc="Media available for preview and download." />
              <StatusRow label="Failed" color="bg-red-100 text-red-700" desc='Pipeline error — use "Media only" from the dropdown.' />
            </div>
          </div>
        </SectionCard>

        {/* Approvals */}
        <SectionCard id="approvals" icon="Approvals" title="Approvals &amp; Revisions">
          <p>The <strong>Approvals</strong> page shows all content awaiting a decision. Clients review via their own portal; you action their feedback here. The page loads <strong>20 posts at a time</strong> — use the Prev / Next buttons at the top and bottom to move between pages. Changing the status filter resets to page 1.</p>

          <div className="border-t border-gray-100 pt-3">
            <p className="font-medium text-gray-900 mb-2">Content statuses</p>
            <div className="space-y-2">
              <StatusRow label="Pending" color="bg-gray-100 text-gray-700" desc="Awaiting client review." />
              <StatusRow label="Approved" color="bg-green-100 text-green-700" desc="Client has approved — ready to schedule." />
              <StatusRow label="Revision Requested" color="bg-yellow-100 text-yellow-700" desc="Client left a comment requesting changes." />
              <StatusRow label="Rejected" color="bg-red-100 text-red-700" desc="Client rejected — regenerate or discuss." />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Bulk approvals</p>
            <p className="text-gray-600 mb-2">You can approve or reject multiple posts at once without opening each one individually. A <strong>Select all pending</strong> checkbox appears above the content list whenever there are PENDING or REVISION_REQUESTED items on the current page.</p>
            <Step n={1} text='Tick the "Select all pending" checkbox to select every eligible item on the page, or tick individual checkboxes on each card.' />
            <Step n={2} text='A blue action bar appears showing how many items are selected. Click "✓ Approve N" or "✕ Reject N" to update all selected items at once.' />
            <Step n={3} text="The page refreshes automatically and shows the updated statuses. Use the filter tabs to switch between views." />
            <Tip text="Only PENDING and REVISION_REQUESTED posts can be bulk-selected. Already APPROVED or REJECTED posts do not show a checkbox." />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Actioning individual revisions</p>
            <Step n={1} text="When a client requests a revision, read their comment in the Revision Thread — either on this page or by clicking View → on the post from the brief detail page." />
            <Step n={2} text="Go to Generate, find the content, and regenerate (or use Regenerate with Direction from the View → panel for a targeted tweak)." />
            <Step n={3} text='Once updated, the status resets to "Pending" and the client can review again.' />
            <Tip text="You can approve, reject, or send content to the client directly from the View → panel on the brief detail page — no need to navigate to Approvals at all." />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Notification bell</p>
            <p className="text-gray-600 mb-2">A bell icon at the bottom of the sidebar shows a red badge whenever a client takes action in the portal — approving a post or requesting a revision. Click the bell to see the last 20 notifications with the client name, platform, and brief title. All notifications are marked as read automatically when you open the panel.</p>
            <div className="space-y-2">
              <ContentTypeRow label="✅ Approved" desc="A client approved a specific post — no action usually needed." />
              <ContentTypeRow label="✏️ Revision Requested" desc="A client left feedback on a post — check the Revision Thread and action it." />
            </div>
            <Note text="Notifications are routed to the team member assigned to that client. If no team member is assigned, all ADMIN users receive the notification." />
          </div>
        </SectionCard>

        {/* Reports */}
        <SectionCard id="reports" icon="Reports" title="Approval Report">
          <p>The <strong>Reports</strong> page (sidebar → Reports) gives a management-level snapshot of your approval pipeline across all clients and platforms — at a glance, you can see where things stand without digging through the Approvals list.</p>
          <div className="space-y-2 mt-1">
            <ContentTypeRow label="Stat Cards" desc="Four summary figures at the top: total content items, approval rate %, items currently awaiting action (pending + revision), and average days from generation to approval." />
            <ContentTypeRow label="Status Bar" desc="A single proportional bar showing the split between Approved (green), Pending (yellow), Revision Requested (orange), and Rejected (red) across all content." />
            <ContentTypeRow label="By Client" desc="A table with one row per client showing their totals for each status and their individual approval rate. Sorted by total posts descending so your most active clients appear first." />
            <ContentTypeRow label="By Platform" desc="A stacked bar for each platform (Instagram, LinkedIn, etc.) with the same colour coding, plus total post count and approval rate badge." />
            <ContentTypeRow label="Oldest Awaiting Action" desc="A ranked list of up to 10 content items that have been stuck in Pending or Revision the longest. Days waiting are highlighted in orange (3+ days) or red (7+ days) so you can see at a glance which items need chasing. Links to the full Approvals page." />
          </div>
          <Tip text="Check Reports at the start of each week to quickly spot which clients have stalled approvals or low approval rates before they become problems." />
        </SectionCard>

        {/* Portal */}
        <SectionCard id="portal" icon="Portal" title="Client Portal">
          <p>Clients log in at <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">/portal</code> with their own credentials (CLIENT role). They see only their own content — no other client data is visible.</p>
          <Step n={1} text='Create a CLIENT-role user via Team then "New Member" and assign them to the correct client.' />
          <Step n={2} text="Share their login credentials. They visit the site and log in — they land directly on the portal." />
          <Step n={3} text="In the portal, clients can Approve, Request Revision (with a comment), or Reject each content item." />

          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Progress summary by brief</p>
            <p className="text-gray-600 mb-2">Content in the portal is grouped by brief. Each brief has a <strong>progress card</strong> at the top showing:</p>
            <div className="space-y-2">
              <ContentTypeRow label="% Approved" desc="Large percentage figure — how many of the brief's posts the client has approved so far." />
              <ContentTypeRow label="Progress bar" desc="A green bar that fills as posts are approved — easy visual confirmation of where things stand." />
              <ContentTypeRow label="Status breakdown" desc="Pill badges showing how many posts are awaiting review, approved, or have revisions sent." />
            </div>
            <p className="text-gray-600 mt-3">The individual post cards appear below each brief header, indented with a left border so the grouping is clear.</p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Platform preview mockups</p>
            <p className="text-gray-600 mb-2">Instead of showing raw text and media, each post in the portal is displayed inside a <strong>platform-styled mockup</strong> — a realistic frame that resembles how the post will look on the actual platform. This helps clients visualise the final result and reduces back-and-forth over formatting questions.</p>
            <div className="space-y-2">
              <ContentTypeRow label="Instagram" desc="Square or portrait frame with gradient avatar ring, action bar (heart, comment, send, bookmark), caption with @handle prefix, and hashtags in blue." />
              <ContentTypeRow label="Facebook" desc="Page post layout with blue-f avatar, post text above media, reaction counts, and Like / Comment / Share bar." />
              <ContentTypeRow label="LinkedIn" desc="Company post with letter avatar on blue, company name and Follow label, post text and hashtags above media, 4-button action row." />
              <ContentTypeRow label="Twitter / X" desc="Tweet layout with verified badge, tweet text, rounded media frame, timestamp and view count, and icon action row." />
              <ContentTypeRow label="TikTok" desc="Full-bleed dark frame with gradient overlay, right-side action buttons (heart, comment, share, music), and caption overlay at the bottom." />
              <ContentTypeRow label="Google Business" desc="Google Business Profile layout with the Google G logo, post text, media, and the Call to Action rendered as a real button." />
              <ContentTypeRow label="YouTube" desc="Video card layout with 16:9 thumbnail, channel avatar, a bold two-line video title, and a views/date placeholder row — description shown below the card." />
            </div>
            <p className="text-gray-600 mt-3">Caption and hashtags appear inside the mockup. Supporting fields such as Hook, Script, and On-screen Text are shown below the mockup for reference.</p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Revision comment thread</p>
            <p className="text-gray-600 mb-2">When a client requests a revision, the conversation doesn&apos;t have to end there. Both sides can continue adding messages to the thread:</p>
            <div className="space-y-2">
              <ContentTypeRow label="Client comments" desc="Shown in orange. When the client clicks 'Request Revision', their comment starts the thread. They can add more comments to a post already in revision — useful for clarifying feedback or confirming they've seen a team reply." />
              <ContentTypeRow label="Team replies" desc="Shown in blue. From the View → panel on the brief detail page, the team reply box appears below the thread. Send a reply to let the client know what you changed or ask a clarifying question — without changing the post status." />
            </div>
            <Tip text="Use the thread to avoid email chains. All revision history is stored against the post and visible to any team member who opens it." />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Downloading approved media</p>
            <p className="text-gray-600">Once a post is <strong>Approved</strong>, download buttons appear below the content for any media that was generated — <em>Download Image</em>, <em>Download Video</em>, and <em>Download Thumbnail</em> (where applicable). Clicking a button downloads the file directly from Cloudinary with a descriptive filename. Clients can use these to save content for manual scheduling or handoff to a scheduler.</p>
          </div>

          <Note text="Clients cannot see the Generate page, Briefs, other Clients, internal notes, or any admin/team functionality." />
        </SectionCard>

        {/* Calendar */}
        <SectionCard id="calendar" icon="Calendar" title="Calendar">
          <p>The <strong>Calendar</strong> gives a month-view of all scheduled content across clients and platforms.</p>
          <Step n={1} text="Use the month navigation arrows to move between months." />
          <Step n={2} text="Each day that has content shows colour-coded chips — click any chip to open the detail view." />
          <Step n={3} text='To set or change a post&apos;s scheduled date, open it from Generate or Approvals and edit the "Scheduled Date" field.' />
          <Note text="If no scheduled date is set on a content item, it defaults to the first day of its brief's month on the calendar." />
          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-900 mb-2">Event badges</p>
            <p className="text-gray-600 mb-2">The calendar highlights important dates with small coloured badges above the content chips so you can plan posts around them.</p>
            <div className="space-y-2">
              <StatusRow label="National" color="bg-amber-100 text-amber-700" desc="Indian national holidays — Republic Day, Independence Day, Gandhi Jayanti, etc." />
              <StatusRow label="Festival" color="bg-violet-100 text-violet-700" desc="Indian festivals — Diwali, Holi, Eid, Christmas, and more." />
              <StatusRow label="Global" color="bg-teal-100 text-teal-700" desc="Global marketing days — World Environment Day, International Women&apos;s Day, etc." />
            </div>
          </div>
        </SectionCard>

        {/* Export */}
        <SectionCard id="export" icon="Export" title="Export">
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
          <Note text="When you remove a team member, any briefs or revision notes they created are automatically reassigned to your admin account so no data is lost." />
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
