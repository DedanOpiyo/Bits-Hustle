import uuid
from app.extensions import db
from app.models import PlatformType


class ReportController:
    @staticmethod
    def export_csv(db, model_type, platform_id=None):
        from app.utils.serializers import to_dict
        model_map = {
            "users": ("User", None),
            "ambassadors": ("Ambassador", None),
            "campaigns": ("Campaign", None),
            "leads": ("Lead", "platform_id"),
            "payout_requests": ("PayoutRequest", "platform_id"),
            "referrals": ("Referral", "platform_id"),
            "tasks": ("Task", "platform_id"),
        }
        entry = model_map.get(model_type)
        if not entry:
            raise ValueError("unsupported model type")
        model_name, platform_field = entry
        from app.models import User, Ambassador, Campaign, Lead, PayoutRequest, Referral, Task
        model = {
            "User": User, 
            "Ambassador": Ambassador, 
            "Campaign": Campaign, 
            "Lead": Lead, 
            "PayoutRequest": PayoutRequest,
            "Referral": Referral,
            "Task": Task
        }[model_name]
        
        # Build query
        query = db.session.query(model)
        
        # Apply platform filter if platform_id is provided and model supports it
        if platform_id is not None and platform_field is not None:
            query = query.filter(getattr(model, platform_field) == platform_id)
        
        items = query.all()
        rows = [to_dict(i) for i in items]
        if not rows:
            return dict(columns=[], rows=[])
        
        # For models that have platform_id, add platform name column
        if platform_field is not None:
            # Fetch all platform types to create a map
            platforms = db.session.query(PlatformType).all()
            platform_map = {p.id: p.display_name for p in platforms}
            # Add platform column to each row
            for row in rows:
                platform_id_val = row.get("platform_id")
                row["platform"] = platform_map.get(platform_id_val, "") if platform_id_val else ""
        
        columns = list(rows[0].keys())
        return dict(columns=columns, rows=rows)

    @staticmethod
    def export_excel(db, model_type, platform_id=None):
        from app.utils.serializers import to_dict
        model_map = {
            "users": ("User", None),
            "ambassadors": ("Ambassador", None),
            "campaigns": ("Campaign", None),
            "leads": ("Lead", "platform_id"),
            "payout_requests": ("PayoutRequest", "platform_id"),
            "referrals": ("Referral", "platform_id"),
            "tasks": ("Task", "platform_id"),
        }
        entry = model_map.get(model_type)
        if not entry:
            raise ValueError("unsupported model type")
        model_name, platform_field = entry
        from app.models import User, Ambassador, Campaign, Lead, PayoutRequest, Referral, Task
        model = {
            "User": User,
            "Ambassador": Ambassador,
            "Campaign": Campaign,
            "Lead": Lead,
            "PayoutRequest": PayoutRequest,
            "Referral": Referral,
            "Task": Task
        }[model_name]

        # Build query
        query = db.session.query(model)

        # Apply platform filter if platform_id is provided and model supports it
        if platform_id is not None and platform_field is not None:
            query = query.filter(getattr(model, platform_field) == platform_id)

        items = query.all()
        rows = [to_dict(i) for i in items]

        # For models that have platform_id, add platform name column
        if platform_field is not None:
            platforms = db.session.query(PlatformType).all()
            platform_map = {p.id: p.display_name for p in platforms}
            for row in rows:
                platform_id_val = row.get("platform_id")
                row["platform"] = platform_map.get(platform_id_val, "") if platform_id_val else ""

        return dict(columns=list(rows[0].keys()) if rows else [], rows=rows)

    @staticmethod
    def export_pdf(db, model_type, platform_id=None):
        from app.utils.serializers import to_dict
        model_map = {
            "users": ("User", None),
            "ambassadors": ("Ambassador", None),
            "campaigns": ("Campaign", None),
            "leads": ("Lead", "platform_id"),
            "payout_requests": ("PayoutRequest", "platform_id"),
            "referrals": ("Referral", "platform_id"),
            "tasks": ("Task", "platform_id"),
        }
        entry = model_map.get(model_type)
        if not entry:
            raise ValueError("unsupported model type")
        model_name, platform_field = entry
        from app.models import User, Ambassador, Campaign, Lead, PayoutRequest, Referral, Task
        model = {
            "User": User,
            "Ambassador": Ambassador,
            "Campaign": Campaign,
            "Lead": Lead,
            "PayoutRequest": PayoutRequest,
            "Referral": Referral,
            "Task": Task
        }[model_name]

        # Build query with platform filter
        query = db.session.query(model)
        if platform_id is not None and platform_field is not None:
            query = query.filter(getattr(model, platform_field) == platform_id)
        items = query.all()

        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet
        except ImportError:
            raise ValueError("reportlab not installed — run pip install reportlab")

        import io
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        elements = []
        elements.append(Paragraph(f"Report: {model_type}", styles["Title"]))
        elements.append(Spacer(1, 12))
        rows = [to_dict(r) for r in items]

        # Add platform name for models that have platform_id
        if platform_field is not None and rows:
            platforms = db.session.query(PlatformType).all()
            platform_map = {p.id: p.display_name for p in platforms}
            for row in rows:
                platform_id_val = row.get("platform_id")
                row["platform"] = platform_map.get(platform_id_val, "") if platform_id_val else ""

        if rows:
            headers = list(rows[0].keys())
            table_data = [headers] + [[str(v) if v is not None else "" for v in row.values()] for row in rows]
            t = Table(table_data)
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
            ]))
            elements.append(t)
        doc.build(elements)
        buffer.seek(0)
        return buffer

