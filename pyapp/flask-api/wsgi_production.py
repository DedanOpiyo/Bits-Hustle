import logging
import sys

# Configure production logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)

from app.factory import create_app

app = create_app()

if __name__ == "__main__":
    # Production uses gunicorn, this is for dev server only
    app.run(host="0.0.0.0", port=5000)