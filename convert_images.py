#!/usr/bin/env python3
"""
Convert images to vision-model-ready format and save them to a subdirectory.
Original images are left untouched.
"""

import os
from pathlib import Path
from PIL import Image

# ───── Configurable Settings ───── #
SOURCE_DIR = Path("/Users/seoulrebel/Desktop/CLI-DEV/SCRIPTS/MyProjects/SillyTavernDrafts/Images")  # Directory containing the images
TARGET_DIR = SOURCE_DIR / "converted"
TARGET_FORMAT = "JPEG"  # Or "PNG" if you prefer
TARGET_SIZE = (224, 224)  # Adjust as needed
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}

# ───── Ensure Output Directory Exists ───── #
TARGET_DIR.mkdir(exist_ok=True)

# ───── Convert Images ───── #
for image_path in SOURCE_DIR.iterdir():
    if image_path.suffix.lower() in ALLOWED_EXTS and image_path.is_file():
        try:
            with Image.open(image_path) as img:
                img = img.convert("RGB")
                try:
                    resample = Image.Resampling.LANCZOS
                except AttributeError:
                    resample = Image.LANCZOS
                img = img.resize(TARGET_SIZE, resample)

                output_path = TARGET_DIR / (image_path.stem + ".jpg")
                img.save(output_path, format=TARGET_FORMAT, quality=95)
                print(f"Converted: {image_path.name} → {output_path.name}")
        except Exception as e:
            print(f"Failed to convert {image_path.name}: {e}")
