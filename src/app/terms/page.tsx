import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { FileText, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | CiteRoute',
  description: 'Review the legal terms and conditions governing your access to and use of CiteRoute software and services.',
};

export default function TermsOfServicePage() {
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
          <FileText className="w-3.5 h-3.5" />
          <span>Legal Agreement</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs text-[#878787]">
          Last Updated: September 10, 2026
        </p>
      </div>

      {/* Main Content */}
      <div className="glass-panel rounded-2xl p-6 sm:p-10 border border-[rgba(187,191,191,0.10)] space-y-10 text-sm leading-relaxed text-[#BBBFBF]">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">1. Acceptance of Terms</h2>
          <p>
            Welcome to CiteRoute. These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;Customer,&quot; &quot;User,&quot; or &quot;you&quot;) and CiteRoute (&quot;CiteRoute,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), operating from Kigali, Rwanda.
          </p>
          <p>
            By accessing or using our website at citeroute.com, creating an account, installing our tracking script, or making an API call, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree, you must immediately discontinue use of the platform.
          </p>
          <p>
            If you represent a business or legal entity, you represent and warrant that you possess the full legal authority to bind that entity to these Terms.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">2. Description of Services</h2>
          <p>
            CiteRoute provides a cloud-based Generative Engine Optimization (GEO) platform designed to help domain owners and agencies evaluate, observe, and optimize their digital visibility across artificial intelligence search platforms and automated software agents.
          </p>
          <p>
            The services include, without limitation:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-white">GEO Audit Engine:</strong> Automated scanning and algorithmic scoring of websites for search engine and AI readiness.
            </li>
            <li>
              <strong className="text-white">agent.json Studio:</strong> Tools to create, validate, and host machine-readable agent protocol manifests.
            </li>
            <li>
              <strong className="text-white">AI Crawler Telemetry Tag:</strong> Lightweight client-side script (track.js) that identifies incoming artificial intelligence crawler bots and search spiders on verified domains.
            </li>
            <li>
              <strong className="text-white">Telemetry and Watchlist Dashboards:</strong> Monitoring consoles to benchmark competitive domain performance.
            </li>
            <li>
              <strong className="text-white">Developer API:</strong> Authenticated programmatic endpoints to trigger audits and query ranking indices.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">3. Account Registration and Security</h2>
          <p>
            To access certain features, you must register for an account. You agree to provide accurate, current, and complete information and promptly update your account profile when details change.
          </p>
          <p>
            You are entirely responsible for maintaining the confidentiality of your credentials and API keys. Any action performed through your account is deemed to have been authorized by you. You agree to notify us immediately at <span className="text-white font-mono">tuyishime1angel@gmail.com</span> upon discovering any unauthorized use of your account or security breach.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">4. Subscriptions, Fees, and Merchant of Record</h2>
          <p>
            CiteRoute offers free access with feature caps, as well as paid monthly subscription plans, including:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-white">Free Plan ($0/month):</strong> 10 monthly scans, 3 watchlist domains, community leaderboard access.
            </li>
            <li>
              <strong className="text-white">Pro Plan ($79/month):</strong> Unlimited scans, 1 verified website tracking tag, 20 watchlist domains, 500 req/day API key.
            </li>
            <li>
              <strong className="text-white">Agency Plan ($249/month):</strong> Unlimited scans, 10 verified client sites, unlimited watchlist, white-label PDF reports, 10,000 req/day API key.
            </li>
            <li>
              <strong className="text-white">Enterprise Plan:</strong> Custom volume, dedicated pipelines, and custom invoicing.
            </li>
          </ul>
          <p>
            <strong className="text-white">Merchant of Record:</strong> Our order process is conducted by our online reseller and Merchant of Record, <strong className="text-white">Lemon Squeezy</strong>. Lemon Squeezy acts as the merchant of record for all our orders, providing customer service inquiries, managing receipts, and handling tax compliance (including VAT, sales tax, and GST).
          </p>
          <p>
            <strong className="text-white">Billing Cycle and Automatic Renewal:</strong> Subscriptions are billed in advance on a recurring monthly cycle. Your subscription automatically renews at the start of each billing period unless cancelled prior to the renewal date.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">5. Cancellation and Refund Policy</h2>
          <p>
            We strive to provide total satisfaction and transparent subscription management:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-white">Cancellation Anytime:</strong> You may cancel your subscription at any time directly through your account dashboard or through the Lemon Squeezy customer billing portal. Following cancellation, you will retain access to all plan entitlements until the end of your current paid billing period, with no subsequent charges.
            </li>
            <li>
              <strong className="text-white">14-Day Refund Guarantee:</strong> If you are dissatisfied with your initial subscription purchase for any reason, you may request a full refund within fourteen (14) calendar days of your initial purchase date.
            </li>
            <li>
              <strong className="text-white">How to Request a Refund:</strong> To request a refund under the 14-day policy, please email <span className="text-white font-mono">tuyishime1angel@gmail.com</span> with your registered account email and order receipt number. Approved refunds are processed promptly to the original payment method by Lemon Squeezy.
            </li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">6. Acceptable Use Policy</h2>
          <p>
            You agree not to misuse our services. Prohibited actions include, without limitation:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Reverse engineering, decompiling, or attempting to extract the source code or proprietary scoring algorithms of CiteRoute.
            </li>
            <li>
              Circumventing, tampering with, or exceeding established tier limits, query throttles, or API rate limits.
            </li>
            <li>
              Using the platform to conduct denial-of-service attacks, automated abusive crawling, or unauthorized vulnerability assessments against third-party websites.
            </li>
            <li>
              Falsifying HTTP headers, spoofing legitimate AI search crawler signatures, or injecting fraudulent telemetry signals into the reporting infrastructure.
            </li>
            <li>
              Reselling, sublicensing, or distributing API access to third parties without prior written consent from CiteRoute.
            </li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">7. Intellectual Property Rights</h2>
          <p>
            <strong className="text-white">Customer Data:</strong> You retain all right, title, and ownership interest in your domain content, logos, proprietary materials, and generated agent.json files. You grant CiteRoute a limited, non-exclusive license to process your domain data solely to perform audits, generate scores, and deliver the services.
          </p>
          <p>
            <strong className="text-white">CiteRoute Platform:</strong> CiteRoute, its software, scoring algorithms, designs, user interfaces, documentation, and trademarks remain the exclusive intellectual property of CiteRoute. Except as expressly provided, no rights or licenses are granted.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">8. Disclaimers and Third-Party AI Search Engines</h2>
          <p>
            THE SERVICES ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.
          </p>
          <p>
            <strong className="text-white">Important Third-Party Disclaimer:</strong> CiteRoute provides technical scoring, diagnostic insights, and structural recommendations based on generative engine optimization best practices. However, search rankings, citation frequency, and indexation decisions are determined entirely at the sole discretion of independent third-party artificial intelligence engines (including Perplexity, OpenAI, Anthropic, Google, and Microsoft). CiteRoute does not warrant or guarantee that implementing our recommendations will result in specific ranking positions, traffic volumes, or citation counts.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">9. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL CITEROUTE, ITS FOUNDERS, OFFICERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING DAMAGES FOR LOSS OF PROFITS, REPUTATION, USE, OR DATA, ARISING OUT OF OR IN CONNECTION WITH YOUR ACCESS TO OR USE OF THE SERVICE.
          </p>
          <p>
            OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE TOTAL FEES PAID BY YOU TO CITEROUTE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
          </p>
        </section>

        {/* Section 10 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">10. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless CiteRoute and its operators from and against any claims, damages, obligations, losses, liabilities, costs, or debt (including legal fees) arising from your use of the service, your violation of these Terms, or your infringement of any third-party rights.
          </p>
        </section>

        {/* Section 11 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">11. Governing Law and Jurisdiction</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the substantive laws of the Republic of Rwanda, without regard to conflict of law principles. Any dispute, controversy, or claim arising under or relating to these Terms shall be resolved amicably through good-faith consultations. If unresolved, the dispute shall be submitted to the competent courts of Kigali, Rwanda.
          </p>
        </section>

        {/* Section 12 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">12. Modifications to Terms</h2>
          <p>
            We reserve the right to revise these Terms at any time. If a revision is material, we will provide at least thirty (30) days notice before the new terms take effect. Continued use of the platform after the effective date constitutes acceptance of the modified Terms.
          </p>
        </section>

        {/* Section 13 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white tracking-tight">13. Contact Details</h2>
          <p>
            For questions or notices regarding these Terms of Service, please reach out to:
          </p>
          <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs text-[#878787] space-y-1">
            <p className="text-white font-semibold">CiteRoute Legal Operations</p>
            <p>Email: tuyishime1angel@gmail.com</p>
            <p>Location: Kigali, Rwanda</p>
          </div>
        </section>

      </div>
    </div>
  );
}
