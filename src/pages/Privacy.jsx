import { useNavigate } from 'react-router-dom'
import { IconCommand, IconArrowLeft, IconAlertTriangle } from '@tabler/icons-react'
import Footer from '../components/Footer'

function Section({ n, title, children }) {
  return (
    <section className="mb-8">
      <h2 className="font-semibold text-base mb-3" style={{ color: 'var(--text-primary)' }}>
        {n}. {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </section>
  )
}

export default function Privacy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav className="hq-nav px-6 h-14 flex items-center justify-between sticky top-0 z-10" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
            <IconArrowLeft size={18} />
          </button>
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #534AB7, #ed2793)' }}>
              <IconCommand size={13} color="white" />
            </div>
            <span className="font-bold text-sm" style={{ background: 'linear-gradient(90deg, #534AB7, #805da8, #ed2793)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>HQCMD</span>
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10 flex-1 w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Privacy Policy</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Last updated: May 2025</p>
        </div>

        {/* Draft disclaimer */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg mb-8" style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <IconAlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--status-warning)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--status-warning)' }}>Draft document.</span>{' '}
            This is a draft privacy policy and has not been reviewed by a qualified solicitor or data protection specialist. Please seek independent advice before relying on this document.
          </p>
        </div>

        <Section n="1" title="Who We Are">
          <p>HQCMD ("we", "us", "our") is a project management platform for indie game developers. We are the data controller for personal data processed through this Service.</p>
          <p>If you have any questions or concerns about how we handle your personal data, please contact us at <strong style={{ color: 'var(--text-primary)' }}>hello@gamedevlocal.com</strong>.</p>
        </Section>

        <Section n="2" title="Data We Collect">
          <p>We collect the following categories of personal data when you use HQCMD:</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>Account data:</strong> When you register, we collect your full name and email address. This data is stored locally in your browser's localStorage and is not transmitted to any external server.</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>Project data:</strong> We collect and store content you create within the Service, including project details, milestones, team compositions, budget information, to-do items, links, and team chat messages.</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>Agreement data:</strong> If you use the agreement features, we store the agreement content, signatory information, and signing status.</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>Beta access data:</strong> If you submit a beta access request, we collect your name, email, and the reason for your request.</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>Contact data:</strong> If you use the Contact Us form, we collect your name, email, and message.</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>Usage data:</strong> We may collect information about how you use the Service, including features accessed and actions taken, to improve the product.</p>
        </Section>

        <Section n="3" title="How We Use Your Data">
          <p>We use your personal data for the following purposes:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong style={{ color: 'var(--text-primary)' }}>Providing the Service:</strong> To enable you to log in, manage projects, collaborate with teammates, and use all platform features</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Communications:</strong> To respond to your enquiries, send beta access decisions, and notify you of important changes to the Service or these policies</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Security and fraud prevention:</strong> To detect and prevent abuse, unauthorised access, and other harmful activity</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Product improvement:</strong> To understand how users interact with the Service and to develop new features</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Legal compliance:</strong> To comply with applicable laws, regulations, and legal processes</li>
          </ul>
          <p>Our lawful basis for processing your personal data is primarily <strong style={{ color: 'var(--text-primary)' }}>contractual necessity</strong> (to provide the Service you have requested) and our <strong style={{ color: 'var(--text-primary)' }}>legitimate interests</strong> in operating and improving the Service. Where we rely on legitimate interests, we balance these against your rights and interests.</p>
        </Section>

        <Section n="4" title="Data Storage">
          <p><strong style={{ color: 'var(--text-primary)' }}>Important:</strong> HQCMD is currently in beta and operates as a client-side application. Your personal and project data is stored in your browser's <strong style={{ color: 'var(--text-primary)' }}>localStorage</strong> on your own device. We do not currently operate a backend server or transmit your data to any remote server operated by HQCMD.</p>
          <p>This means your data exists on the specific device and browser in which you created it. If you clear your browser data, use a different browser, or use a different device, your data will not be accessible unless you have exported it.</p>
          <p>As the Service develops, we intend to introduce server-side storage to enable multi-device access and data backups. We will update this Privacy Policy and notify users before making any such changes.</p>
        </Section>

        <Section n="5" title="Data Retention">
          <p>As your data is stored in your browser's localStorage, it persists until you clear your browser data or uninstall your browser. We encourage you to export any important data if you intend to clear your browser storage.</p>
          <p>If you request account deletion, we will take reasonable steps to remove any data associated with your account from our systems, to the extent any data is held server-side.</p>
        </Section>

        <Section n="6" title="Your Rights Under UK GDPR">
          <p>If you are based in the United Kingdom, you have the following rights regarding your personal data under the UK GDPR and Data Protection Act 2018:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong style={{ color: 'var(--text-primary)' }}>Right of access:</strong> You have the right to request a copy of the personal data we hold about you</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Right to rectification:</strong> You have the right to request correction of inaccurate or incomplete personal data</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Right to erasure:</strong> You have the right to request deletion of your personal data in certain circumstances</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Right to data portability:</strong> You have the right to receive your personal data in a structured, machine-readable format</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Right to restrict processing:</strong> You have the right to request that we limit how we use your personal data in certain circumstances</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Right to object:</strong> You have the right to object to processing based on legitimate interests</li>
          </ul>
          <p>To exercise any of these rights, please contact us at <strong style={{ color: 'var(--text-primary)' }}>hello@gamedevlocal.com</strong>. We will respond to your request within one month in accordance with UK GDPR requirements. We may ask you to verify your identity before processing your request.</p>
          <p>If you are not satisfied with our response, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk.</p>
        </Section>

        <Section n="7" title="Cookies and Local Storage">
          <p>HQCMD does not currently use cookies. We use browser localStorage to store your account data and application state on your device. This is essential for the Service to function and cannot be disabled without breaking core functionality.</p>
          <p>localStorage is not accessible across different browsers or devices and is not used to track you across other websites. We do not use any third-party tracking, analytics, or advertising technologies.</p>
        </Section>

        <Section n="8" title="Third Parties">
          <p>We do not currently share your personal data with any third parties for marketing or commercial purposes.</p>
          <p>We may disclose your personal data to third parties in the following limited circumstances:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Where required by law, regulation, or legal process</li>
            <li>To protect the rights, property, or safety of HQCMD, our users, or the public</li>
            <li>In connection with any merger, acquisition, or sale of all or a portion of our assets (with appropriate protections for your data)</li>
          </ul>
        </Section>

        <Section n="9" title="Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting a notice on the Service or by sending an email to the address associated with your account. We encourage you to review this policy periodically.</p>
          <p>Your continued use of the Service after any changes to this policy constitutes your acceptance of the updated policy.</p>
        </Section>

        <Section n="10" title="Contact and Data Requests">
          <p>For any privacy-related enquiries, to exercise your data rights, or for urgent matters under UK GDPR, please contact us directly:</p>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            HQCMD Data Controller<br />
            Email: hello@gamedevlocal.com
          </p>
          <p>We aim to respond to all data requests within 30 days.</p>
        </Section>
      </div>

      <Footer />
    </div>
  )
}
