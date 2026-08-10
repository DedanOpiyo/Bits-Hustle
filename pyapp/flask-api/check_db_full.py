import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "check_db_out.txt"), "w") as f:
    try:
        f.write("importing...\n")
        from app.factory import create_app
        f.write("creating app...\n")
        app = create_app()
        f.write("app created\n")
        with app.app_context():
            f.write("in app context\n")
            from sqlalchemy import text
            from app.extensions import db
            engine = db.engine
            f.write("got engine\n")
            tables_to_check = [
                "check_ins", "leads", "referrals", "task_submissions", "payout_requests", 
                "transactions", "appeals", "announcements", "learning_resources"
            ]
            for table in tables_to_check:
                f.write(f"\n=== {table} columns ===\n")
                try:
                    with engine.connect() as conn:
                        result = conn.execute(text(f"SHOW COLUMNS FROM {table}"))
                        for row in result:
                            f.write(str(row) + "\n")
                except Exception as e:
                    f.write(f"ERROR: {e}\n")
            f.write("done\n")
    except Exception as e:
        f.write(f"ERROR: {e}\n")
        import traceback; traceback.print_exc(file=f)