"""Serialise a SQLAlchemy model to dict (including JSON fields)."""

from datetime import datetime
from decimal import Decimal
from sqlalchemy import inspect


class SerializationError(Exception):
    pass


def to_dict(obj, seen=None, with_relations=False):
    """Serialize a SQLAlchemy model to dict.
    
    Args:
        obj: SQLAlchemy model instance
        seen: Set of seen object ids (for circular reference handling)
        with_relations: If True, include loaded relationships in the output
    """
    if seen is None:
        seen = set()
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj
    if id(obj) in seen:
        return None
    seen.add(id(obj))
    result = {}
    for c in obj.__table__.columns:
        val = getattr(obj, c.name)
        if isinstance(val, datetime):
            val = val.isoformat()
        elif isinstance(val, Decimal):
            val = float(val)
        result[c.name] = val

    if with_relations:
        mapper = inspect(type(obj))
        for rel in mapper.relationships:
            rel_name = rel.key
            if rel_name in result:
                continue
            # Only serialize if the relationship is already loaded in __dict__ (not lazy-loaded)
            if rel_name in obj.__dict__:
                related = obj.__dict__[rel_name]
                if related is not None:
                    if rel.uselist:
                        if hasattr(related, '__iter__') and not isinstance(related, (str, bytes)):
                            result[rel_name] = [to_dict(item, seen, with_relations=True) for item in related]
                        else:
                            result[rel_name] = None
                    else:
                        result[rel_name] = to_dict(related, seen, with_relations=True)

    return result

