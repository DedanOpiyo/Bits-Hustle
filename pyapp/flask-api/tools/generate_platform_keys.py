"""Generate API keys for all platforms. Run after seeding platforms."""
import uuid
import hashlib
from app.factory import create_app
from app.extensions import db
from app.models import PlatformType, PlatformApiKey

app = create_app()

with app.app_context():
    platforms = PlatformType.query.all()
    
    if not platforms:
        print("No platforms found. Run seed.py first.")
        exit(1)
    
    print("Generating API keys for platforms...\n")
    
    for platform in platforms:
        # Check if key already exists
        existing = PlatformApiKey.query.filter_by(platform_id=platform.id).first()
        if existing:
            print(f"  {platform.display_name}: Key already exists (prefix: {existing.key_prefix}...)")
            continue
        
        # Generate key
        raw = str(uuid.uuid4())
        key_hash = hashlib.sha256(raw.encode()).hexdigest()
        key_prefix = raw[:8]
        key_str = f"b2h_{raw}"
        
        api_key = PlatformApiKey(
            platform_id=platform.id,
            name=f"{platform.display_name} Integration Key",
            key_hash=key_hash,
            key_prefix=key_prefix,
        )
        db.session.add(api_key)
        db.session.commit()
        
        print(f"  {platform.display_name}: {key_str}")
    
    print(f"\nTotal keys created: {PlatformApiKey.query.count()}")