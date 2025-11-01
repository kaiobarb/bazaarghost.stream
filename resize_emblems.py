#!/usr/bin/env python3
from PIL import Image
import os

# Directory containing the images
public_dir = "/home/kaio/Dev/bazaarghost.stream/public"

# List of emblem images to resize
emblems = ["bronze", "silver", "gold", "diamond", "legend"]

for emblem in emblems:
    input_file = os.path.join(public_dir, f"{emblem}_fullres.png")
    output_file = os.path.join(public_dir, f"{emblem}.png")

    if os.path.exists(input_file):
        # Open the image
        img = Image.open(input_file)

        # Calculate new width to maintain aspect ratio with 64px height
        original_width, original_height = img.size
        new_height = 64
        new_width = int((new_height / original_height) * original_width)

        # Resize the image with high quality
        resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Save the resized image
        resized_img.save(output_file, "PNG", optimize=True)
        print(f"Created {emblem}.png ({new_width}x{new_height})")
    else:
        print(f"Warning: {input_file} not found")

print("Done resizing emblem images!")