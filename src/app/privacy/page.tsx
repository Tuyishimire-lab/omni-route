import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Shield, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | CiteRoute',
  description: 'Learn how CiteRoute collects, uses, and protects your personal and operational data in accordance with international privacy laws.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-12 max-w-4xl mx-auto py-4">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#878787] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.20)] text-xs font-semibold text-[#05AD98]">
          <Shield className="w-3.5 h-3.5" />
          <span>Legal Documentation</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-[#878787]">
          Last Updated: September 10, 2026
        </p>
      </div>

      {/* Main Content */}
      <div className="glass-panel rounded-2xl p-6 sm:p-10 border border-[rgba(187,191,191,0.10)] space-y-10 text-sm leading-relaxed text-[#BBBFBF]">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">1. Overview and Data Controller</h2>
          <p>
            CiteRoute (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides a Generative Engine Optimization (GEO) platform, AI crawler telemetry analytics, and agent manifest tools accessible via citeroute.com. We are committed to protecting your privacy and handling your personal data in an open, transparent, and legally compliant manner.
          </p>
          <p>
            For the purposes of applicable data protection legislation (including the General Data Protection Regulation (EU) 2016/679, the UK Data Protection Act, the California Consumer Privacy Act, and Rwandan Law No. 058/2021 relating to the protection of personal data and privacy), the Data Controller is:
          </p>
          <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs text-[#878787] space-y-1">
            <p className="text-white font-semibold">CiteRoute Operations</p>
            <p>Location: Kigali, Rwanda</p>
            <p>Contact Email: tuyishime1angel@gmail.com</p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">2. Information We Collect</h2>
          <p>
            We collect information directly from you when you register an account, interact with our services, or configure monitoring for your domains.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-white">Account Information:</strong> When you register an account, we collect your name, email address, hashed passwords, and profile details. If you authenticate via third-party OAuth providers (such as GitHub or Google), we receive your verified email address and public profile identifier.
            </li>
            <li>
              <strong className="text-white">Domain Audit and Manifest Data:</strong> When you run a GEO audit or generate an agent.json manifest, we record the queried public domain name, technical metadata, structured schema, and the calculated scores.
            </li>
            <li>
              <strong className="text-white">Telemetry and Tracking Tag Data:</strong> If you install our lightweight tracking script on your verified websites, our servers receive telemetry signals. This includes the visiting user-agent string (to identify search crawlers and AI bots), request timestamps, referrer headers, and requested URLs. We do not use fingerprinting techniques, and we do not track individuals across third-party websites.
            </li>
            <li>
              <strong className="text-white">API Usage Data:</strong> If you use CiteRoute developer API keys, we record request volume, endpoint paths, response statuses, and rate limit metrics to protect platform stability.
            </li>
            <li>
              <strong className="text-white">Technical and Log Data:</strong> We automatically log standard server logs, including your internet protocol (IP) address, browser type, operating system, device characteristics, and timestamped activity on our web application.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">3. Payment Information and Merchant of Record</h2>
          <p>
            Paid subscriptions (including Pro and Agency plans) are processed through our trusted payment infrastructure partner, <strong className="text-white">Lemon Squeezy</strong>, acting as our Merchant of Record.
          </p>
          <p>
            When you purchase a subscription or initiate a checkout transaction:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              All payment transactions, credit card data, bank information, billing addresses, and tax collection (VAT, GST, sales tax) are managed directly by Lemon Squeezy in full compliance with PCI-DSS standards.
            </li>
            <li>
              CiteRoute does not capture, store, or have direct access to your credit card numbers or bank credentials.
            </li>
            <li>
              We retain only anonymized customer identifiers, subscription IDs, subscription status (for example: active, cancelled, past due), and billing renewal dates transmitted to us by Lemon Squeezy via secure webhooks.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">4. Legal Bases for Processing (GDPR / Global Standards)</h2>
          <p>
            We process your personal data under the following recognized legal bases:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-white">Performance of a Contract:</strong> Processing necessary to provide the services you requested, administer your account, and manage your subscription entitlements.
            </li>
            <li>
              <strong className="text-white">Legitimate Interests:</strong> Processing necessary to secure our platform against fraud, debug technical errors, improve algorithm accuracy, analyze aggregate platform usage, and prevent abuse.
            </li>
            <li>
              <strong className="text-white">Compliance with Legal Obligations:</strong> Processing necessary to meet statutory financial, tax, corporate reporting, and lawful audit requirements.
            </li>
            <li>
              <strong className="text-white">Consent:</strong> Where you have provided specific and informed consent, such as opting into marketing emails or optional notifications. You may revoke consent at any time.
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">5. Sub-Processors and Data Sharing</h2>
          <p>
            We never sell, rent, or trade your personal data. We disclose information only to service providers (sub-processors) essential to delivering our services:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-[rgba(255,255,255,0.06)] rounded-lg overflow-hidden">
              <thead className="bg-[rgba(255,255,255,0.04)] text-white">
                <tr>
                  <th className="p-3">Partner / Sub-Processor</th>
                  <th className="p-3">Role / Purpose</th>
                  <th className="p-3">Data Handled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
                <tr>
                  <td className="p-3 font-semibold text-white">Lemon Squeezy</td>
                  <td className="p-3">Merchant of Record, checkout, invoicing, tax</td>
                  <td className="p-3">Payment details, billing address, tax info</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">Vercel Inc.</td>
                  <td className="p-3">Cloud hosting and serverless execution</td>
                  <td className="p-3">Server access logs, incoming IP addresses</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">Turso (ChiselStrike)</td>
                  <td className="p-3">Managed database infrastructure</td>
                  <td className="p-3">Encrypted user records, scan results, telemetry</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">Resend</td>
                  <td className="p-3">Transactional email delivery</td>
                  <td className="p-3">Email address, system alert payloads</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">6. Cookies and Local Storage</h2>
          <p>
            We adhere to a strict data minimization philosophy:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-white">Strictly Necessary Cookies:</strong> We use an encrypted HTTP-only session cookie to maintain your authenticated login state securely.
            </li>
            <li>
              <strong className="text-white">Functional Local Storage:</strong> We use browser local storage to save your UI preferences (such as dark mode preferences and active dashboard filters).
            </li>
            <li>
              <strong className="text-white">Third-Party Tracking Cookies:</strong> We do not deploy invasive third-party cross-site advertising trackers or sell browsing profiles to data brokers.
            </li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">7. Your Privacy Rights</h2>
          <p>
            Depending on your jurisdiction, you hold specific statutory rights regarding your personal information:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-white">Right of Access:</strong> You may request a confirmation of whether we process your data, alongside a copy of that data.
            </li>
            <li>
              <strong className="text-white">Right to Rectification:</strong> You may request the immediate correction of inaccurate or incomplete personal information.
            </li>
            <li>
              <strong className="text-white">Right to Erasure (Right to Be Forgotten):</strong> You may request that we permanently delete your account and associated personal data.
            </li>
            <li>
              <strong className="text-white">Right to Data Portability:</strong> You may request an export of your account data in a structured, commonly used, machine-readable format.
            </li>
            <li>
              <strong className="text-white">Right to Object:</strong> You may object to any data processing conducted on the grounds of legitimate interest.
            </li>
          </ul>
          <p>
            To exercise any of these rights, please email us directly at <span className="text-white font-mono">tuyishime1angel@gmail.com</span>. We respond to all verified requests within thirty (30) days without cost.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">8. Data Retention and Security</h2>
          <p>
            We implement robust administrative, technical, and physical security measures to safeguard your personal data. All data transfers across public networks use Transport Layer Security (TLS 1.3) encryption. Passwords are salted and hashed using industry-standard bcrypt algorithms.
          </p>
          <p>
            We retain account data for as long as your account remains active. Telemetry data and scan logs are retained in aggregate form to calculate historical benchmark scores. If you delete your account, your personal identifying records are purged from active production databases within thirty (30) days.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">9. International Data Transfers</h2>
          <p>
            Because our platform operates globally using cloud infrastructure, your information may be transferred to and processed in servers located outside your home country. We ensure that all cross-border data transfers comply with statutory requirements, incorporating standard contractual clauses and rigorous vendor vetting.
          </p>
        </section>

        {/* Section 10 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">10. Updates to This Policy</h2>
          <p>
            We may revise this Privacy Policy periodically to reflect technological advances, product developments, or legal updates. Any material changes will be communicated via notice on our website or through email notification to your registered address prior to becoming effective.
          </p>
        </section>

        {/* Section 11 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">11. Contact Information</h2>
          <p>
            For questions, concerns, or requests regarding this Privacy Policy or our data handling practices, please contact us at:
          </p>
          <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs text-[#878787] space-y-1">
            <p className="text-white font-semibold">CiteRoute Legal and Privacy</p>
            <p>Email: tuyishime1angel@gmail.com</p>
            <p>Location: Kigali, Rwanda</p>
          </div>
        </section>

      </div>
    </div>
  );
}
