"""Report export (CSV / Excel / PDF)."""

from flask import Blueprint, Response, request
from io import StringIO, BytesIO
import csv

from app.extensions import db
from app.utils.responses import fail
from app.middleware.auth import require_roles

reports_bp = Blueprint("reports", __name__)
from app.controllers.reports import ReportController


@reports_bp.route("/reports/export/csv", methods=["GET"])
@require_roles("SUPER_ADMIN", "FINANCE_OFFICER", "HUB_MANAGER")
def export_csv():
    model_type = request.args.get("modelType", "users")
    platform_id = request.args.get("platform_id") or None
    si = StringIO()
    writer = csv.writer(si)
    
    # Get data from controller with platform filtering
    result = ReportController.export_csv(db, model_type, platform_id=platform_id)
    if not result.get("rows"):
        # If no data, write headers only
        writer.writerow(result.get("columns", []))
    else:
        # Write headers
        writer.writerow(result["columns"])
        # Write rows
        for row in result["rows"]:
            writer.writerow([row.get(col, "") for col in result["columns"]])
    
    output = si.getvalue()
    return Response(output, mimetype="text/csv",
                    headers={"Content-Disposition": "attachment;filename=report.csv"})


@reports_bp.route("/reports/export/excel", methods=["GET"])
@require_roles("SUPER_ADMIN", "FINANCE_OFFICER", "HUB_MANAGER")
def export_excel():
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    model_type = request.args.get("modelType", "users")
    platform_id = request.args.get("platform_id") or None

    result = ReportController.export_csv(db, model_type, platform_id=platform_id)
    wb = Workbook()
    ws = wb.active
    ws.title = model_type.title()

    # Header styling
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_align = Alignment(horizontal="center", vertical="center")
    thin_border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin"),
    )

    # Write headers
    columns = result.get("columns", [])
    for col_idx, col_name in enumerate(columns, 1):
        cell = ws.cell(row=1, column=col_idx, value=col_name)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align
        cell.border = thin_border

    # Write data rows
    rows = result.get("rows", [])
    for row_idx, row_data in enumerate(rows, 2):
        for col_idx, col_name in enumerate(columns, 1):
            value = row_data.get(col_name, "")
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.border = thin_border
            if col_idx == 1:
                cell.font = Font(bold=True)

    # Auto-fit column widths
    for col_idx in range(1, len(columns) + 1):
        max_length = 0
        column_letter = get_column_letter(col_idx)
        for row in ws.iter_rows(min_col=col_idx, max_col=col_idx):
            for cell in row:
                if cell.value:
                    max_length = max(max_length, len(str(cell.value)))
        ws.column_dimensions[column_letter].width = min(max_length + 2, 40)

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return Response(buf.getvalue(), mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f"attachment;filename=report_{model_type}.xlsx"})


@reports_bp.route("/reports/export/pdf", methods=["GET"])
@require_roles("SUPER_ADMIN", "FINANCE_OFFICER", "HUB_MANAGER")
def export_pdf():
    model_type = request.args.get("modelType", "users")
    platform_id = request.args.get("platform_id") or None
    try:
        buf = ReportController.export_pdf(db, model_type, platform_id=platform_id)
        return Response(buf.getvalue(), mimetype="application/pdf",
                        headers={"Content-Disposition": f"attachment;filename=report_{model_type}.pdf"})
    except ValueError as e:
        return fail(str(e), 400)

