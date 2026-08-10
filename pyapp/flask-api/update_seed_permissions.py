"""Update seed script — adds missing permissions and role-permission links."""

import os
import sys

# Add the parent directory to the path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.factory import create_app
from app.extensions import db
from app.models import RoleType, Permission, RolePermission
from app.services.role_permission_service import RolePermissionService

def update_seed():
    app = create_app()
    with app.app_context():
        print("=" * 60)
        print("Updating permissions and role-permission links...")
        print("=" * 60)

        # Ensure all roles exist
        print("\n1. Ensuring roles exist...")
        role_data = [
            ("SUPER_ADMIN", "Super Admin", "Full system access"),
            ("HUB_MANAGER", "Hub Manager", "Manages a hub and its ambassadors"),
            ("AMBASSADOR", "Ambassador", "Earn rewards via campaigns"),
            ("FINANCE_OFFICER", "Finance Officer", "Manages payouts & finance"),
            ("SUPPORT_OFFICER", "Support Officer", "Handles support tickets"),
            ("PARTNER_ADVERTISER", "Partner Advertiser", "Creates and manages campaigns"),
        ]
        for name, display, desc in role_data:
            r = RoleType.query.filter_by(name=name).first()
            if not r:
                r = RoleType(name=name, display_name=display, description=desc)
                db.session.add(r)
                print(f"  + Created role: {name}")
            else:
                r.display_name = display
                r.description = desc
        db.session.commit()

        # Ensure all permissions exist
        print("\n2. Creating missing permissions...")
        permissions_created = 0
        all_perms = set()
        for role_name, perm_list in RolePermissionService.PERMISSIONS.items():
            for perm_name in perm_list:
                all_perms.add(perm_name)
                resource, action = perm_name.split(":")
                perm = Permission.query.filter_by(name=perm_name).first()
                if not perm:
                    desc = f"{action.replace('_', ' ').title()} {resource.replace('_', ' ')}"
                    perm = Permission(name=perm_name, description=desc, resource=resource, action=action)
                    db.session.add(perm)
                    permissions_created += 1
                    print(f"  + Created permission: {perm_name}")
        db.session.commit()
        print(f"  Total permissions: {len(all_perms)} (created: {permissions_created})")

        # Link permissions to roles
        print("\n3. Linking permissions to roles...")
        role_perms_created = 0
        role_perms_removed = 0
        for role_name, perm_list in RolePermissionService.PERMISSIONS.items():
            role = RoleType.query.filter_by(name=role_name).first()
            if not role:
                print(f"  Warning: Role {role_name} not found, skipping")
                continue

            # Get current role permissions
            current_role_perms = RolePermission.query.filter_by(role_id=role.id).all()
            current_perm_ids = set(rp.permission_id for rp in current_role_perms)

            # Get expected permission ids
            expected_perms = Permission.query.filter(Permission.name.in_(perm_list)).all()
            expected_perm_ids = set(p.id for p in expected_perms)

            # Add missing links
            for p in expected_perms:
                if p.id not in current_perm_ids:
                    rp = RolePermission(role_id=role.id, permission_id=p.id)
                    db.session.add(rp)
                    role_perms_created += 1

            # Remove revoked links (permissions no longer assigned to this role)
            for rp in current_role_perms:
                if rp.permission_id not in expected_perm_ids:
                    db.session.delete(rp)
                    role_perms_removed += 1

            print(f"  {role_name}: {len(expected_perm_ids)} permissions (added: {role_perms_created - role_perms_removed}, removed: {role_perms_removed})")

        db.session.commit()

        # Summary
        print("\n" + "=" * 60)
        print("Update Summary")
        print("=" * 60)
        for role_name, perm_list in sorted(RolePermissionService.PERMISSIONS.items()):
            role = RoleType.query.filter_by(name=role_name).first()
            if role:
                count = RolePermission.query.filter_by(role_id=role.id).count()
                print(f"  {role_name}: {count} permissions")
                # Print a sample of permissions
                sample = sorted(perm_list)[:5]
                print(f"    Sample: {', '.join(sample)}{'...' if len(perm_list) > 5 else ''}")

        print(f"\n  Total unique permissions: {len(all_perms)}")
        print(f"  Permissions created: {permissions_created}")
        print(f"  Role-permission links added: {role_perms_created}")
        print(f"  Role-permission links removed: {role_perms_removed}")
        print("\nDone!")

if __name__ == "__main__":
    update_seed()
