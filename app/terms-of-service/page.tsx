export const metadata = {
  title: 'Terms of Service — Social Media Dost',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
          <p className="text-gray-500 text-sm mt-1">Social Media Dost — operated by Niranjan Enterprises Digital Solutions</p>
        </div>

        <Section title="Scope">
          <p>Social Media Dost (socialmediadost.com) is an internal tool operated by Niranjan Enterprises Digital Solutions to produce and manage social media and advertising content for our clients. Access is by invitation only — as a staff account, or as a client contact given access to review and approve content prepared for their organization.</p>
        </Section>

        <Section title="Accounts">
          <p>You are responsible for keeping your login credentials confidential and for activity that occurs under your account. Notify us immediately if you believe your account has been accessed without authorization.</p>
        </Section>

        <Section title="AI-generated content">
          <p>Captions, images, video, and ad copy produced through this platform are generated with the assistance of third-party AI services (including Anthropic&apos;s Claude, and image/video providers Cloudinary, Replicate, and Runway) based on briefs and brand information supplied by our staff. All AI-generated material is reviewed by our team, and by the relevant client where a client-approval step applies, before it is published or used in any live campaign — nothing generated through this platform is published automatically without that review.</p>
        </Section>

        <Section title="Client review and approval">
          <p>Where a client contact is given portal access, their approval, rejection, or comments on content are recorded and used by our team to finalize that content. Approving content through the portal indicates the client&apos;s sign-off to proceed with that specific piece of content; it does not itself constitute payment or a separate contractual commitment, which are governed by the client&apos;s underlying agreement with Niranjan Enterprises Digital Solutions.</p>
        </Section>

        <Section title="Advertising platform integrations">
          <p>Where enabled, the platform can push an approved Meta ad&apos;s text and call-to-action into our own Meta advertising account&apos;s creative library. This creates a reusable creative asset only — it never creates or modifies a campaign, budget, or audience targeting, and it is limited to our own advertising account. Launching any resulting campaign remains a manual, separate action taken by our staff directly in the relevant ad platform.</p>
        </Section>

        <Section title="Acceptable use">
          <p>This platform is provided for producing legitimate marketing content for our clients. It must not be used to generate content that is unlawful, infringing, or in violation of the advertising policies of the platform it is ultimately published to (Meta, Google, Instagram, and others).</p>
        </Section>

        <Section title="Availability">
          <p>We aim to keep this platform available and reliable, but it is provided on an as-is basis without guarantee of uninterrupted availability. We are not liable for indirect or consequential loss arising from downtime or from AI-generated content that is published without adequate review.</p>
        </Section>

        <Section title="Changes to these terms">
          <p>We may update these terms from time to time as the platform evolves. Continued use of the platform after an update constitutes acceptance of the revised terms.</p>
        </Section>

        <Section title="Contact us">
          <p>Niranjan Enterprises Digital Solutions<br />
          2nd Floor, 657, Rangrekha Apartment, Near Kunjir Talim, Sadashiv Peth, Pune 411030<br />
          Email: <a href="mailto:contact@niranjanenterprises.com" className="text-blue-600 hover:underline">contact@niranjanenterprises.com</a><br />
          Phone: +91 92205 18202</p>
        </Section>

        <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">Last updated: August 2026.</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed space-y-2">{children}</div>
    </div>
  )
}
