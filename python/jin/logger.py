import logging


def get_logger(level: str = "WARNING") -> logging.Logger:
    logger = logging.getLogger("jin")
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("[JIN] %(levelname)s %(message)s"))
        logger.addHandler(handler)
    logger.setLevel(getattr(logging, level.upper(), logging.WARNING))
    return logger

