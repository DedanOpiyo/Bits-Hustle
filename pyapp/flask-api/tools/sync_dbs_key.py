import hashlib, uuid
from app.factory import create_app
from app.extensions import db
from app.models import PlatformType, PlatformApiKey

app = create_app()
with app.app_context():
    pt = PlatformType.query.filter_by(name='BITS_DADS_BOOKSHELVES').first()
    if not pt:
        print('Platform not found')
        exit(1)
    
    raw = str(uuid.uuid4())
    kh = hashlib.sha256(raw.encode()).hexdigest()
    prefix = raw[:8]
    key_str = f'b2h_{raw}'
    
    k = PlatformApiKey(
        platform_id=pt.id,
        name='DBS Integration Key',
        key_hash=kh,
        key_prefix=prefix,
        scopes=['actions:create', 'rates:create', 'rates:update'],
    )
    db.session.add(k)
    db.session.commit()
    
    print(f'New key: {key_str}')
    print(f'Hash: {kh}')
    print(f'Prefix: {prefix}')
    print(f'Platform ID: {pt.id}')
