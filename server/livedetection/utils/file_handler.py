import os
import uuid
import shutil
from datetime import datetime
from pathlib import Path
import cv2
import numpy as np

class FileHandler:
    def __init__(self):
        """Initialize file handler with directory paths"""
        self.base_dir = Path(__file__).parent.parent
        self.media_dir = self.base_dir / "media"
        
        # Create media subdirectories
        self.uploads_dir = self.media_dir / "uploads"
        self.processed_dir = self.media_dir / "processed"
        self.violations_dir = self.media_dir / "violations"
        self.temp_dir = self.media_dir / "temp"
        
        # Create directories if they don't exist
        self._create_directories()
        
        # Allowed file extensions
        self.allowed_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
        
        # Maximum file size (10MB)
        self.max_file_size = 10 * 1024 * 1024
    
    def _create_directories(self):
        """Create necessary directories"""
        directories = [
            self.media_dir,
            self.uploads_dir,
            self.processed_dir,
            self.violations_dir,
            self.temp_dir
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            print(f"Directory ensured: {directory}")
    
    def save_uploaded_image(self, image_file, camera_id='upload'):
        """
        Save uploaded image file to uploads directory
        
        Args:
            image_file: Django uploaded file object
            camera_id: Camera identifier
            
        Returns:
            str: Path to saved file
        """
        try:
            # Validate file
            if not self._validate_image_file(image_file):
                raise ValueError("Invalid image file")
            
            # Generate unique filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            file_extension = Path(image_file.name).suffix.lower()
            
            filename = f"{camera_id}_{timestamp}_{uuid.uuid4().hex[:8]}{file_extension}"
            file_path = self.uploads_dir / filename
            
            # Save file
            with open(file_path, 'wb+') as destination:
                for chunk in image_file.chunks():
                    destination.write(chunk)
            
            print(f"Image saved: {file_path}")
            return str(file_path)
            
        except Exception as e:
            print(f"Error saving uploaded image: {e}")
            raise e
    
    def save_processed_image(self, image_array, original_path, suffix='processed'):
        """
        Save processed image array to processed directory
        
        Args:
            image_array: OpenCV image array
            original_path: Path to original image
            suffix: Suffix for processed filename
            
        Returns:
            str: Path to saved processed image
        """
        try:
            # Generate processed filename
            original_name = Path(original_path).stem
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            processed_filename = f"{original_name}_{suffix}_{timestamp}.jpg"
            processed_path = self.processed_dir / processed_filename
            
            # Save processed image
            cv2.imwrite(str(processed_path), image_array)
            
            print(f"Processed image saved: {processed_path}")
            return str(processed_path)
            
        except Exception as e:
            print(f"Error saving processed image: {e}")
            raise e
    
    def save_violation_evidence(self, image_array, violation_id):
        """
        Save violation evidence image
        
        Args:
            image_array: OpenCV image array
            violation_id: Violation identifier
            
        Returns:
            str: Path to saved evidence image
        """
        try:
            evidence_filename = f"{violation_id}_evidence.jpg"
            evidence_path = self.violations_dir / evidence_filename
            
            cv2.imwrite(str(evidence_path), image_array)
            
            print(f"Violation evidence saved: {evidence_path}")
            return str(evidence_path)
            
        except Exception as e:
            print(f"Error saving violation evidence: {e}")
            raise e
    
    def copy_to_violations(self, source_path, violation_id):
        """
        Copy file to violations directory
        
        Args:
            source_path: Path to source file
            violation_id: Violation identifier
            
        Returns:
            str: Path to copied file
        """
        try:
            if not os.path.exists(source_path):
                raise FileNotFoundError(f"Source file not found: {source_path}")
            
            source_ext = Path(source_path).suffix
            violation_filename = f"{violation_id}_evidence{source_ext}"
            violation_path = self.violations_dir / violation_filename
            
            shutil.copy2(source_path, violation_path)
            
            print(f"File copied to violations: {violation_path}")
            return str(violation_path)
            
        except Exception as e:
            print(f"Error copying to violations: {e}")
            raise e
    
    def _validate_image_file(self, image_file):
        """
        Validate uploaded image file
        
        Args:
            image_file: Django uploaded file object
            
        Returns:
            bool: True if valid
        """
        try:
            # Check file size
            if image_file.size > self.max_file_size:
                raise ValueError(f"File too large: {image_file.size} bytes")
            
            # Check file extension
            file_extension = Path(image_file.name).suffix.lower()
            if file_extension not in self.allowed_extensions:
                raise ValueError(f"Invalid file extension: {file_extension}")
            
            # Try to read image header
            image_file.seek(0)
            header = image_file.read(1024)
            image_file.seek(0)
            
            # Basic image format validation
            if not self._is_valid_image_header(header):
                raise ValueError("Invalid image format")
            
            return True
            
        except Exception as e:
            print(f"File validation error: {e}")
            return False
    
    def _is_valid_image_header(self, header):
        """Check if file header indicates valid image format"""
        # JPEG
        if header.startswith(b'\xff\xd8\xff'):
            return True
        
        # PNG
        if header.startswith(b'\x89PNG\r\n\x1a\n'):
            return True
        
        # BMP
        if header.startswith(b'BM'):
            return True
        
        # TIFF
        if header.startswith(b'II*\x00') or header.startswith(b'MM\x00*'):
            return True
        
        return False
    
    def load_image(self, image_path):
        """
        Load image from file path
        
        Args:
            image_path: Path to image file
            
        Returns:
            numpy.ndarray: OpenCV image array
        """
        try:
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")
            
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image: {image_path}")
            
            return image
            
        except Exception as e:
            print(f"Error loading image: {e}")
            raise e
    
    def resize_image(self, image, max_width=1920, max_height=1080):
        """
        Resize image while maintaining aspect ratio
        
        Args:
            image: OpenCV image array
            max_width: Maximum width
            max_height: Maximum height
            
        Returns:
            numpy.ndarray: Resized image
        """
        try:
            h, w = image.shape[:2]
            
            # Calculate scaling factor
            scale_w = max_width / w
            scale_h = max_height / h
            scale = min(scale_w, scale_h, 1.0)  # Don't upscale
            
            if scale < 1.0:
                new_w = int(w * scale)
                new_h = int(h * scale)
                resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
                return resized
            
            return image
            
        except Exception as e:
            print(f"Error resizing image: {e}")
            return image
    
    def cleanup_temp_files(self, max_age_hours=24):
        """
        Clean up temporary files older than specified hours
        
        Args:
            max_age_hours: Maximum age in hours
        """
        try:
            current_time = datetime.now()
            max_age = max_age_hours * 3600  # Convert to seconds
            
            for file_path in self.temp_dir.iterdir():
                if file_path.is_file():
                    file_age = current_time.timestamp() - file_path.stat().st_mtime
                    
                    if file_age > max_age:
                        file_path.unlink()
                        print(f"Cleaned up temp file: {file_path}")
                        
        except Exception as e:
            print(f"Error cleaning up temp files: {e}")
    
    def get_file_info(self, file_path):
        """
        Get file information
        
        Args:
            file_path: Path to file
            
        Returns:
            dict: File information
        """
        try:
            if not os.path.exists(file_path):
                return None
            
            stat = os.stat(file_path)
            
            return {
                'path': file_path,
                'name': os.path.basename(file_path),
                'size': stat.st_size,
                'created': datetime.fromtimestamp(stat.st_ctime),
                'modified': datetime.fromtimestamp(stat.st_mtime),
                'extension': Path(file_path).suffix.lower()
            }
            
        except Exception as e:
            print(f"Error getting file info: {e}")
            return None
    
    def delete_file(self, file_path):
        """
        Delete file safely
        
        Args:
            file_path: Path to file
            
        Returns:
            bool: True if deleted successfully
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"File deleted: {file_path}")
                return True
            return False
            
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False