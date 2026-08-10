import sys; sys.path.insert(0, r"D:\nzuki2025\bitshustle\pyapp\flask-api"); from app.factory import create_app; from flask_migrate import upgrade; app = create_app(); 
with app.app_context():
    try:
        upgrade()
        print("Migration applied successfully")
    except Exception as e:
        print(f"Error: {e}")
        import traceback; traceback.print_exc()
