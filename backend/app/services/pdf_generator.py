import io
from typing import Iterable

from PIL import Image
from reportlab.lib.colors import Color
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


PageInput = tuple[bytes, str | None]


def generate_pdf(pages: Iterable[PageInput], title: str | None = None) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    if title:
        pdf.setTitle(title)

    page_width, page_height = A4

    for image_bytes, ocr_text in pages:
        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                img.load()
                if img.mode not in ("RGB", "L"):
                    img = img.convert("RGB")
                img_width, img_height = img.size

                ratio = min(page_width / img_width, page_height / img_height)
                draw_width = img_width * ratio
                draw_height = img_height * ratio
                x = (page_width - draw_width) / 2
                y = (page_height - draw_height) / 2

                pdf.drawImage(
                    ImageReader(img),
                    x,
                    y,
                    width=draw_width,
                    height=draw_height,
                    preserveAspectRatio=True,
                )
        except Exception:
            pdf.showPage()
            continue

        if ocr_text:
            pdf.setFillColor(Color(0, 0, 0, alpha=0))
            pdf.setFont("Helvetica", 8)
            text_object = pdf.beginText()
            text_object.setTextOrigin(40, page_height - 50)
            text_object.setFillColor(Color(0, 0, 0, alpha=0))
            for line in ocr_text.split("\n"):
                if line.strip():
                    text_object.textLine(line[:1000])
            pdf.drawText(text_object)

        pdf.showPage()

    pdf.save()
    return buffer.getvalue()