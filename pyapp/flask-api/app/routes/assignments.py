"""Managed gig/assignment workflow routes."""

import csv
from datetime import datetime
from io import StringIO

from flask import Blueprint, Response, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import case, func
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.middleware.auth import require_roles
from app.models import (
    Assignment,
    AssignmentMessage,
    AssignmentWorker,
    GigProposal,
    Notification,
    RoleType,
    Submission,
    User,
)
from app.services.email_service import EmailService
from app.utils.responses import fail, ok
from app.utils.serializers import to_dict


assignments_bp = Blueprint("assignments", __name__)


ASSIGNMENT_STATUSES = {
    "Pending Review",
    "Open for Proposals",
    "Proposals Under Review",
    "Proposals Sent to Client",
    "Client Selected",
    "Negotiating",
    "Assigned",
    "In Progress",
    "Submitted for Review",
    "Completed",
    "Revision Needed",
    "Rejected",
}

PROPOSAL_STATUSES = {
    "Pending",
    "Approved",
    "Rejected",
    "Sent to Client",
    "Client Selected",
    "Client Amended",
    "Won",
    "Lost",
}

PRIORITIES = {"Low", "Medium", "High", "Urgent"}


def _csv_response(filename, rows, headers):
    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=headers)
    writer.writeheader()
    writer.writerows(rows)
    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def _text_response(filename, content):
    return Response(
        content,
        mimetype="text/plain",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def _current_user():
    identity = get_jwt_identity()
    return db.session.get(User, identity) if identity else None


def _event(assignment, actor, action, message):
    timeline = list(assignment.timeline or [])
    timeline.append(
        {
            "at": datetime.utcnow().isoformat(),
            "actorId": getattr(actor, "id", None),
            "actorName": getattr(actor, "name", None),
            "action": action,
            "message": message,
        }
    )
    assignment.timeline = timeline


def _notify(user_id, title, message, assignment_id):
    if not user_id:
        return
    db.session.add(
        Notification(
            user_id=user_id,
            type="ASSIGNMENT",
            title=title,
            message=message,
            reference_type="Assignment",
            reference_id=assignment_id,
            data={"assignmentId": assignment_id},
        )
    )


def _email_user(user, subject, heading, message, assignment_title):
    if not user or not getattr(user, "email", None):
        return
    EmailService.send_assignment_notification(user.email, user.name, subject, heading, message, assignment_title)


def _notify_admins(title, message, assignment_id):
    admins = (
        db.session.query(User)
        .join(RoleType, User.role_id == RoleType.id)
        .filter(RoleType.name.in_(["SUPER_ADMIN", "ADMIN"]), User.is_user_active.is_(True))
        .all()
    )
    for admin in admins:
        _notify(admin.id, title, message, assignment_id)
        _email_user(admin, title, title, message, message.replace("New assignment submitted: ", ""))


def _proposal_dict(proposal, include_amounts=True):
    item = to_dict(proposal)
    item["worker"] = _safe_user(proposal.worker)
    item["reviewed_by"] = _safe_user(proposal.reviewed_by)
    if not include_amounts:
        item.pop("proposed_amount", None)
        item.pop("adjusted_amount", None)
        item.pop("final_amount", None)
        item.pop("price_adjust_type", None)
        item.pop("price_adjust_value", None)
    return item


def _effective_proposal_amount(proposal):
    if proposal.final_amount is not None:
        return float(proposal.final_amount)
    if proposal.adjusted_amount is not None:
        return float(proposal.adjusted_amount)
    return float(proposal.proposed_amount)


def _assignment_dict(assignment, viewer=None):
    item = to_dict(assignment, with_relations=True)
    item["client"] = _safe_user(assignment.client)
    item["worker"] = _safe_user(assignment.worker)
    item["assigned_by"] = _safe_user(assignment.assigned_by)
    item["reviewed_by"] = _safe_user(assignment.reviewed_by)
    item["submissions"] = [to_dict(s) for s in sorted(assignment.submissions, key=lambda s: s.submitted_at, reverse=True)]
    if "messages" in assignment.__dict__:
        item["messages"] = [_message_dict(message) for message in sorted(assignment.messages, key=lambda msg: msg.created_at)]

    role_name = getattr(getattr(viewer, "role", None), "name", None) if viewer else None
    is_admin = role_name in ("ADMIN", "SUPER_ADMIN")
    is_client = role_name == "CLIENT" and viewer and assignment.client_id == viewer.id
    is_assigned_worker = role_name == "GIG_WORKER" and viewer and assignment.worker_id == viewer.id

    # Gig workers see open gigs without client budget until they win and are assigned.
    if role_name == "GIG_WORKER" and not is_assigned_worker and not is_admin:
        item.pop("budget", None)
        item.pop("final_price", None)
        item["budget_hidden"] = True
    else:
        item["budget_hidden"] = False

    proposals = list(getattr(assignment, "proposals", None) or [])
    if is_admin:
        item["proposals"] = [_proposal_dict(p, include_amounts=True) for p in sorted(proposals, key=lambda p: p.created_at, reverse=True)]
    elif is_client:
        visible = [p for p in proposals if p.status in ("Sent to Client", "Client Selected", "Client Amended", "Won", "Lost")]
        item["proposals"] = [_proposal_dict(p, include_amounts=True) for p in sorted(visible, key=lambda p: p.created_at, reverse=True)]
    elif role_name == "GIG_WORKER" and viewer:
        mine = [p for p in proposals if p.worker_id == viewer.id]
        item["proposals"] = [_proposal_dict(p, include_amounts=True) for p in sorted(mine, key=lambda p: p.created_at, reverse=True)]
        item["my_proposal"] = item["proposals"][0] if item["proposals"] else None
    else:
        item["proposals"] = []

    return item


def _message_dict(message):
    item = to_dict(message)
    item["sender"] = _safe_user(message.sender)
    return item


def _safe_user(user):
    if not user:
        return None
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": to_dict(user.role) if user.role else None,
    }


