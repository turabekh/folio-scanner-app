import io

import pytesseract
from PIL import Image


def extract_text(image_bytes: bytes, lang: str = "eng") -> str:
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    text = pytesseract.image_to_string(img, lang=lang)
    return text.strip()