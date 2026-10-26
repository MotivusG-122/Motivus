import getpass
from sqlalchemy import text
from app.database import engine
from app.auth import password_hash

email = input("Admin email: ").strip().lower()
new_password = getpass.getpass("New admin password: ")
confirm_password = getpass.getpass("Confirm new password: ")

if new_password != confirm_password:
    raise SystemExit("Passwords do not match.")

if len(new_password) < 12:
    raise SystemExit("Password must be at least 12 characters.")

with engine.begin() as connection:
    user = connection.execute(
        text("""
            SELECT id, email, role
            FROM users
            WHERE email = :email
            FOR UPDATE
        """),
        {"email": email},
    ).mappings().first()

    if user is None or user["role"] != "admin":
        raise SystemExit("Admin account not found.")

    connection.execute(
        text("""
            UPDATE users
            SET password_hash = :password_hash
            WHERE id = :id
        """),
        {
            "password_hash": password_hash.hash(new_password),
            "id": user["id"],
        },
    )

print("Admin password reset successful.")