def _parse_deadline(value):
    if not value:
        raise ValueError("deadline is required")
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError as exc:
        raise ValueError("deadline must be a valid ISO date") from exc


def _base_query():
    return db.session.query(Assignment).options(
        joinedload(Assignment.client).joinedload(User.role),
        joinedload(Assignment.worker).joinedload(User.role),
        joinedload(Assignment.assigned_by).joinedload(User.role),
        joinedload(Assignment.reviewed_by).joinedload(User.role),
        joinedload(Assignment.submissions),
        joinedload(Assignment.messages).joinedload(AssignmentMessage.sender).joinedload(User.role),
        joinedload(Assignment.proposals).joinedload(GigProposal.worker).joinedload(User.role),
        joinedload(Assignment.proposals).joinedload(GigProposal.reviewed_by).joinedload(User.role),
    )


def _is_active_worker(user):
    return (
        db.session.query(AssignmentWorker)
        .filter(AssignmentWorker.user_id == user.id, AssignmentWorker.is_active.is_(True))
        .first()
        is not None
    )


def _can_view_assignment(user, assignment):
    if user.role.name in ("ADMIN", "SUPER_ADMIN"):
        return True
    if user.role.name == "CLIENT":
        return assignment.client_id == user.id
    if user.role.name == "GIG_WORKER" or _is_active_worker(user):
        if assignment.worker_id == user.id:
            return True
        # Workers can browse open gigs to submit proposals (budget hidden in serializer).
        if assignment.status in ("Pending Review", "Open for Proposals", "Proposals Under Review"):
            return True
        # Worker can view gigs they already proposed on.
        existing = (
            db.session.query(GigProposal)
            .filter(GigProposal.assignment_id == assignment.id, GigProposal.worker_id == user.id)
            .first()
        )
        return existing is not None
    return False


