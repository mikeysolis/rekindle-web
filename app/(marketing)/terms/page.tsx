import type { Metadata } from "next";
import { LegalPage } from "../legal/LegalPage";

const effectiveDate = "April 27, 2026";
const contactEmail = "[support contact email]";

export const metadata: Metadata = {
  title: "Terms of Service | Rekindle",
  description:
    "The terms that govern access to and use of Rekindle's app, website, and related services.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="These terms explain the rules for using Rekindle and the responsibilities that apply to both you and us."
      effectiveDate={effectiveDate}
    >
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of
        Rekindle, including our mobile application, website, and related
        services (collectively, the &quot;Service&quot;). In these Terms,
        &quot;Rekindle,&quot; &quot;we,&quot; &quot;us,&quot; and
        &quot;our&quot; refer to [legal entity name].
      </p>

      <p>
        By creating an account, accessing, or using the Service, you agree to
        these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be at least 13 years old to use Rekindle. If you are under the
        age of majority where you live, you may use the Service only with the
        consent of a parent or legal guardian. You represent that you can form a
        binding contract with Rekindle and that you are not barred from using
        the Service under applicable law.
      </p>

      <h2>Accounts</h2>
      <p>
        You are responsible for maintaining the confidentiality of your account
        credentials and for all activity under your account. You agree to
        provide accurate information and keep it reasonably up to date. Notify
        us promptly if you believe your account has been compromised.
      </p>

      <h2>The Service</h2>
      <p>
        Rekindle helps you remember, plan, and follow through on thoughtful
        actions for people in your life. The Service may include people records,
        notes, reminders, suggested actions, plans, wishes, shared connection
        features, inbox items, and related tools.
      </p>

      <p>
        Rekindle suggestions and reminders are informational and organizational
        tools. They are not professional, medical, legal, financial,
        therapeutic, or emergency advice. You are responsible for deciding what
        actions are appropriate for your relationships and circumstances.
      </p>

      <h2>Your Content</h2>
      <p>
        &quot;Your Content&quot; means information you submit, upload, create, save, or
        share through the Service, including names, notes, photos, birthdays,
        custom requests, plans, reminders, completion notes, issue reports, and
        other user-provided material.
      </p>

      <p>
        You retain any rights you have in Your Content. You grant Rekindle a
        non-exclusive, worldwide, royalty-free license to host, store, reproduce,
        process, display, transmit, and use Your Content as needed to operate,
        provide, secure, support, and improve the Service.
      </p>

      <p>
        You are responsible for Your Content and for ensuring you have the right
        to submit it to the Service. Do not add private, sensitive, unlawful, or
        harmful information about another person unless you have a legitimate
        reason and any required permission to use that information in Rekindle.
      </p>

      <h2>Shared Features</h2>
      <p>
        Rekindle may let you connect with other users, send or accept invite
        links, share wishes, or view shared activity. If you use shared
        features, information you choose to share may be visible to connected
        users. You are responsible for using shared features respectfully and
        only with people you intend to connect with.
      </p>

      <h2>Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the Service for unlawful, harmful, abusive, or deceptive purposes;</li>
        <li>harass, threaten, impersonate, or harm another person;</li>
        <li>upload content that infringes, violates privacy rights, or is illegal;</li>
        <li>attempt to access another user&apos;s account or data without permission;</li>
        <li>interfere with, reverse engineer, scrape, or disrupt the Service;</li>
        <li>introduce malware or bypass security, rate limits, or access controls;</li>
        <li>use the Service to send spam or unwanted communications;</li>
        <li>use Rekindle in emergencies or as a substitute for professional help.</li>
      </ul>

      <h2>Third-Party Services</h2>
      <p>
        The Service may rely on third-party services such as hosting,
        authentication, storage, analytics, diagnostics, email, push
        notifications, payment processors, and app store platforms. Your use of
        those services may also be subject to third-party terms and policies.
      </p>

      <h2>Payments and Subscriptions</h2>
      <p>
        If Rekindle offers paid features, purchases, or subscriptions, the
        applicable price, billing period, renewal terms, cancellation method, and
        refund rules will be shown at purchase. App store purchases are handled
        by the applicable app store provider and may be subject to that
        provider&apos;s payment and refund terms.
      </p>

      <h2>App Stores</h2>
      <p>
        If you download Rekindle through the Apple App Store, Google Play, or
        another app store, your use of the app may also be governed by that app
        store&apos;s terms. The app store provider is not responsible for providing
        support or maintenance for Rekindle unless its own terms say otherwise.
      </p>

      <h2>Ownership</h2>
      <p>
        Rekindle and its software, designs, text, graphics, logos, trademarks,
        service marks, curated ideas, and other materials are owned by Rekindle
        or its licensors and are protected by intellectual property laws. Except
        for the rights expressly granted to you, we reserve all rights in the
        Service.
      </p>

      <h2>Feedback</h2>
      <p>
        If you send us ideas, suggestions, bug reports, or other feedback, you
        grant us the right to use that feedback without restriction or
        compensation to you.
      </p>

      <h2>Privacy</h2>
      <p>
        Our Privacy Policy explains how we collect, use, and share information.
        By using the Service, you acknowledge that we process information as
        described in the Privacy Policy.
      </p>

      <h2>Service Changes and Availability</h2>
      <p>
        We may change, suspend, or discontinue all or part of the Service at any
        time. We may also impose limits on features or restrict access if needed
        to protect the Service, comply with law, or enforce these Terms. We do
        not guarantee that the Service will be uninterrupted, secure, or
        error-free.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using Rekindle at any time. We may suspend or terminate
        your access to the Service if we believe you violated these Terms,
        created risk or possible legal exposure, or used the Service in a way
        that may harm another person, Rekindle, or the Service. Sections that by
        their nature should survive termination will survive.
      </p>

      <h2>Disclaimers</h2>
      <p>
        The Service is provided &quot;as is&quot; and &quot;as available.&quot; To the fullest
        extent permitted by law, Rekindle disclaims all warranties, express or
        implied, including warranties of merchantability, fitness for a
        particular purpose, title, and non-infringement.
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, Rekindle and its affiliates,
        officers, employees, agents, partners, and licensors will not be liable
        for indirect, incidental, special, consequential, exemplary, or punitive
        damages, or for lost profits, lost data, loss of goodwill, or service
        interruption arising out of or related to the Service or these Terms.
      </p>

      <p>
        To the fullest extent permitted by law, Rekindle&apos;s total liability for
        any claim arising out of or related to the Service or these Terms will
        not exceed the greater of the amount you paid Rekindle for the Service
        in the 12 months before the claim arose or USD $100.
      </p>

      <h2>Indemnification</h2>
      <p>
        To the extent permitted by law, you agree to defend, indemnify, and hold
        harmless Rekindle and its affiliates, officers, employees, agents,
        partners, and licensors from claims, liabilities, damages, losses, and
        expenses arising out of or related to Your Content, your use of the
        Service, or your violation of these Terms.
      </p>

      <h2>Governing Law</h2>
      <p>
        These Terms are governed by the laws of [state or country], without
        regard to conflict-of-law rules. The courts located in [venue] will have
        exclusive jurisdiction over disputes arising out of or related to these
        Terms or the Service, except where applicable law requires otherwise.
      </p>

      <h2>Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. If we make material
        changes, we will provide notice as required by law, such as by updating
        the effective date, posting a notice in the Service, or sending a
        message. Your continued use of the Service after the updated Terms take
        effect means you accept the updated Terms.
      </p>

      <h2>Contact Us</h2>
      <p>
        If you have questions about these Terms, contact us at {contactEmail}.
      </p>

      <p>
        Mailing address: [company mailing address]
        <br />
        Legal entity: [legal entity name]
      </p>
    </LegalPage>
  );
}
