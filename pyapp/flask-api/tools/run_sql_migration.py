import os
from pathlib import Path

import pymysql
from dotenv import load_dotenv


def split_sql(sql: str):
    statements = []
    buffer = []
    in_block = False
    in_single = False
    in_double = False
    i = 0
    while i < len(sql):
        char = sql[i]
        nxt = sql[i + 1] if i + 1 < len(sql) else ""

        if not in_single and not in_double and not in_block and char == "/" and nxt == "*":
            in_block = True
            i += 2
            continue
        if in_block and char == "*" and nxt == "/":
            in_block = False
            i += 2
            continue
        if in_block:
            i += 1
            continue

        if char == "'" and not in_double:
            in_single = not in_single
        elif char == '"' and not in_single:
            in_double = not in_double

        if char == ";" and not in_single and not in_double:
            statement = "".join(buffer).strip()
            if statement:
                statements.append(statement)
            buffer = []
        else:
            buffer.append(char)
        i += 1

    statement = "".join(buffer).strip()
    if statement:
        statements.append(statement)
    return statements


def main():
    load_dotenv(".env")
    path = Path("migrations/sql/20260719_managed_gig_assignments.sql")
    sql = path.read_text(encoding="utf-8")
    statements = split_sql(sql)

    conn = pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "bitshustle"),
        autocommit=False,
    )
    try:
        with conn.cursor() as cursor:
            for statement in statements:
                cursor.execute(statement)
        conn.commit()
        print(f"Executed {len(statements)} SQL statements successfully")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
