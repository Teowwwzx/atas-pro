import cloudinary
import cloudinary.uploader
import cloudinary.exceptions
from fastapi import UploadFile, HTTPException
from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)

def upload_file(file: UploadFile, folder: str) -> str:
    # Basic configuration validation
    if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY or not settings.CLOUDINARY_API_SECRET:
        raise HTTPException(status_code=500, detail="Cloudinary configuration missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment.")
    try:
        result = cloudinary.uploader.upload(file.file, folder=folder)
        return result.get("secure_url") or result.get("url")
    except cloudinary.exceptions.Error as e:
        # Surface a friendly error instead of 500 tracebacks
        raise HTTPException(status_code=502, detail=f"Cloudinary upload failed: {str(e)}. Please verify CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error during upload: {str(e)}")