"""Standard JSON response helpers."""

from flask import jsonify


def ok(data=None, message="success", code=200):
    return jsonify({"success": True, "message": message, "data": data}), code


def fail(message="error", code=400, details=None):
    body = {"success": False, "message": message}
    if details:
        body["details"] = details
    return jsonify(body), code

