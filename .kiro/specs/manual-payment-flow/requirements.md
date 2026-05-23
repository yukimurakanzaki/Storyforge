# Requirements Document

## Introduction

Manual bank transfer payment flow for StoryForge Pro subscriptions (Rp 199,000/month). This is the beta payment system enabling free users to upgrade to Pro via BCA or Mandiri bank transfer with manual admin verification. The flow covers the complete lifecycle: upgrade initiation, payment instructions, proof upload, admin verification, subscription activation, expiry reminders, and grace period handling.

## Glossary

- **Payment_System**: The StoryForge subsystem responsible for managing the manual bank transfer payment flow, including payment code generation, proof upload handling, and subscription lifecycle management.
- **Pricing_Page**: The `/pricing` route that displays plan comparison (Free vs Pro) and initiates the upgrade flow.
- **Unique_Payment_Code**: A system-generated numeric code appended to the transfer amount (e.g., Rp 199.047) to identify individual transactions.
- **Proof_of_Transfer**: An image file (bukti transfer) uploaded by the user as evidence of completed bank transfer.
- **Admin_Panel**: The interface used by the product owner to review and verify payment proofs.
- **Subscription_Engine**: The subsystem that manages subscription status, activation, expiration, and grace period logic.
- **Reminder_Service**: The email service (via Resend) responsible for sending expiry reminder notifications.
- **Grace_Period**: A 3-day window after subscription expiration during which Pro features remain accessible.
- **Free_User**: An authenticated StoryForge user on the free plan (3 analyses/month).
- **Pro_User**: An authenticated StoryForge user with an active Pro subscription (50 analyses/month).
- **Admin**: The product owner who manually verifies payment proofs and activates subscriptions.

## Requirements

### Requirement 1: Pricing Page Display

**User Story:** As a Free_User, I want to see a clear comparison of Free and Pro plans with pricing details, so that I can make an informed decision about upgrading.

#### Acceptance Criteria

1. WHEN a Free_User navigates to the Pricing_Page, THE Pricing_Page SHALL display a comparison table showing Free plan features and Pro plan features with the price of Rp 199,000/month.
2. WHEN a Free_User clicks the "Upgrade ke Pro" button on the Pricing_Page, THE Payment_System SHALL display bank transfer instructions with a generated Unique_Payment_Code.
3. WHILE a user has an active Pro subscription, THE Pricing_Page SHALL display the current subscription status and expiration date instead of the upgrade button.

### Requirement 2: Unique Payment Code Generation

**User Story:** As a Free_User, I want to receive a unique payment code with my transfer instructions, so that the admin can identify my specific payment.

#### Acceptance Criteria

1. WHEN the Payment_System generates transfer instructions, THE Payment_System SHALL create a Unique_Payment_Code consisting of 3 random digits appended to the base price (e.g., Rp 199.XXX).
2. THE Payment_System SHALL ensure each Unique_Payment_Code is not reused for any other pending transaction.
3. WHEN the Payment_System displays transfer instructions, THE Payment_System SHALL show the destination bank account details for both BCA and Mandiri options.
4. WHEN the Payment_System displays transfer instructions, THE Payment_System SHALL show the exact transfer amount including the Unique_Payment_Code.
5. IF a Unique_Payment_Code has not been used within 24 hours of generation, THEN THE Payment_System SHALL mark the code as expired and allow reuse.

### Requirement 3: Proof of Transfer Upload

**User Story:** As a Free_User, I want to upload my proof of transfer after completing the bank transfer, so that the admin can verify my payment.

#### Acceptance Criteria

1. WHEN a Free_User has received transfer instructions, THE Payment_System SHALL display a form to upload a Proof_of_Transfer image.
2. THE Payment_System SHALL accept image files in JPEG, PNG, or WebP format with a maximum file size of 5 MB.
3. WHEN a Free_User submits a Proof_of_Transfer, THE Payment_System SHALL store the image in Supabase Storage and create a payment record with status "pending_verification".
4. WHEN a Free_User submits a Proof_of_Transfer, THE Payment_System SHALL display a confirmation message indicating the payment is awaiting admin verification within 24 hours.
5. IF a Free_User uploads a file that exceeds 5 MB or is not a supported image format, THEN THE Payment_System SHALL display an error message in Bahasa Indonesia specifying the constraint violated.

### Requirement 4: Admin Payment Verification

**User Story:** As an Admin, I want to review uploaded payment proofs and verify or reject them, so that I can activate subscriptions for legitimate payments.

#### Acceptance Criteria

