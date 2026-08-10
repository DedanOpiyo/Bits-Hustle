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
            with engine.connect() as conn:
                result = conn.execute(text("SHOW COLUMNS FROM referrals"))
                f.write("=== referrals columns ===\n")
                for row in result:
                    f.write(str(row) + "\n")
                f.write("\n=== appeals columns ===\n")
                result = conn.execute(text("SHOW COLUMNS FROM appeals"))
                for row in result:
                    f.write(str(row) + "\n")
            f.write("done\n")
    except Exception as e:
        f.write(f"ERROR: {e}\n")
        import traceback; traceback.print_exc(file=f)
