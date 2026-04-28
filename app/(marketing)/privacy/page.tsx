import type { Metadata } from "next";
import { LegalPage } from "../legal/LegalPage";

const effectiveDate = "April 27, 2026";
const contactEmail = "[privacy contact email]";

export const metadata: Metadata = {
  title: "Privacy Policy | Rekindle",
  description:
    "How Rekindle collects, uses, shares, protects, and retains personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="This policy explains what information Rekindle collects, how we use it, and the choices you have."
      effectiveDate={effectiveDate}
    >
      <p>
        This Privacy Policy applies to Rekindle, including our mobile
        application, website, and related services (collectively, the
        &quot;Service&quot;). In this policy, &quot;Rekindle,&quot;
        &quot;we,&quot; &quot;us,&quot; and &quot;our&quot; refer to [legal
        entity name].
      </p>

      <p>
        Rekindle helps people remember, plan, and follow through on thoughtful
        actions for the people in their lives. Because the Service can include
        personal notes and relationship context, please only add information you
        have a legitimate reason to use in Rekindle.
      </p>

      <h2>Information We Collect</h2>
      <p>We collect information in the following ways.</p>

      <h3>Account and profile information</h3>
      <p>
        When you create or manage an account, we may collect information such as
        your name, nickname, email address, avatar, preferred language, account
        settings, and authentication information handled by our service
        providers.
      </p>

      <h3>People, relationship, and planning information</h3>
      <p>
        The core features of Rekindle let you save information about people in
        your life, such as names, nicknames, relationship categories, birthdays,
        photos, notes, preferences, favorites, reminders, plans, wishes, custom
        requests, completion history, and similar information you choose to
        enter.
      </p>

      <h3>Shared connection information</h3>
      <p>
        If you use features that connect your account with another Rekindle
        user, we may process invite links or tokens, connection membership,
        shared wishes, shared plan activity, inbox items, thanks, and related
        metadata needed to operate those features.
      </p>

      <h3>Photos and user content</h3>
      <p>
        If you upload photos, notes, custom requests, issue details, or other
        content, we store and process that content to provide the Service.
      </p>

      <h3>Reminders and notification information</h3>
      <p>
        If you enable reminders or notifications, we may process reminder
        schedules, time zones, notification titles and bodies, delivery status,
        and device or push-token information needed to deliver notifications.
      </p>

      <h3>Support, diagnostics, and issue reports</h3>
      <p>
        If you contact us or submit an issue report, we may collect your contact
        email, summary, details, app version, build number, device type,
        platform, operating system version, session identifiers, error
        identifiers, logs, and other diagnostic information you provide or
        choose to include.
      </p>

      <h3>Usage and technical information</h3>
      <p>
        We and our service providers may collect technical information such as
        device information, IP address, app interactions, pages viewed, feature
        usage, approximate location inferred from IP address, cookies or similar
        technologies on the website, crash data, performance data, and other
        information needed to operate, secure, debug, and improve the Service.
      </p>

      <h2>How We Use Information</h2>
      <p>We use information to:</p>
      <ul>
        <li>provide, maintain, secure, and improve the Service;</li>
        <li>create and manage accounts;</li>
        <li>save and sync your people, plans, reminders, wishes, and notes;</li>
        <li>personalize suggestions, reminders, and app content;</li>
        <li>enable connection, invite, and shared wish features;</li>
        <li>send service messages, reminders, and support responses;</li>
        <li>investigate bugs, abuse, security issues, and policy violations;</li>
        <li>analyze performance and product usage;</li>
        <li>comply with legal obligations and enforce our Terms of Service.</li>
      </ul>

      <h2>How We Share Information</h2>
      <p>
        We do not sell your personal information. We also do not share personal
        information for cross-context behavioral advertising unless we clearly
        disclose that practice and provide any legally required choices.
      </p>

      <p>We may share information in these limited circumstances:</p>
      <ul>
        <li>
          <strong>With service providers.</strong> We use vendors that help us
          host, store, authenticate, secure, analyze, support, and operate the
          Service. They may process information only as needed to provide those
          services to us.
        </li>
        <li>
          <strong>With connected users.</strong> If you choose to connect with
          another user or use shared features, information you intentionally
          share through those features may be visible to the connected user.
        </li>
        <li>
          <strong>For legal and safety reasons.</strong> We may disclose
          information if we believe it is necessary to comply with law, respond
          to lawful requests, protect rights and safety, prevent fraud or abuse,
          or enforce our agreements.
        </li>
        <li>
          <strong>In a business transfer.</strong> If Rekindle is involved in a
          merger, acquisition, financing, reorganization, bankruptcy, or sale of
          assets, information may be transferred as part of that transaction.
        </li>
        <li>
          <strong>With your consent.</strong> We may share information when you
          direct us to do so or otherwise consent.
        </li>
      </ul>

      <h2>Third-Party Services</h2>
      <p>
        Rekindle may use third-party services for hosting, database storage,
        authentication, file storage, email delivery, push notifications,
        analytics, diagnostics, crash reporting, customer support, payments, and
        app distribution. Current providers may include database, storage,
        authentication, app store, and [additional production provider
        categories, such as analytics, crash reporting, payment, email, or push
        notification] providers.
      </p>

      <h2>Data Retention</h2>
      <p>
        We keep personal information for as long as reasonably necessary to
        provide the Service, comply with legal obligations, resolve disputes,
        enforce agreements, maintain security, and support legitimate business
        purposes. Some information may be retained in backups for a limited
        period before deletion is fully completed.
      </p>

      <p>
        Issue reports and related diagnostic logs are generally intended to be
        retained for a limited support window. Rekindle&apos;s current operational
        cleanup process is designed around a 60-day retention period for issue
        reports, unless we need to retain specific information longer for
        security, legal, or support reasons.
      </p>

      <h2>Your Choices and Rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct,
        delete, export, restrict, or object to certain processing of your
        personal information. You may also have the right to appeal a decision
        we make about a privacy request.
      </p>

      <p>
        You can update some account and app information directly in the Service.
        To request access, correction, deletion, or another privacy action,
        contact us at {contactEmail}. We may need to verify your identity before
        completing a request.
      </p>

      <h2>Account Deletion</h2>
      <p>
        If you request account deletion, we will delete or de-identify personal
        information associated with your account unless retention is required or
        permitted for legal, security, fraud-prevention, dispute-resolution, or
        operational reasons. You can request account deletion through the
        Service or by contacting us at {contactEmail}.
      </p>

      <h2>Children&apos;s Privacy</h2>
      <p>
        Rekindle is not intended for children under 13. We do not knowingly
        collect personal information from children under 13. If you believe a
        child has provided us personal information, contact us so we can take
        appropriate action.
      </p>

      <h2>Security</h2>
      <p>
        We use administrative, technical, and organizational safeguards designed
        to protect personal information. No method of transmission or storage is
        completely secure, so we cannot guarantee absolute security.
      </p>

      <h2>International Use</h2>
      <p>
        Rekindle is operated from [country or region]. If you use the Service
        from another location, your information may be processed and stored in
        countries that may have different data protection laws than where you
        live.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. If we make
        material changes, we will provide notice as required by law, such as by
        updating the effective date, posting a notice in the Service, or sending
        a message.
      </p>

      <h2>Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy or our privacy
        practices, contact us at {contactEmail}.
      </p>

      <p>
        Mailing address: [company mailing address]
        <br />
        Legal entity: [legal entity name]
      </p>
    </LegalPage>
  );
}