@assignments_bp.route("/assignments", methods=["GET"])
@require_roles("CLIENT", "GIG_WORKER", "ADMIN", "SUPER_ADMIN")
def list_assignments():
    user = _current_user()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("perPage", 20, type=int)
    status = request.args.get("status")
    role_name = user.role.name

    query = _base_query()
    if role_name == "CLIENT":
        query = query.filter(Assignment.client_id == user.id)
    elif role_name == "GIG_WORKER" or (_is_active_worker(user) and role_name not in ("ADMIN", "SUPER_ADMIN")):
        open_statuses = ("Pending Review", "Open for Proposals", "Proposals Under Review")
        proposed_ids = (
            db.session.query(GigProposal.assignment_id)
            .filter(GigProposal.worker_id == user.id)
            .subquery()
        )
        query = query.filter(
            (Assignment.worker_id == user.id)
            | (Assignment.status.in_(open_statuses))
            | (Assignment.id.in_(proposed_ids))
        )
        if status:
            query = query.filter(Assignment.status == status)
    else:
        if status == "pending":
            query = query.filter(Assignment.status.in_(["Pending Review", "Open for Proposals", "Proposals Under Review"]))
        elif status:
            query = query.filter(Assignment.status == status)

    paginated = query.order_by(Assignment.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return ok(
        {
            "items": [_assignment_dict(item, viewer=user) for item in paginated.items],
            "total": paginated.total,
            "page": page,
            "pages": paginated.pages,
        }
    )


@assignments_bp.route("/assignments", methods=["POST"])
@require_roles("CLIENT")
def create_assignment():
    user = _current_user()
    data = request.get_json() or {}
    required = ["title", "category", "description", "budget", "deadline"]
    missing = [field for field in required if not data.get(field)]
    if missing:
        return fail(f"Missing required fields: {', '.join(missing)}", 400)
    try:
        budget = float(data.get("budget"))
        if budget <= 0:
            raise ValueError("budget must be greater than 0")
        deadline = _parse_deadline(data.get("deadline"))
        if deadline <= datetime.utcnow():
            raise ValueError("deadline must be in the future")
        priority = data.get("priority") or "Medium"
        if priority not in PRIORITIES:
            raise ValueError("priority must be Low, Medium, High, or Urgent")
        assignment = Assignment(
            title=data["title"].strip(),
            category=data["category"].strip(),
            description=data["description"].strip(),
            budget=budget,
            deadline=deadline,
            priority=priority,
            status="Open for Proposals",
            files=data.get("files") or [],
            client_id=user.id if user else None,
            client_name=(data.get("client_name") or "").strip() or (user.name if user else None),
            client_email=(data.get("client_email") or "").strip() or (user.email if user else None),
            client_phone=(data.get("client_phone") or "").strip() or None,
        )
        _event(assignment, user, "created", "Assignment submitted by client — open for worker proposals")
        db.session.add(assignment)
        db.session.flush()
        _notify_admins("New Assignment", f"New assignment submitted: {assignment.title}", assignment.id)
        db.session.commit()
        return ok(_assignment_dict(assignment, viewer=user), "created", 201)
    except ValueError as exc:
        db.session.rollback()
        return fail(str(exc), 400)


@assignments_bp.route("/public/assignments", methods=["POST"])
def create_public_assignment():
    data = request.get_json() or {}
    required = ["title", "category", "description", "budget", "deadline", "client_name", "client_email"]
    missing = [field for field in required if not data.get(field)]
    if missing:
        return fail(f"Missing required fields: {', '.join(missing)}", 400)
    try:
        budget = float(data.get("budget"))
        if budget <= 0:
            raise ValueError("budget must be greater than 0")
        deadline = _parse_deadline(data.get("deadline"))
        if deadline <= datetime.utcnow():
            raise ValueError("deadline must be in the future")
        priority = data.get("priority") or "Medium"
        if priority not in PRIORITIES:
            raise ValueError("priority must be Low, Medium, High, or Urgent")

        client_email = data["client_email"].strip()
        client_name = data["client_name"].strip()
        client_phone = (data.get("client_phone") or "").strip() or None

        # Check if user already exists with this email
        existing_user = db.session.query(User).filter_by(email=client_email).first()
        client_id = None
        is_new_user = False

        if existing_user:
            # Link assignment to existing user
            client_id = existing_user.id
        else:
            # Create new CLIENT user with temporary password
            from app.controllers.users import UserController
            from app.utils.auth import hash_password

            client_role = db.session.query(RoleType).filter_by(name="CLIENT").first()
            if not client_role:
                raise ValueError("CLIENT role not configured")

            account_phone = client_phone
            if account_phone:
                phone_exists = db.session.query(User).filter_by(phone_number=account_phone).first()
                if phone_exists:
                    account_phone = None

            temp_password = UserController._generate_password()
            new_user = User(
                email=client_email,
                password=hash_password(temp_password),
                name=client_name,
                role_id=client_role.id,
                phone_number=account_phone,
                is_user_active=True,
                must_change_password=True,
            )
            db.session.add(new_user)
            db.session.flush()
            client_id = new_user.id
            is_new_user = True

        assignment = Assignment(
            title=data["title"].strip(),
            category=data["category"].strip(),
            description=data["description"].strip(),
            budget=budget,
            deadline=deadline,
            priority=priority,
            status="Open for Proposals",
            files=data.get("files") or [],
            client_id=client_id,
            client_name=client_name,
            client_email=client_email,
            client_phone=client_phone,
        )
        db.session.add(assignment)
        db.session.flush()
        _notify_admins("New Assignment", f"New assignment submitted: {assignment.title}", assignment.id)
        db.session.commit()

        # Send welcome credentials email for new users
        if is_new_user:
            from flask import current_app
            login_url = current_app.config.get("FRONTEND_URL", "http://localhost:5173") + "/login"
            try:
                EmailService.send_welcome_credentials(
                    user_email=client_email,
                    user_name=client_name,
                    temp_password=temp_password,
                    login_url=login_url,
                )
            except Exception as email_err:
                import logging
                logging.getLogger(__name__).warning(f"Failed to send welcome credentials to {client_email}: {email_err}")

        return ok(_assignment_dict(assignment), "created", 201)
    except ValueError as exc:
        db.session.rollback()
        return fail(str(exc), 400)


@assignments_bp.route("/assignments/<uuid:assignment_id>", methods=["GET"])
@require_roles("CLIENT", "GIG_WORKER", "ADMIN", "SUPER_ADMIN")
def get_assignment(assignment_id):
    user = _current_user()
    assignment = _base_query().filter(Assignment.id == str(assignment_id)).first()
    if not assignment:
        return fail("assignment not found", 404)
    if not _can_view_assignment(user, assignment):
        return fail("forbidden", 403)
    return ok(_assignment_dict(assignment, viewer=user))


@assignments_bp.route("/assignments/<uuid:assignment_id>/proposals", methods=["GET"])
@require_roles("CLIENT", "GIG_WORKER", "ADMIN", "SUPER_ADMIN")
def list_proposals(assignment_id):
    user = _current_user()
    assignment = _base_query().filter(Assignment.id == str(assignment_id)).first()
    if not assignment:
        return fail("assignment not found", 404)
    if not _can_view_assignment(user, assignment):
        return fail("forbidden", 403)
    return ok(_assignment_dict(assignment, viewer=user).get("proposals") or [])


@assignments_bp.route("/assignments/<uuid:assignment_id>/proposals", methods=["POST"])
@require_roles("GIG_WORKER")
def submit_proposal(assignment_id):
    worker = _current_user()
    if not _is_active_worker(worker) and worker.role.name != "GIG_WORKER":
        return fail("only active gig workers can submit proposals", 403)
    data = request.get_json() or {}
    assignment = db.session.get(Assignment, str(assignment_id))
    if not assignment:
        return fail("assignment not found", 404)
    if assignment.status not in ("Pending Review", "Open for Proposals", "Proposals Under Review"):
        return fail("this assignment is not open for proposals", 400)
    cover_letter = (data.get("coverLetter") or data.get("cover_letter") or "").strip()
    if not cover_letter:
        return fail("coverLetter is required", 400)
    try:
        amount = float(data.get("proposedAmount") or data.get("proposed_amount") or 0)
        if amount <= 0:
            raise ValueError("proposedAmount must be greater than 0")
        estimated_days = data.get("estimatedDays") or data.get("estimated_days")
        if estimated_days is not None:
            estimated_days = int(estimated_days)
            if estimated_days < 1:
                raise ValueError("estimatedDays must be at least 1")
    except (TypeError, ValueError) as exc:
        return fail(str(exc), 400)

    existing = (
        db.session.query(GigProposal)
        .filter(GigProposal.assignment_id == assignment.id, GigProposal.worker_id == worker.id)
        .first()
    )
    if existing:
        return fail("you already submitted a proposal for this assignment", 400)

    proposal = GigProposal(
        assignment_id=assignment.id,
        worker_id=worker.id,
        proposed_amount=amount,
        cover_letter=cover_letter,
        estimated_days=estimated_days,
        status="Pending",
    )
    if assignment.status in ("Pending Review", "Open for Proposals"):
        assignment.status = "Proposals Under Review"
    _event(assignment, worker, "proposal_submitted", f"{worker.name} submitted a proposal")
    db.session.add(proposal)
    _notify_admins("New Proposal", f"New proposal on: {assignment.title}", assignment.id)
    db.session.commit()
    return ok(_proposal_dict(proposal), "created", 201)


@assignments_bp.route("/assignments/<uuid:assignment_id>/proposals/<uuid:proposal_id>/review", methods=["POST"])
@require_roles("ADMIN", "SUPER_ADMIN")
def review_proposal(assignment_id, proposal_id):
    admin = _current_user()
    data = request.get_json() or {}
    action = (data.get("action") or "").strip().lower()
    if action not in ("approve", "reject"):
        return fail("action must be approve or reject", 400)

    assignment = db.session.get(Assignment, str(assignment_id))
    proposal = db.session.get(GigProposal, str(proposal_id))
    if not assignment or not proposal or proposal.assignment_id != assignment.id:
        return fail("proposal not found", 404)
    if proposal.status not in ("Pending", "Approved"):
        return fail("only pending or approved proposals can be reviewed", 400)

    proposal.reviewed_by_id = admin.id
    proposal.reviewed_at = datetime.utcnow()
    proposal.admin_notes = data.get("adminNotes") or data.get("admin_notes") or proposal.admin_notes

    if action == "reject":
        reason = (data.get("rejectionReason") or data.get("rejection_reason") or "").strip()
        if not reason:
            return fail("rejectionReason is required when rejecting", 400)
        proposal.status = "Rejected"
        proposal.rejection_reason = reason
        _event(assignment, admin, "proposal_rejected", f"Proposal from {proposal.worker.name if proposal.worker else 'worker'} rejected")
        _notify(proposal.worker_id, "Proposal Rejected", f"Your proposal was rejected: {assignment.title}", assignment.id)
    else:
        adjust_type = (data.get("adjustType") or data.get("adjust_type") or "").strip().lower() or None
        adjust_value = data.get("adjustValue") if "adjustValue" in data else data.get("adjust_value")
        adjusted = proposal.proposed_amount
        if adjust_type:
            if adjust_type not in ("percentage", "amount"):
                return fail("adjustType must be percentage or amount", 400)
            try:
                adjust_value = float(adjust_value)
            except (TypeError, ValueError):
                return fail("adjustValue must be a number", 400)
            if adjust_type == "percentage":
                adjusted = round(proposal.proposed_amount * (1 + adjust_value / 100.0), 2)
            else:
                adjusted = round(proposal.proposed_amount + adjust_value, 2)
            if adjusted <= 0:
                return fail("adjusted amount must be greater than 0", 400)
            proposal.price_adjust_type = adjust_type
            proposal.price_adjust_value = adjust_value
            proposal.adjusted_amount = adjusted
        else:
            proposal.adjusted_amount = proposal.proposed_amount
            proposal.price_adjust_type = None
            proposal.price_adjust_value = None
        proposal.status = "Approved"
        _event(
            assignment,
            admin,
            "proposal_approved",
            f"Proposal from {proposal.worker.name if proposal.worker else 'worker'} approved at {_effective_proposal_amount(proposal)}",
        )
        _notify(proposal.worker_id, "Proposal Approved", f"Your proposal was approved: {assignment.title}", assignment.id)

    if assignment.status in ("Pending Review", "Open for Proposals"):
        assignment.status = "Proposals Under Review"
    db.session.commit()
    return ok(_proposal_dict(proposal))


@assignments_bp.route("/assignments/<uuid:assignment_id>/proposals/send-to-client", methods=["POST"])
@require_roles("ADMIN", "SUPER_ADMIN")
def send_proposals_to_client(assignment_id):
    admin = _current_user()
    data = request.get_json() or {}
    proposal_ids = data.get("proposalIds") or data.get("proposal_ids") or []
    if not isinstance(proposal_ids, list) or not proposal_ids:
        return fail("proposalIds is required", 400)

    assignment = _base_query().filter(Assignment.id == str(assignment_id)).first()
    if not assignment:
        return fail("assignment not found", 404)

    selected = (
        db.session.query(GigProposal)
        .filter(
            GigProposal.assignment_id == assignment.id,
            GigProposal.id.in_([str(pid) for pid in proposal_ids]),
            GigProposal.status == "Approved",
        )
        .all()
    )
    if not selected:
        return fail("no approved proposals found for the given ids", 400)
    if len(selected) != len(set(str(pid) for pid in proposal_ids)):
        return fail("all proposalIds must be approved proposals on this assignment", 400)

    now = datetime.utcnow()
    for proposal in selected:
        proposal.status = "Sent to Client"
        proposal.sent_to_client_at = now

    assignment.status = "Proposals Sent to Client"
    _event(assignment, admin, "proposals_sent", f"{len(selected)} proposal(s) sent to client")
    _notify(assignment.client_id, "Proposals Ready", f"Review worker proposals for: {assignment.title}", assignment.id)
    EmailService.send_proposals_ready(
        assignment.client_email or (assignment.client.email if assignment.client else ""),
        assignment.client_name or (assignment.client.name if assignment.client else "Client"),
        assignment.title,
        len(selected),
    )
    db.session.commit()
    return ok(_assignment_dict(assignment, viewer=admin))


@assignments_bp.route("/assignments/<uuid:assignment_id>/proposals/<uuid:proposal_id>/select", methods=["POST"])
@require_roles("CLIENT")
def client_select_proposal(assignment_id, proposal_id):
    client = _current_user()
    data = request.get_json() or {}
    assignment = db.session.get(Assignment, str(assignment_id))
    proposal = db.session.get(GigProposal, str(proposal_id))
    if not assignment or not proposal or proposal.assignment_id != assignment.id:
        return fail("proposal not found", 404)
    if assignment.client_id != client.id:
        return fail("forbidden", 403)
    if assignment.status != "Proposals Sent to Client":
        return fail("proposals are not awaiting client selection", 400)
    if proposal.status != "Sent to Client":
        return fail("only proposals sent to client can be selected", 400)

    amendment = (data.get("amendment") or data.get("clientAmendment") or data.get("client_amendment") or "").strip() or None
    now = datetime.utcnow()
    proposal.client_selected_at = now
    proposal.client_amendment = amendment
    proposal.status = "Client Amended" if amendment else "Client Selected"
    assignment.selected_proposal_id = proposal.id
    assignment.client_amendment_notes = amendment
    assignment.status = "Client Selected"
    _event(assignment, client, "proposal_selected", f"Client selected proposal from {proposal.worker.name if proposal.worker else 'worker'}")

    others = (
        db.session.query(GigProposal)
        .filter(
            GigProposal.assignment_id == assignment.id,
            GigProposal.id != proposal.id,
            GigProposal.status == "Sent to Client",
        )
        .all()
    )
    for other in others:
        other.status = "Lost"

    _notify_admins("Client Selected Proposal", f"Client selected a proposal for: {assignment.title}", assignment.id)
    _notify(proposal.worker_id, "Proposal Selected", f"Client selected your proposal: {assignment.title}", assignment.id)
    db.session.commit()
    return ok(_assignment_dict(assignment, viewer=client))


@assignments_bp.route("/assignments/<uuid:assignment_id>/negotiate", methods=["POST"])
@require_roles("ADMIN", "SUPER_ADMIN")
def negotiate_and_assign(assignment_id):
    admin = _current_user()
    data = request.get_json() or {}
    assignment = _base_query().filter(Assignment.id == str(assignment_id)).first()
    if not assignment:
        return fail("assignment not found", 404)
    if assignment.status not in ("Client Selected", "Negotiating"):
        return fail("assignment must be client-selected before final negotiation", 400)

    proposal_id = data.get("proposalId") or data.get("proposal_id") or assignment.selected_proposal_id
    if not proposal_id:
        return fail("proposalId is required", 400)
    proposal = db.session.get(GigProposal, str(proposal_id))
    if not proposal or proposal.assignment_id != assignment.id:
        return fail("proposal not found", 404)
    if proposal.status not in ("Client Selected", "Client Amended", "Won"):
        return fail("selected proposal is not eligible for final assignment", 400)

    try:
        final_price = float(data.get("finalPrice") if "finalPrice" in data else data.get("final_price"))
        if final_price <= 0:
            raise ValueError("finalPrice must be greater than 0")
    except (TypeError, ValueError) as exc:
        return fail(str(exc) if str(exc) else "finalPrice is required", 400)

    negotiation_notes = (data.get("negotiationNotes") or data.get("negotiation_notes") or "").strip() or None
    admin_notes = data.get("adminNotes") or data.get("admin_notes")

    proposal.final_amount = final_price
    proposal.status = "Won"
    assignment.final_price = final_price
    assignment.selected_proposal_id = proposal.id
    assignment.negotiation_notes = negotiation_notes
    assignment.worker_id = proposal.worker_id
    assignment.assigned_by_id = admin.id
    assignment.assigned_at = datetime.utcnow()
    assignment.admin_notes = admin_notes or assignment.admin_notes
    assignment.status = "Assigned"

    # Mark remaining non-won proposals as lost.
    others = (
        db.session.query(GigProposal)
        .filter(GigProposal.assignment_id == assignment.id, GigProposal.id != proposal.id, GigProposal.status != "Rejected")
        .all()
    )
    for other in others:
        if other.status not in ("Lost", "Rejected"):
            other.status = "Lost"

    _event(assignment, admin, "negotiated_assigned", f"Assigned to {proposal.worker.name if proposal.worker else 'worker'} at final price {final_price}")
    _notify(proposal.worker_id, "Gig Won", f"You won the gig at final price {final_price}: {assignment.title}", assignment.id)
    _notify(assignment.client_id, "Worker Assigned", f"Final price agreed and worker assigned: {assignment.title}", assignment.id)
    EmailService.send_gig_won(
        proposal.worker.email if proposal.worker else "",
        proposal.worker.name if proposal.worker else "Worker",
        assignment.title,
        final_price,
    )
    EmailService.send_worker_assigned(
        assignment.client_email or (assignment.client.email if assignment.client else ""),
        assignment.client_name or (assignment.client.name if assignment.client else "Client"),
        assignment.title,
        final_price,
    )
    db.session.commit()
    return ok(_assignment_dict(assignment, viewer=admin))


@assignments_bp.route("/assignments/<uuid:assignment_id>/messages", methods=["GET"])
@require_roles("CLIENT", "GIG_WORKER", "ADMIN", "SUPER_ADMIN")
def list_assignment_messages(assignment_id):
    user = _current_user()
    assignment = _base_query().filter(Assignment.id == str(assignment_id)).first()
    if not assignment:
        return fail("assignment not found", 404)
    if not _can_view_assignment(user, assignment):
        return fail("forbidden", 403)
    messages = sorted(assignment.messages, key=lambda message: message.created_at)
    return ok([_message_dict(message) for message in messages])


@assignments_bp.route("/assignments/<uuid:assignment_id>/messages", methods=["POST"])
@require_roles("CLIENT", "GIG_WORKER", "ADMIN", "SUPER_ADMIN")
def create_assignment_message(assignment_id):
    user = _current_user()
    data = request.get_json() or {}
    text = (data.get("message") or "").strip()
    if not text:
        return fail("message is required", 400)
    assignment = db.session.get(Assignment, str(assignment_id))
    if not assignment:
        return fail("assignment not found", 404)
    if not _can_view_assignment(user, assignment):
        return fail("forbidden", 403)
    message = AssignmentMessage(
        assignment_id=assignment.id,
        sender_id=user.id,
        message=text,
        visibility="PARTICIPANTS",
    )
    db.session.add(message)
    _event(assignment, user, "message", "Message added to assignment thread")
    recipient_ids = {assignment.client_id, assignment.worker_id}
    admin_ids = [admin.id for admin in db.session.query(User).join(RoleType, User.role_id == RoleType.id).filter(RoleType.name.in_(["ADMIN", "SUPER_ADMIN"])).all()]
    recipient_ids.update(admin_ids)
    recipient_ids.discard(user.id)
    recipient_ids.discard(None)
    for recipient_id in recipient_ids:
        _notify(recipient_id, "New Assignment Message", f"New message on: {assignment.title}", assignment.id)
    db.session.commit()
    return ok(_message_dict(message), "created", 201)


@assignments_bp.route("/assignments/<uuid:assignment_id>/assign", methods=["POST"])
@require_roles("ADMIN", "SUPER_ADMIN")
def assign_worker(assignment_id):
    admin = _current_user()
    data = request.get_json() or {}
    worker_id = data.get("workerId") or data.get("worker_id")
    if not worker_id:
        return fail("workerId is required", 400)
    assignment = db.session.get(Assignment, str(assignment_id))
    if not assignment:
        return fail("assignment not found", 404)
    worker = db.session.get(User, worker_id)
    if not worker or not worker.is_active:
        return fail("selected user must be an active user", 400)
    worker_entry = db.session.query(AssignmentWorker).filter(AssignmentWorker.user_id == worker.id, AssignmentWorker.is_active.is_(True)).first()
    if not worker_entry:
        return fail("selected user must be an active gig worker", 400)
    assignment.worker_id = worker.id
    assignment.assigned_by_id = admin.id
    assignment.assigned_at = datetime.utcnow()
    assignment.admin_notes = data.get("adminNotes") or data.get("admin_notes") or assignment.admin_notes
    assignment.status = "Assigned"
    _event(assignment, admin, "assigned", f"Assigned to {worker.name}")
    _notify(worker.id, "New Assignment Assigned", f"You have been assigned: {assignment.title}", assignment.id)
    _notify(assignment.client_id, "Assignment Assigned", f"Your assignment has been assigned for review by a worker: {assignment.title}", assignment.id)
    EmailService.send_assignment_notification(
        worker.email if worker else "",
        worker.name if worker else "Worker",
        "New Assignment Assigned",
        "New Assignment Assigned",
        "You have been assigned a new gig.",
        assignment.title,
    )
    EmailService.send_worker_assigned(
        assignment.client_email or (assignment.client.email if assignment.client else ""),
        assignment.client_name or (assignment.client.name if assignment.client else "Client"),
        assignment.title,
        assignment.budget,
    )
    db.session.commit()
    return ok(_assignment_dict(assignment, viewer=admin))


@assignments_bp.route("/assignments/<uuid:assignment_id>/accept", methods=["POST"])
@require_roles("GIG_WORKER")
def accept_assignment(assignment_id):
    worker = _current_user()
    assignment = db.session.get(Assignment, str(assignment_id))
    if not assignment or assignment.worker_id != worker.id:
        return fail("assignment not found", 404)
    if assignment.status not in ("Assigned", "Revision Needed"):
        return fail("only assigned or revision assignments can be accepted", 400)
    assignment.status = "In Progress"
    _event(assignment, worker, "accepted", "Worker accepted the assignment")
    _notify_admins("Worker Accepted", f"{worker.name} accepted: {assignment.title}", assignment.id)
    db.session.commit()
    return ok(_assignment_dict(assignment, viewer=worker))


@assignments_bp.route("/assignments/<uuid:assignment_id>/reject", methods=["POST"])
@require_roles("GIG_WORKER")
def reject_assignment(assignment_id):
    worker = _current_user()
    assignment = db.session.get(Assignment, str(assignment_id))
    if not assignment or assignment.worker_id != worker.id:
        return fail("assignment not found", 404)
    if assignment.status != "Assigned":
        return fail("only assigned assignments can be rejected", 400)
    assignment.status = "Pending Review"
    assignment.worker_id = None
    _event(assignment, worker, "rejected", "Worker rejected the assignment")
    _notify_admins("Worker Rejected", f"{worker.name} rejected: {assignment.title}", assignment.id)
    db.session.commit()
    return ok(_assignment_dict(assignment, viewer=worker))


@assignments_bp.route("/assignments/<uuid:assignment_id>/submit", methods=["POST"])
@require_roles("GIG_WORKER")
def submit_work(assignment_id):
    worker = _current_user()
    data = request.get_json() or {}
    assignment = db.session.get(Assignment, str(assignment_id))
    if not assignment or assignment.worker_id != worker.id:
        return fail("assignment not found", 404)
    if assignment.status not in ("In Progress", "Revision Needed"):
        return fail("assignment must be in progress or revision needed", 400)
    deliverable_file = data.get("deliverableFile") or data.get("deliverable_file")
    deliverable_link = data.get("deliverableLink") or data.get("deliverable_link")
    if not deliverable_file and not deliverable_link:
        return fail("deliverableFile or deliverableLink is required", 400)
    submission = Submission(
        assignment_id=assignment.id,
        worker_id=worker.id,
        deliverable_file=deliverable_file,
        deliverable_link=deliverable_link,
        submission_notes=data.get("submissionNotes") or data.get("submission_notes"),
    )
    assignment.status = "Submitted for Review"
    _event(assignment, worker, "submitted", "Worker submitted completed work")
    db.session.add(submission)
    _notify_admins("Assignment Submitted", f"Work submitted for review: {assignment.title}", assignment.id)
    db.session.commit()
    return ok(_assignment_dict(assignment, viewer=worker), "submitted", 201)


@assignments_bp.route("/assignments/<uuid:assignment_id>/review", methods=["POST"])
@require_roles("ADMIN", "SUPER_ADMIN")
def review_assignment(assignment_id):
    admin = _current_user()
    data = request.get_json() or {}
    action = data.get("action")
    assignment = db.session.get(Assignment, str(assignment_id))
    if not assignment:
        return fail("assignment not found", 404)
    if action not in ("approve", "revision", "reject"):
        return fail("action must be approve, revision, or reject", 400)
    assignment.reviewed_by_id = admin.id
    assignment.reviewed_at = datetime.utcnow()
    assignment.revision_notes = data.get("notes") or data.get("revisionNotes")
    if action == "approve":
        assignment.status = "Completed"
        event_message = "Admin approved completed work"
        _notify(assignment.client_id, "Assignment Complete", f"Your assignment has been completed: {assignment.title}", assignment.id)
        _notify(assignment.worker_id, "Assignment Complete", f"Your work was approved: {assignment.title}", assignment.id)
        EmailService.send_assignment_complete(
            assignment.client_email or (assignment.client.email if assignment.client else ""),
            assignment.client_name or (assignment.client.name if assignment.client else "Client"),
            assignment.title,
        )
        EmailService.send_assignment_notification(
            assignment.worker.email if assignment.worker else "",
            assignment.worker.name if assignment.worker else "Worker",
            "Assignment Complete",
            "Assignment Complete",
            "Your submitted work was approved.",
            assignment.title,
        )
    elif action == "revision":
        assignment.status = "Revision Needed"
        event_message = "Admin requested revisions"
        _notify(assignment.client_id, "Assignment Needs Revision", f"Revisions were requested for: {assignment.title}", assignment.id)
        _notify(assignment.worker_id, "Assignment Needs Revision", f"Please revise: {assignment.title}", assignment.id)
        EmailService.send_assignment_revision_needed(
            assignment.client_email or (assignment.client.email if assignment.client else ""),
            assignment.client_name or (assignment.client.name if assignment.client else "Client"),
            assignment.title,
        )
        EmailService.send_assignment_notification(
            assignment.worker.email if assignment.worker else "",
            assignment.worker.name if assignment.worker else "Worker",
            "Assignment Needs Revision",
            "Assignment Needs Revision",
            "Please revise and resubmit your work.",
            assignment.title,
        )
    else:
        assignment.status = "Rejected"
        event_message = "Admin rejected the assignment"
        _notify(assignment.client_id, "Assignment Rejected", f"Your assignment was rejected: {assignment.title}", assignment.id)
        _notify(assignment.worker_id, "Assignment Rejected", f"Assignment rejected: {assignment.title}", assignment.id)
        EmailService.send_assignment_rejected(
            assignment.client_email or (assignment.client.email if assignment.client else ""),
            assignment.client_name or (assignment.client.name if assignment.client else "Client"),
            assignment.title,
        )
        EmailService.send_assignment_notification(
            assignment.worker.email if assignment.worker else "",
            assignment.worker.name if assignment.worker else "Worker",
            "Assignment Rejected",
            "Assignment Rejected",
            "This assignment was rejected by admin.",
            assignment.title,
        )
    _event(assignment, admin, action, event_message)
    db.session.commit()
    return ok(_assignment_dict(assignment, viewer=admin))


@assignments_bp.route("/assignment-workers", methods=["GET"])
@require_roles("ADMIN", "SUPER_ADMIN")
def list_workers():
    workers = (
        db.session.query(User)
        .join(AssignmentWorker, AssignmentWorker.user_id == User.id)
        .filter(AssignmentWorker.is_active.is_(True), User.is_user_active.is_(True))
        .order_by(User.name.asc())
        .all()
    )
    return ok([_safe_user(worker) for worker in workers])


@assignments_bp.route("/assignment-workers", methods=["POST"])
@require_roles("ADMIN", "SUPER_ADMIN")
def create_worker():
    data = request.get_json() or {}
    user_id = data.get("userId") or data.get("user_id")
    if not user_id:
        return fail("userId is required", 400)
    user = db.session.get(User, str(user_id))
    if not user:
        return fail("user not found", 404)
    existing = db.session.query(AssignmentWorker).filter(AssignmentWorker.user_id == user.id).first()
    if existing:
        return fail("user is already a gig worker", 400)
    worker = AssignmentWorker(user_id=user.id, is_active=True)
    db.session.add(worker)
    db.session.commit()
    return ok(_safe_user(user), "created", 201)


@assignments_bp.route("/assignment-workers/<uuid:worker_id>", methods=["DELETE"])
@require_roles("ADMIN", "SUPER_ADMIN")
def delete_worker(worker_id):
    worker = db.session.get(AssignmentWorker, str(worker_id))
    if not worker:
        return fail("gig worker not found", 404)
    db.session.delete(worker)
    db.session.commit()
    return ok(None, "deleted", 204)


@assignments_bp.route("/assignment-workers/<uuid:worker_id>/status", methods=["PUT"])
@require_roles("ADMIN", "SUPER_ADMIN")
def update_worker_status(worker_id):
    data = request.get_json() or {}
    worker = db.session.get(AssignmentWorker, str(worker_id))
    if not worker:
        return fail("gig worker not found", 404)
    if "isActive" not in data and "is_user_active" not in data:
        return fail("isActive is required", 400)
    worker.is_active = bool(data.get("isActive", data.get("is_user_active")))
    db.session.commit()
    return ok(_safe_user(worker.user))


@assignments_bp.route("/assignment-reports/overview", methods=["GET"])
@require_roles("ADMIN", "SUPER_ADMIN")
def assignment_report_overview():
    user = _current_user()
    status_rows = (
        db.session.query(Assignment.status, func.count(Assignment.id))
        .group_by(Assignment.status)
        .all()
    )
    priority_rows = (
        db.session.query(Assignment.priority, func.count(Assignment.id))
        .group_by(Assignment.priority)
        .all()
    )
    total_budget = db.session.query(func.sum(Assignment.budget)).scalar() or 0
    completed_budget = (
        db.session.query(func.sum(func.coalesce(Assignment.final_price, Assignment.budget)))
        .filter(Assignment.status == "Completed")
        .scalar()
        or 0
    )
    submitted_count = db.session.query(func.count(Submission.id)).scalar() or 0
    total_count = db.session.query(func.count(Assignment.id)).scalar() or 0
    completed_count = db.session.query(func.count(Assignment.id)).filter(Assignment.status == "Completed").scalar() or 0

    urgent = (
        _base_query()
        .filter(
            Assignment.status.in_(
                [
                    "Pending Review",
                    "Open for Proposals",
                    "Proposals Under Review",
                    "Proposals Sent to Client",
                    "Client Selected",
                    "Assigned",
                    "In Progress",
                    "Revision Needed",
                ]
            ),
            Assignment.priority.in_(["High", "Urgent"]),
        )
        .order_by(Assignment.deadline.asc())
        .limit(5)
        .all()
    )

    return ok(
        {
            "total": total_count,
            "completed": completed_count,
            "completionRate": round((completed_count / total_count) * 100, 2) if total_count else 0,
            "submittedCount": submitted_count,
            "totalBudget": float(total_budget),
            "completedBudget": float(completed_budget),
            "byStatus": {status: count for status, count in status_rows},
            "byPriority": {priority: count for priority, count in priority_rows},
            "urgent": [_assignment_dict(item, viewer=user) for item in urgent],
        }
    )


@assignments_bp.route("/assignment-reports/worker-earnings", methods=["GET"])
@require_roles("GIG_WORKER", "ADMIN", "SUPER_ADMIN")
def worker_earnings_report():
    user = _current_user()
    query = (
        db.session.query(
            User.id.label("worker_id"),
            User.name.label("worker_name"),
            User.email.label("worker_email"),
            func.count(Assignment.id).label("assigned_count"),
            func.sum(case((Assignment.status == "Completed", 1), else_=0)).label("completed_count"),
            func.sum(
                case(
                    (Assignment.status == "Completed", func.coalesce(Assignment.final_price, Assignment.budget)),
                    else_=0,
                )
            ).label("earned"),
        )
        .join(Assignment, Assignment.worker_id == User.id)
        .join(AssignmentWorker, AssignmentWorker.user_id == User.id)
        .filter(AssignmentWorker.is_active.is_(True))
        .group_by(User.id, User.name, User.email)
    )
    if user.role.name == "GIG_WORKER":
        query = query.filter(User.id == user.id)
    else:
        worker = (
            db.session.query(AssignmentWorker)
            .filter(AssignmentWorker.user_id == user.id, AssignmentWorker.is_active.is_(True))
            .first()
        )
        if worker:
            query = query.filter(User.id == user.id)
    rows = query.order_by(
        func.sum(
            case(
                (Assignment.status == "Completed", func.coalesce(Assignment.final_price, Assignment.budget)),
                else_=0,
            )
        ).desc()
    ).all()
    return ok(
        [
            {
                "workerId": row.worker_id,
                "workerName": row.worker_name,
                "workerEmail": row.worker_email,
                "assignedCount": int(row.assigned_count or 0),
                "completedCount": int(row.completed_count or 0),
                "earned": float(row.earned or 0),
            }
            for row in rows
        ]
    )


@assignments_bp.route("/assignment-reports/export.csv", methods=["GET"])
@require_roles("ADMIN", "SUPER_ADMIN")
def export_assignments_csv():
    rows = []
    assignments = _base_query().order_by(Assignment.created_at.desc()).all()
    for item in assignments:
        rows.append(
            {
                "id": item.id,
                "title": item.title,
                "category": item.category,
                "status": item.status,
                "priority": item.priority,
                "budget": item.budget,
                "deadline": item.deadline.isoformat() if item.deadline else "",
                "client": item.client.name if item.client else "",
                "client_email": item.client.email if item.client else "",
                "worker": item.worker.name if item.worker else "",
                "worker_email": item.worker.email if item.worker else "",
                "created_at": item.created_at.isoformat() if item.created_at else "",
                "completed_at": item.reviewed_at.isoformat() if item.status == "Completed" and item.reviewed_at else "",
            }
        )
    return _csv_response(
        "assignment-report.csv",
        rows,
        ["id", "title", "category", "status", "priority", "budget", "deadline", "client", "client_email", "worker", "worker_email", "created_at", "completed_at"],
    )


@assignments_bp.route("/assignments/<uuid:assignment_id>/invoice", methods=["GET"])
@require_roles("CLIENT", "ADMIN", "SUPER_ADMIN")
def download_assignment_invoice(assignment_id):
    user = _current_user()
    assignment = _base_query().filter(Assignment.id == str(assignment_id)).first()
    if not assignment:
        return fail("assignment not found", 404)
    if user.role.name == "CLIENT" and assignment.client_id != user.id:
        return fail("forbidden", 403)
    if assignment.status != "Completed":
        return fail("invoice is available only for completed assignments", 400)

    invoice_number = f"INV-{assignment.created_at.strftime('%Y%m%d') if assignment.created_at else datetime.utcnow().strftime('%Y%m%d')}-{assignment.id[:8].upper()}"
    content = "\n".join(
        [
            "BitsHustle Managed Gig Service",
            "Assignment Invoice",
            "=" * 34,
            f"Invoice Number: {invoice_number}",
            f"Assignment ID: {assignment.id}",
            f"Title: {assignment.title}",
            f"Category: {assignment.category}",
            f"Client: {assignment.client.name if assignment.client else ''}",
            f"Client Email: {assignment.client.email if assignment.client else ''}",
            f"Worker: {assignment.worker.name if assignment.worker else ''}",
            f"Status: {assignment.status}",
            f"Completed At: {assignment.reviewed_at.isoformat() if assignment.reviewed_at else ''}",
            "-" * 34,
            f"Assignment Budget: ${assignment.budget:,.2f}",
            "Payment Status: Pending/External",
            "-" * 34,
            "Note: This invoice summarizes completed managed assignment work. Payment processing is external unless enabled separately.",
        ]
    )
    return _text_response(f"{invoice_number}.txt", content)