1. WHEN the Admin accesses the Admin_Panel, THE Admin_Panel SHALL display a list of all pending payment verifications sorted by submission date (oldest first).
2. WHEN the Admin views a pending payment, THE Admin_Panel SHALL display the Proof_of_Transfer image, the user email, the expected transfer amount with Unique_Payment_Code, and the submission timestamp.
3. WHEN the Admin approves a payment, THE Subscription_Engine SHALL activate the Pro subscription for the corresponding user.
4. WHEN the Admin rejects a payment, THE Payment_System SHALL update the payment record status to "rejected" and notify the user via email with the rejection reason.
5. THE Admin_Panel SHALL require authentication and restrict access to users with the admin role.

### Requirement 5: Subscription Activation

**User Story:** As a Free_User whose payment has been verified, I want my Pro subscription to activate immediately, so that I can access Pro features right away.

#### Acceptance Criteria

1. WHEN the Admin approves a payment, THE Subscription_Engine SHALL update the user's subscription plan from "free" to "pro" in the subscriptions table.
2. WHEN the Subscription_Engine activates a Pro subscription, THE Subscription_Engine SHALL set the expiration date to exactly 30 days from the verification timestamp.
3. WHEN the Subscription_Engine activates a Pro subscription, THE Subscription_Engine SHALL reset the user's usage counter to 0 and set the usage limit to 50 analyses.
4. WHEN the Subscription_Engine activates a Pro subscription, THE Reminder_Service SHALL send a confirmation email to the user containing the activation date and expiration date.

### Requirement 6: Subscription Expiry Reminder

**User Story:** As a Pro_User, I want to receive a reminder before my subscription expires, so that I can renew in time and avoid losing access.

#### Acceptance Criteria

1. WHEN a Pro subscription is 3 days from expiration, THE Reminder_Service SHALL send a reminder email to the Pro_User containing the expiration date and renewal instructions.
2. THE Reminder_Service SHALL send the reminder email exactly once per subscription period (not repeated daily).
3. WHEN the reminder email is sent, THE Reminder_Service SHALL include a direct link to the Pricing_Page for renewal.

### Requirement 7: Grace Period Handling

**User Story:** As a Pro_User whose subscription has just expired, I want a short grace period to complete my renewal, so that I do not lose access abruptly.

#### Acceptance Criteria

1. WHEN a Pro subscription expires, THE Subscription_Engine SHALL enter a 3-day Grace_Period during which Pro features remain accessible.
2. WHILE a subscription is in Grace_Period, THE Pricing_Page SHALL display a warning banner indicating the number of remaining grace days and a renewal prompt.
3. WHEN the Grace_Period ends without renewal, THE Subscription_Engine SHALL downgrade the user's plan from "pro" to "free" and enforce free tier limits immediately.
4. WHEN the Grace_Period ends without renewal, THE Subscription_Engine SHALL set the usage limit to 3 analyses per month.

### Requirement 8: Subscription Status Enforcement

**User Story:** As a system operator, I want the application to enforce subscription status consistently across all features, so that only paying users access Pro features.

#### Acceptance Criteria

1. THE Subscription_Engine SHALL check subscription status (active, grace_period, expired) on every feature-gated request.
2. WHEN a user's subscription status is "expired" and Grace_Period has ended, THE Payment_System SHALL enforce free tier limits (3 analyses/month, 5,000 word max, watermark on output).
3. WHILE a subscription is active or in Grace_Period, THE Payment_System SHALL allow Pro tier limits (50 analyses/month, 10,000 word max, no watermark).
4. IF the subscription status check fails due to a database error, THEN THE Subscription_Engine SHALL default to the free tier limits and log the error for investigation.

### Requirement 9: Payment Record Tracking

**User Story:** As an Admin, I want a complete record of all payment transactions, so that I can audit payment history and resolve disputes.

#### Acceptance Criteria

1. THE Payment_System SHALL store each payment transaction with the following fields: user_id, unique_payment_code, amount, bank_destination (BCA or Mandiri), proof_image_url, status (pending_verification, approved, rejected, expired), submitted_at, verified_at, and verified_by.
2. WHEN a payment status changes, THE Payment_System SHALL record the timestamp of the status change.
3. THE Admin_Panel SHALL provide a filterable view of all payment records by status and date range.

### Requirement 10: UI Language and Accessibility

**User Story:** As a Free_User, I want all payment-related interfaces to be in Bahasa Indonesia, so that I can understand the instructions clearly.

#### Acceptance Criteria

1. THE Pricing_Page SHALL display all text content, labels, and instructions in Bahasa Indonesia.
2. THE Payment_System SHALL display all error messages, confirmation messages, and status updates in Bahasa Indonesia.
3. THE Pricing_Page SHALL be responsive and functional on mobile viewports (minimum 320px width).
4. THE Payment_System SHALL ensure all interactive elements meet WCAG 2.1 Level AA contrast requirements and include appropriate ARIA labels.
