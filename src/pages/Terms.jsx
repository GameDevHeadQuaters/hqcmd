import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconAlertTriangle } from '@tabler/icons-react'
import Footer from '../components/Footer'

const ACCENT = '#534AB7'

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

export default function Terms() {
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
          <img src="/logos/logo-cmd.png" alt="HQCMD" style={{ height: '28px', width: 'auto', cursor: 'pointer' }} onClick={() => navigate('/')} onError={e => { e.target.style.display = 'none' }} />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10 flex-1 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Terms of Service</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Last updated: May 2025</p>
        </div>

        {/* Draft disclaimer */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg mb-8" style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <IconAlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--status-warning)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--status-warning)' }}>Draft document.</span>{' '}
            This is a draft document and has not been reviewed by a qualified solicitor. Please seek independent legal advice before relying on these terms.
          </p>
        </div>

        <Section n="1" title="Introduction and Acceptance">
          <p>Welcome to HQCMD ("we", "us", "our"), a project management platform designed for indie game developers and small studios. By accessing or using HQCMD (the "Service") you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use the Service.</p>
          <p>These Terms constitute a legally binding agreement between you and HQCMD. We may update these Terms from time to time. Continued use of the Service after changes are posted constitutes your acceptance of the updated Terms.</p>
        </Section>

        <Section n="2" title="Description of Service">
          <p>HQCMD is an all-in-one project management workstation for indie game developers. The Service provides tools for project planning, milestone tracking, team management, budget tracking, team communications, and collaboration agreements.</p>
          <p>The Service is currently in beta and is provided on an "as is" and "as available" basis. Features, functionality, and availability may change without notice during the beta period.</p>
          <p>HQCMD is intended for professional and semi-professional use in the context of game development projects. You must be at least 18 years old to use the Service.</p>
        </Section>

        <Section n="3" title="Account Registration and Beta Access">
          <p>During the beta period, access to HQCMD requires either an approved invite code or acceptance of a beta access request. We reserve the right to approve or decline beta access requests at our sole discretion.</p>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at hello@gamedevlocal.com if you become aware of any unauthorised use of your account.</p>
          <p>You must provide accurate and complete information when creating an account. You may not create accounts on behalf of others without their consent, or use a false identity.</p>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms or that are inactive for extended periods.</p>
        </Section>

        <Section n="4" title="User Responsibilities and Acceptable Use">
          <p>You agree to use the Service only for lawful purposes and in a manner that does not infringe the rights of any third party. You must not:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Post or transmit content that is unlawful, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable</li>
            <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity</li>
            <li>Attempt to gain unauthorised access to any part of the Service or its related systems</li>
            <li>Introduce viruses, malware, or any other harmful code</li>
            <li>Use the Service to spam, phish, or engage in any form of unsolicited communications</li>
            <li>Scrape, crawl, or systematically extract data from the Service without our prior written consent</li>
            <li>Use the Service in any way that could damage, disable, overburden, or impair our infrastructure</li>
            <li>Use the Service for any commercial purpose other than managing your own game development projects</li>
          </ul>
          <p>We reserve the right to remove any content that violates these Terms and to suspend or terminate accounts responsible for such violations.</p>
        </Section>

        <Section n="5" title="Intellectual Property">
          <p><strong style={{ color: 'var(--text-primary)' }}>Your content:</strong> You retain full ownership of all content, data, and intellectual property you create, upload, or store using the Service ("User Content"). By using the Service, you grant HQCMD a limited, non-exclusive, royalty-free licence to host, store, and display your User Content solely for the purposes of providing the Service to you.</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>Our content:</strong> All software, design, text, and other materials comprising the Service (excluding User Content) are the intellectual property of HQCMD or its licensors. You may not copy, modify, distribute, or create derivative works based on our content without our prior written consent.</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>Team agreements:</strong> Any agreements created between users via the Service's agreement tools are the intellectual property of the parties to that agreement. HQCMD claims no ownership over the content of user-generated agreements.</p>
        </Section>

        <Section n="6" title="Agreement Templates — Important Disclaimer">
          <p>HQCMD provides agreement templates as a convenience to users. <strong style={{ color: 'var(--text-primary)' }}>These templates are not legal advice and HQCMD makes no representation that they are legally binding, enforceable, or appropriate for any particular purpose or jurisdiction.</strong></p>
          <p>Any agreements you enter into with other users via the Service are solely between you and the other party. HQCMD is not a party to any such agreement and accepts no liability for the performance, enforcement, or breach of any user-generated agreement.</p>
          <p>We strongly recommend that you seek independent legal advice before entering into any legally significant agreement, particularly those involving revenue sharing, intellectual property assignment, or employment-like arrangements.</p>
        </Section>

        <Section n="7" title="Third Party Services">
          <p>The Service may contain links to, or integrations with, third-party websites or services. We have no control over, and accept no responsibility for, the content, privacy policies, or practices of any third-party services.</p>
          <p>Your use of any third-party services is at your own risk and subject to the terms and conditions of those services.</p>
        </Section>

        <Section n="8" title="Limitation of Liability">
          <p>To the fullest extent permitted by applicable law, HQCMD shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, goodwill, or other intangible losses, arising out of or in connection with your use of the Service.</p>
          <p>Our total aggregate liability to you for all claims arising out of or relating to these Terms or the Service shall not exceed the greater of (a) the amount you paid to HQCMD in the 12 months preceding the claim, or (b) £100.</p>
          <p>Nothing in these Terms limits our liability for death or personal injury caused by our negligence, fraud, or fraudulent misrepresentation, or any other liability that cannot be excluded or limited under applicable law.</p>
        </Section>

        <Section n="9" title="Termination">
          <p>You may terminate your account at any time by contacting us at hello@gamedevlocal.com. Upon termination, your right to use the Service will cease immediately.</p>
          <p>We may suspend or terminate your account at any time if we believe you have violated these Terms, if required by law, or if continued provision of the Service to you is no longer commercially viable.</p>
          <p>Upon termination, we may delete your User Content in accordance with our Privacy Policy. We will make reasonable efforts to notify you before deleting any data where practicable.</p>
        </Section>

        <Section n="10" title="Changes to Terms">
          <p>We may modify these Terms at any time. We will notify you of material changes by posting a notice on the Service or by sending an email to the address associated with your account. Your continued use of the Service after the effective date of any changes constitutes your acceptance of the revised Terms.</p>
          <p>If you do not agree to any revised Terms, you must stop using the Service and may terminate your account.</p>
        </Section>

        <Section n="11" title="Governing Law">
          <p>These Terms are governed by and construed in accordance with the laws of England and Wales. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
        </Section>

        <Section n="12" title="Contact">
          <p>If you have any questions about these Terms of Service, please contact us at:</p>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            HQCMD<br />
            Email: hello@gamedevlocal.com
          </p>
        </Section>
      </div>

      <Footer />
    </div>
  )
}
