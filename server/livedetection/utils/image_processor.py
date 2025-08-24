import cv2
import numpy as np
from PIL import Image, ImageEnhance
import os

class ImageProcessor:
    def __init__(self):
        """Initialize image processor"""
        pass
    
    def enhance_for_detection(self, image):
        """
        Enhance image for better detection results
        
        Args:
            image: OpenCV image array
            
        Returns:
            numpy.ndarray: Enhanced image
        """
        try:
            # Convert to RGB if needed
            if len(image.shape) == 3 and image.shape[2] == 3:
                # OpenCV uses BGR, convert to RGB for PIL
                rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            else:
                rgb_image = image
            
            # Convert to PIL Image
            pil_image = Image.fromarray(rgb_image)
            
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(pil_image)
            enhanced = enhancer.enhance(1.2)
            
            # Enhance sharpness
            enhancer = ImageEnhance.Sharpness(enhanced)
            enhanced = enhancer.enhance(1.1)
            
            # Convert back to OpenCV format
            enhanced_array = np.array(enhanced)
            if len(enhanced_array.shape) == 3:
                enhanced_cv = cv2.cvtColor(enhanced_array, cv2.COLOR_RGB2BGR)
            else:
                enhanced_cv = enhanced_array
            
            return enhanced_cv
            
        except Exception as e:
            print(f"Error enhancing image: {e}")
            return image
    
    def preprocess_for_ocr(self, image):
        """
        Preprocess image for OCR
        
        Args:
            image: OpenCV image array
            
        Returns:
            numpy.ndarray: Preprocessed image
        """
        try:
            # Convert to grayscale
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image
            
            # Noise reduction
            denoised = cv2.bilateralFilter(gray, 9, 75, 75)
            
            # Contrast enhancement using CLAHE
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(denoised)
            
            # Gaussian blur to smooth
            blurred = cv2.GaussianBlur(enhanced, (1, 1), 0)
            
            return blurred
            
        except Exception as e:
            print(f"Error preprocessing for OCR: {e}")
            return image
    
    def extract_roi(self, image, bbox):
        """
        Extract region of interest from image
        
        Args:
            image: OpenCV image array
            bbox: Bounding box dict with x1, y1, x2, y2
            
        Returns:
            numpy.ndarray: Extracted ROI
        """
        try:
            x1 = int(bbox.get('x1', 0))
            y1 = int(bbox.get('y1', 0))
            x2 = int(bbox.get('x2', image.shape[1]))
            y2 = int(bbox.get('y2', image.shape[0]))
            
            # Ensure coordinates are within image bounds
            h, w = image.shape[:2]
            x1 = max(0, min(x1, w-1))
            y1 = max(0, min(y1, h-1))
            x2 = max(x1+1, min(x2, w))
            y2 = max(y1+1, min(y2, h))
            
            roi = image[y1:y2, x1:x2]
            return roi
            
        except Exception as e:
            print(f"Error extracting ROI: {e}")
            return image
    
    def resize_with_aspect_ratio(self, image, target_size=(640, 640)):
        """
        Resize image while maintaining aspect ratio
        
        Args:
            image: OpenCV image array
            target_size: Tuple of (width, height)
            
        Returns:
            numpy.ndarray: Resized image
        """
        try:
            h, w = image.shape[:2]
            target_w, target_h = target_size
            
            # Calculate scaling factor
            scale = min(target_w / w, target_h / h)
            
            # Calculate new dimensions
            new_w = int(w * scale)
            new_h = int(h * scale)
            
            # Resize image
            resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
            
            # Create canvas with target size
            canvas = np.zeros((target_h, target_w, 3), dtype=np.uint8)
            
            # Calculate position to center the image
            y_offset = (target_h - new_h) // 2
            x_offset = (target_w - new_w) // 2
            
            # Place resized image on canvas
            if len(resized.shape) == 3:
                canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized
            else:
                canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w, 0] = resized
                canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w, 1] = resized
                canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w, 2] = resized
            
            return canvas
            
        except Exception as e:
            print(f"Error resizing with aspect ratio: {e}")
            return image
    
    def apply_morphological_operations(self, image):
        """
        Apply morphological operations for image cleaning
        
        Args:
            image: OpenCV image array (grayscale)
            
        Returns:
            numpy.ndarray: Processed image
        """
        try:
            # Ensure image is grayscale
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image
            
            # Create kernel for morphological operations
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            
            # Opening operation (erosion followed by dilation)
            opened = cv2.morphologyEx(gray, cv2.MORPH_OPEN, kernel)
            
            # Closing operation (dilation followed by erosion)
            closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel)
            
            return closed
            
        except Exception as e:
            print(f"Error applying morphological operations: {e}")
            return image
    
    def enhance_contrast(self, image, alpha=1.5, beta=0):
        """
        Enhance image contrast
        
        Args:
            image: OpenCV image array
            alpha: Contrast control (1.0-3.0)
            beta: Brightness control (0-100)
            
        Returns:
            numpy.ndarray: Enhanced image
        """
        try:
            enhanced = cv2.convertScaleAbs(image, alpha=alpha, beta=beta)
            return enhanced
            
        except Exception as e:
            print(f"Error enhancing contrast: {e}")
            return image
    
    def remove_noise(self, image, method='bilateral'):
        """
        Remove noise from image
        
        Args:
            image: OpenCV image array
            method: Noise removal method ('bilateral', 'gaussian', 'median')
            
        Returns:
            numpy.ndarray: Denoised image
        """
        try:
            if method == 'bilateral':
                denoised = cv2.bilateralFilter(image, 9, 75, 75)
            elif method == 'gaussian':
                denoised = cv2.GaussianBlur(image, (5, 5), 0)
            elif method == 'median':
                denoised = cv2.medianBlur(image, 5)
            else:
                denoised = image
            
            return denoised
            
        except Exception as e:
            print(f"Error removing noise: {e}")
            return image
    
    def detect_edges(self, image, low_threshold=50, high_threshold=150):
        """
        Detect edges in image using Canny edge detection
        
        Args:
            image: OpenCV image array
            low_threshold: Lower threshold for edge detection
            high_threshold: Upper threshold for edge detection
            
        Returns:
            numpy.ndarray: Edge detected image
        """
        try:
            # Convert to grayscale if needed
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image
            
            # Apply Gaussian blur
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Apply Canny edge detection
            edges = cv2.Canny(blurred, low_threshold, high_threshold)
            
            return edges
            
        except Exception as e:
            print(f"Error detecting edges: {e}")
            return image
    
    def create_mask(self, image, lower_bound, upper_bound, color_space='HSV'):
        """
        Create color mask for image
        
        Args:
            image: OpenCV image array
            lower_bound: Lower color bound
            upper_bound: Upper color bound
            color_space: Color space ('HSV', 'RGB', 'LAB')
            
        Returns:
            numpy.ndarray: Binary mask
        """
        try:
            # Convert color space
            if color_space == 'HSV':
                converted = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            elif color_space == 'LAB':
                converted = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            elif color_space == 'RGB':
                converted = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            else:
                converted = image
            
            # Create mask
            mask = cv2.inRange(converted, lower_bound, upper_bound)
            
            return mask
            
        except Exception as e:
            print(f"Error creating mask: {e}")
            return np.zeros(image.shape[:2], dtype=np.uint8)