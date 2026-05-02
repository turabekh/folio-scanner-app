import io
from typing import Literal

import cv2
import numpy as np
from PIL import Image


FilterName = Literal["original", "magic", "bw", "gray"]


def _bytes_to_cv2(data: bytes) -> np.ndarray:
    pil_img = Image.open(io.BytesIO(data))
    if pil_img.mode != "RGB":
        pil_img = pil_img.convert("RGB")
    arr = np.array(pil_img)
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


def _cv2_to_jpeg_bytes(img: np.ndarray, quality: int = 92) -> bytes:
    success, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not success:
        raise ValueError("Failed to encode image as JPEG")
    return buf.tobytes()


def _apply_magic(img: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (0, 0), sigmaX=33, sigmaY=33)
    divided = cv2.divide(gray, blurred, scale=255)
    enhanced = cv2.normalize(divided, None, 0, 255, cv2.NORM_MINMAX)
    return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)


def _apply_bw(img: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        25, 15,
    )
    return cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)


def _apply_gray(img: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)


def apply_filter(image_bytes: bytes, filter_name: FilterName) -> bytes:
    if filter_name == "original":
        return image_bytes

    img = _bytes_to_cv2(image_bytes)

    if filter_name == "magic":
        out = _apply_magic(img)
    elif filter_name == "bw":
        out = _apply_bw(img)
    elif filter_name == "gray":
        out = _apply_gray(img)
    else:
        raise ValueError(f"Unknown filter: {filter_name}")

    return _cv2_to_jpeg_bytes(out)