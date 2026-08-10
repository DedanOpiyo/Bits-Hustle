"""Email notification service — sends emails via SMTP or logs if disabled."""
import logging
from typing import Optional
from app.extensions import db

logger = logging.getLogger(__name__)


class EmailService:
    """Send emails. Falls back to logging when SMTP is not configured."""

    @staticmethod
    def send(to: str, subject: str, body_html: str, body_text: Optional[str] = None) -> bool:
        """Send an email. Returns True on success, False on failure."""
        from flask import current_app
        smtp_enabled = current_app.config.get("SMTP_ENABLED", False)
        if not smtp_enabled:
            logger.info(
                "[EMAIL] SMTP disabled - would send to=%s subject=%s body=%s",
                to, subject, body_text or body_html[:100],
            )
            return True
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            smtp_host = current_app.config.get("SMTP_HOST", "smtp.gmail.com")
            smtp_port = current_app.config.get("SMTP_PORT", 587)
            smtp_user = current_app.config.get("SMTP_USER", "")
            smtp_pass = current_app.config.get("SMTP_PASS", "")
            from_addr = current_app.config.get("SMTP_FROM", smtp_user)

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_addr
            msg["To"] = to
            msg.attach(MIMEText(body_text or body_html, "plain"))
            msg.attach(MIMEText(body_html, "html"))

            # Port 465 uses SMTP_SSL (implicit TLS), ports 587/25 use starttls (explicit TLS)
            if smtp_port == 465:
                with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(from_addr, [to], msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port) as server:
                    server.starttls()
                    if smtp_user and smtp_pass:
                        server.login(smtp_user, smtp_pass)
                    server.sendmail(from_addr, [to], msg.as_string())

            logger.info("[EMAIL] Sent to=%s subject=%s", to, subject)
            return True
        except Exception as exc:
            logger.error("[EMAIL] Failed to send to=%s: %s", to, exc)
            return False

    @staticmethod
    def send_task_approved(user_email: str, user_name: str, task_title: str, reward: float) -> bool:
        return EmailService.send(
            to=user_email,
            subject="Task Approved - Reward Credited",
            body_html=f"""
            <html><body>
            <h2>Task Approved</h2>
            <p>Hi {user_name},</p>
            <p>Your task "<strong>{task_title}</strong>" has been approved.</p>
            <p><strong>KES {reward:,.2f}</strong> has been credited to your wallet.</p>
            </body></html>
            """,
            body_text=f"Hi {user_name}, your task '{task_title}' has been approved. KES {reward:,.2f} credited to your wallet.",
        )

    @staticmethod
    def send_task_rejected(user_email: str, user_name: str, task_title: str, reason: str) -> bool:
        return EmailService.send(
            to=user_email,
            subject="Task Rejected",
            body_html=f"""
            <html><body>
            <h2>Task Rejected</h2>
            <p>Hi {user_name},</p>
            <p>Your task "<strong>{task_title}</strong>" was rejected.</p>
            <p><strong>Reason:</strong> {reason}</p>
            <p>You can resubmit with corrected proof.</p>
            </body></html>
            """,
            body_text=f"Hi {user_name}, your task '{task_title}' was rejected. Reason: {reason}",
        )

    @staticmethod
    def send_payout_approved(user_email: str, user_name: str, amount: float) -> bool:
        return EmailService.send(
            to=user_email,
            subject="Payout Approved",
            body_html=f"""
            <html><body>
            <h2>Payout Approved</h2>
            <p>Hi {user_name},</p>
            <p>Your payout request of <strong>KES {amount:,.2f}</strong> has been approved.</p>
            <p>Funds will be processed shortly.</p>
            </body></html>
            """,
            body_text=f"Hi {user_name}, your payout of KES {amount:,.2f} has been approved.",
        )

    @staticmethod
    def send_payout_rejected(user_email: str, user_name: str, amount: float, reason: str) -> bool:
        return EmailService.send(
            to=user_email,
            subject="Payout Rejected",
            body_html=f"""
            <html><body>
            <h2>Payout Rejected</h2>
            <p>Hi {user_name},</p>
            <p>Your payout request of <strong>KES {amount:,.2f}</strong> was rejected.</p>
            <p><strong>Reason:</strong> {reason}</p>
            </body></html>
            """,
            body_text=f"Hi {user_name}, your payout of KES {amount:,.2f} was rejected. Reason: {reason}",
        )

    @staticmethod
    def send_new_campaign(user_email: str, user_name: str, campaign_name: str, platform_name: str) -> bool:
        return EmailService.send(
            to=user_email,
            subject="New Campaign Available",
            body_html=f"""
            <html><body>
            <h2>New Campaign Available</h2>
            <p>Hi {user_name},</p>
            <p>A new campaign "<strong>{campaign_name}</strong>" for <strong>{platform_name}</strong> is now open for submissions.</p>
            <p>Check your dashboard to start earning!</p>
            </body></html>
            """,
            body_text=f"Hi {user_name}, a new campaign '{campaign_name}' for {platform_name} is now available.",
        )

    @staticmethod
    def send_task_assigned(user_email: str, user_name: str, task_title: str, deadline: str) -> bool:
        return EmailService.send(
            to=user_email,
            subject="New Task Assigned",
            body_html=f"""
            <html><body>
            <h2>New Task Assigned</h2>
            <p>Hi {user_name},</p>
            <p>You have been assigned a new task: "<strong>{task_title}</strong>".</p>
            <p><strong>Deadline:</strong> {deadline}</p>
            <p>Submit your proof before the deadline to earn rewards.</p>
            </body></html>
            """,
            body_text=f"Hi {user_name}, you have a new task: '{task_title}'. Deadline: {deadline}",
        )

    @staticmethod
    def send_assignment_notification(user_email: str, user_name: str, subject: str, heading: str, message: str, assignment_title: str) -> bool:
        return EmailService.send(
            to=user_email,
            subject=subject,
            body_html=f"""
            <html><body>
            <h2>{heading}</h2>
            <p>Hi {user_name},</p>
            <p>{message}</p>
            <p><strong>Assignment:</strong> {assignment_title}</p>
            <p>Please log in to your dashboard for details.</p>
            </body></html>
            """,
            body_text=f"Hi {user_name}, {message} Assignment: {assignment_title}. Please log in to your dashboard for details.",
        )

    @staticmethod
    def send_proposals_ready(client_email: str, client_name: str, assignment_title: str, proposal_count: int) -> bool:
        return EmailService.send(
            to=client_email,
            subject=f"Worker Proposals Ready for Review: {assignment_title}",
            body_html=f"""
            <html><body>
            <h2>Proposals Ready for Review</h2>
            <p>Hi {client_name},</p>
            <p>Worker proposals are now ready for your assignment "<strong>{assignment_title}</strong>".</p>
            <p><strong>{proposal_count}</strong> proposal(s) have been submitted for your review.</p>
            <p>Please log in to your dashboard to review the proposals and select your preferred worker.</p>
            <p>If you have any questions, please contact our support team.</p>
            </body></html>
            """,
            body_text=f"Hi {client_name}, worker proposals are ready for your assignment '{assignment_title}'. {proposal_count} proposal(s) submitted. Please log in to review and select a worker.",
        )

    @staticmethod
    def send_assignment_complete(client_email: str, client_name: str, assignment_title: str) -> bool:
        return EmailService.send(
            to=client_email,
            subject=f"Assignment Complete: {assignment_title}",
            body_html=f"""
            <html><body>
            <h2>Assignment Complete</h2>
            <p>Hi {client_name},</p>
            <p>Your assignment "<strong>{assignment_title}</strong>" has been completed and approved.</p>
            <p>The work has been reviewed and meets all requirements.</p>
            <p>You can now download the deliverables from your dashboard.</p>
            </body></html>
            """,
            body_text=f"Hi {client_name}, your assignment '{assignment_title}' has been completed and approved. Download deliverables from your dashboard.",
        )

    @staticmethod
    def send_assignment_revision_needed(client_email: str, client_name: str, assignment_title: str) -> bool:
        return EmailService.send(
            to=client_email,
            subject=f"Revision Requested: {assignment_title}",
            body_html=f"""
            <html><body>
            <h2>Revision Requested</h2>
            <p>Hi {client_name},</p>
            <p>Revisions have been requested for your assignment "<strong>{assignment_title}</strong>".</p>
            <p>The worker will revise the work based on feedback. You will be notified once the revised work is submitted.</p>
            </body></html>
            """,
            body_text=f"Hi {client_name}, revisions requested for assignment '{assignment_title}'. Worker will revise and resubmit.",
        )

    @staticmethod
    def send_assignment_rejected(client_email: str, client_name: str, assignment_title: str) -> bool:
        return EmailService.send(
            to=client_email,
            subject=f"Assignment Rejected: {assignment_title}",
            body_html=f"""
            <html><body>
            <h2>Assignment Rejected</h2>
            <p>Hi {client_name},</p>
            <p>Your assignment "<strong>{assignment_title}</strong>" has been rejected.</p>
            <p>Please contact our support team if you need assistance with resubmission or have questions.</p>
            </body></html>
            """,
            body_text=f"Hi {client_name}, your assignment '{assignment_title}' has been rejected. Contact support for assistance.",
        )

    @staticmethod
    def send_gig_won(worker_email: str, worker_name: str, assignment_title: str, final_price: float) -> bool:
        return EmailService.send(
            to=worker_email,
            subject=f"Gig Won: {assignment_title}",
            body_html=f"""
            <html><body>
            <h2>Congratulations! You Won the Gig</h2>
            <p>Hi {worker_name},</p>
            <p>You have been selected for the assignment "<strong>{assignment_title}</strong>".</p>
            <p><strong>Final Price:</strong> KES {final_price:,.2f}</p>
            <p>Please log in to your dashboard to accept the assignment and begin work.</p>
            </body></html>
            """,
            body_text=f"Hi {worker_name}, you won the gig '{assignment_title}' at KES {final_price:,.2f}. Log in to accept and begin work.",
        )

    @staticmethod
    def send_worker_assigned(client_email: str, client_name: str, assignment_title: str, final_price: float) -> bool:
        return EmailService.send(
            to=client_email,
            subject=f"Worker Assigned: {assignment_title}",
            body_html=f"""
            <html><body>
            <h2>Worker Assigned</h2>
            <p>Hi {client_name},</p>
            <p>A worker has been assigned to your assignment "<strong>{assignment_title}</strong>".</p>
            <p><strong>Final Price:</strong> KES {final_price:,.2f}</p>
            <p>The worker will begin work shortly. You will be notified when the work is submitted for review.</p>
            </body></html>
            """,
            body_text=f"Hi {client_name}, worker assigned to '{assignment_title}' at KES {final_price:,.2f}. Worker will begin shortly.",
        )

    @staticmethod
    def send_task_deadline_reminder(user_email: str, user_name: str, task_title: str, deadline: str) -> bool:
        return EmailService.send(
            to=user_email,
            subject="Task Deadline Reminder",
            body_html=f"""
            <html><body>
            <h2>Deadline Reminder</h2>
            <p>Hi {user_name},</p>
            <p>The deadline for "<strong>{task_title}</strong>" is approaching.</p>
            <p><strong>Deadline:</strong> {deadline}</p>
            <p>Submit your proof soon to avoid missing out on rewards.</p>
            </body></html>
            """,
            body_text=f"Hi {user_name}, deadline reminder for task '{task_title}': {deadline}",
        )

    @staticmethod
    def send_leaderboard_update(user_email: str, user_name: str, rank: int) -> bool:
        return EmailService.send(
            to=user_email,
            subject="Leaderboard Update",
            body_html=f"""
            <html><body>
            <h2>Leaderboard Update</h2>
            <p>Hi {user_name},</p>
            <p>You are now ranked <strong>#{rank}</strong> on the leaderboard!</p>
            <p>Keep up the great work!</p>
            </body></html>
            """,
            body_text=f"Hi {user_name}, you are now ranked #{rank} on the leaderboard!",
        )

    @staticmethod
    def send_welcome_credentials(user_email: str, user_name: str, temp_password: str, login_url: str = "") -> bool:
        return EmailService.send(
            to=user_email,
            subject="Welcome - Your Login Credentials",
            body_html=f"""
            <html><body>
            <h2>Welcome!</h2>
            <p>Hi {user_name},</p>
            <p>An account has been created for you. Here are your login credentials:</p>
            <table style="border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px 16px;border:1px solid #ddd;font-weight:bold;">Email:</td><td style="padding:8px 16px;border:1px solid #ddd;">{user_email}</td></tr>
              <tr><td style="padding:8px 16px;border:1px solid #ddd;font-weight:bold;">Temporary Password:</td><td style="padding:8px 16px;border:1px solid #ddd;"><code style="background:#f0f0f0;padding:4px 8px;border-radius:4px;">{temp_password}</code></td></tr>
            </table>
            <p><strong>Important:</strong> You will be required to change your password after your first login for security.</p>
            {f'<p><a href="{login_url}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">Login Now</a></p>' if login_url else ''}
            <p>If you did not expect this email, please contact support.</p>
            </body></html>
            """,
            body_text=f"Hi {user_name}, an account has been created for you.\n\nEmail: {user_email}\nTemporary Password: {temp_password}\n\nYou will be required to change your password after your first login for security.",
        )

    @staticmethod
    def send_ticket_created(ambassador_email: str, ambassador_name: str, ticket_number: str, subject: str) -> bool:
        return EmailService.send(
            to=ambassador_email,
            subject=f"Support Ticket Created: {ticket_number}",
            body_html=f"""
            <html><body>
            <h2>Support Ticket Created</h2>
            <p>Hi {ambassador_name},</p>
            <p>Your support ticket has been created successfully.</p>
            <table style="border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px 16px;border:1px solid #ddd;font-weight:bold;">Ticket Number:</td><td style="padding:8px 16px;border:1px solid #ddd;"><code>{ticket_number}</code></td></tr>
              <tr><td style="padding:8px 16px;border:1px solid #ddd;font-weight:bold;">Subject:</td><td style="padding:8px 16px;border:1px solid #ddd;">{subject}</td></tr>
            </table>
            <p>Our support team will respond shortly.</p>
            <p>You can check ticket status in your dashboard.</p>
            </body></html>
            """,
            body_text=f"Hi {ambassador_name}, your support ticket {ticket_number} has been created. Subject: {subject}. Our team will respond shortly.",
        )

    @staticmethod
    def send_ticket_resolved(ambassador_email: str, ambassador_name: str, ticket_number: str, subject: str, resolution: str) -> bool:
        return EmailService.send(
            to=ambassador_email,
            subject=f"Support Ticket Resolved: {ticket_number}",
            body_html=f"""
            <html><body>
            <h2>Ticket Resolved</h2>
            <p>Hi {ambassador_name},</p>
            <p>Your support ticket has been resolved.</p>
            <table style="border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px 16px;border:1px solid #ddd;font-weight:bold;">Ticket Number:</td><td style="padding:8px 16px;border:1px solid #ddd;"><code>{ticket_number}</code></td></tr>
              <tr><td style="padding:8px 16px;border:1px solid #ddd;font-weight:bold;">Subject:</td><td style="padding:8px 16px;border:1px solid #ddd;">{subject}</td></tr>
            </table>
            <p><strong>Resolution:</strong> {resolution}</p>
            <p>If you need further assistance, please reply to this ticket or create a new one.</p>
            </body></html>
            """,
            body_text=f"Hi {ambassador_name}, your ticket {ticket_number} has been resolved. Resolution: {resolution}",
        )

    @staticmethod
    def send_ticket_reply(ambassador_email: str, ambassador_name: str, ticket_number: str, subject: str, reply: str) -> bool:
        return EmailService.send(
            to=ambassador_email,
            subject=f"New Reply on Support Ticket: {ticket_number}",
            body_html=f"""
            <html><body>
            <h2>Ticket Reply</h2>
            <p>Hi {ambassador_name},</p>
            <p>You have received a reply on your support ticket.</p>
            <table style="border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px 16px;border:1px solid #ddd;font-weight:bold;">Ticket Number:</td><td style="padding:8px 16px;border:1px solid #ddd;"><code>{ticket_number}</code></td></tr>
              <tr><td style="padding:8px 16px;border:1px solid #ddd;font-weight:bold;">Subject:</td><td style="padding:8px 16px;border:1px solid #ddd;">{subject}</td></tr>
            </table>
            <p><strong>Reply:</strong> {reply}</p>
            <p>View the full conversation in your dashboard.</p>
            </body></html>
            """,
            body_text=f"Hi {ambassador_name}, there is a new reply on your ticket {ticket_number}. Reply: {reply}",
        )

