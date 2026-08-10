import sys
sys.path.insert(0, r'D:\nzuki2025\bitshustle\pyapp\flask-api')
from seed import seed
from app.factory import create_app
app = create_app()
with app.app_context():
    seed()
    import importlib
    from app.models import TaskTypeType, TaskStatusType, PayoutStatusType, Badge, UserSetting
    print()
    print(f"TaskTypeTypes:    {TaskTypeType.query.count()} rows  (expect 10)")
    print(f"TaskStatusTypes:  {TaskStatusType.query.count()} rows  (expect 7)")
    print(f"PayoutStatusTypes:{PayoutStatusType.query.count()} rows  (expect 7)")
    print(f"Badges:           {Badge.query.count()} rows  (expect 10)")
    print(f"UserSettings:     {UserSetting.query.count()} rows  (expect 7)")
