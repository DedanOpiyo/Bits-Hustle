"""Authenticated file upload routes."""

import os
import uuid
from flask import Blueprint, current_app, request, send_from_directory
from werkzeug.utils import secure_filename
from app.middleware.auth import any_authenticated
from app.utils.responses import ok, fail

uploads_bp = Blueprint("uploads", __name__)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "pdf", "doc", "docx"}
ASSIGNMENT_EXTENSIONS = ALLOWED_EXTENSIONS | {"zip", "gif", "bmp", "svg", "psd", "ai", "txt", "xlsx", "pptx"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_ASSIGNMENT_UPLOAD_BYTES = 20 * 1024 * 1024


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _allowed_assignment_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ASSIGNMENT_EXTENSIONS


def _save_upload(file, folder: str, max_bytes: int, allowed_checker):
    if not file or not file.filename:
        raise ValueError("file required")
    if not allowed_checker(file.filename):
        raise ValueError("unsupported file type")

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > max_bytes:
        raise ValueError(f"file too large; max {max_bytes // (1024 * 1024)}MB")

    original_name = secure_filename(file.filename)
    extension = original_name.rsplit(".", 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{extension}"

    upload_root = current_app.config.get(
        "UPLOAD_FOLDER",
        os.path.join(current_app.instance_path, "uploads"),
    )
    target_dir = os.path.join(upload_root, folder)
    os.makedirs(target_dir, exist_ok=True)
    file.save(os.path.join(target_dir, filename))
    return {
        "url": f"/api/uploads/{folder}/{filename}",
        "filename": filename,
        "original_filename": original_name,
        "size": size,
    }


@uploads_bp.route("/uploads/task-proof", methods=["POST"])
@any_authenticated
def upload_task_proof():
    file = request.files.get("file")
    try:
        return ok(_save_upload(file, "task-proof", MAX_UPLOAD_BYTES, _allowed_file), "uploaded", 201)
    except ValueError as exc:
        return fail(str(exc), 400)


@uploads_bp.route("/uploads/assignment-brief", methods=["POST"])
@any_authenticated
def upload_assignment_brief():
    file = request.files.get("file")
    try:
        return ok(_save_upload(file, "assignment-briefs", MAX_ASSIGNMENT_UPLOAD_BYTES, _allowed_assignment_file), "uploaded", 201)
    except ValueError as exc:
        return fail(str(exc), 400)


@uploads_bp.route("/uploads/assignment-deliverable", methods=["POST"])
@any_authenticated
def upload_assignment_deliverable():
    file = request.files.get("file")
    try:
        return ok(_save_upload(file, "assignment-deliverables", MAX_ASSIGNMENT_UPLOAD_BYTES, _allowed_assignment_file), "uploaded", 201)
    except ValueError as exc:
        return fail(str(exc), 400)


@uploads_bp.route("/uploads/task-proof/<filename>", methods=["GET"])
@any_authenticated
def get_task_proof(filename: str):
    safe_name = secure_filename(filename)
    upload_root = current_app.config.get(
        "UPLOAD_FOLDER",
        os.path.join(current_app.instance_path, "uploads"),
    )
    task_proof_dir = os.path.join(upload_root, "task-proof")
    return send_from_directory(task_proof_dir, safe_name)


@uploads_bp.route("/uploads/assignment-briefs/<filename>", methods=["GET"])
@any_authenticated
def get_assignment_brief(filename: str):
    safe_name = secure_filename(filename)
    upload_root = current_app.config.get(
        "UPLOAD_FOLDER",
        os.path.join(current_app.instance_path, "uploads"),
    )
    return send_from_directory(os.path.join(upload_root, "assignment-briefs"), safe_name)


@uploads_bp.route("/uploads/assignment-deliverables/<filename>", methods=["GET"])
@any_authenticated
def get_assignment_deliverable(filename: str):
    safe_name = secure_filename(filename)
    upload_root = current_app.config.get(
        "UPLOAD_FOLDER",
        os.path.join(current_app.instance_path, "uploads"),
    )
    return send_from_directory(os.path.join(upload_root, "assignment-deliverables"), safe_name)

