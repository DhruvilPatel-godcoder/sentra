import cv2
import numpy as np
import easyocr
import re
import os
from pathlib import Path

class PlateReader:
    def __init__(self):
        """Initialize license plate detection and OCR"""
        try:
            # Initialize EasyOCR reader for English
            self.reader = easyocr.Reader(['en'], gpu=False)
            
            # Indian license plate patterns
            self.plate_patterns = [
                r'^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$',  # Standard: KA01AB1234
                r'^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$',  # Alternative: KA1AB1234
                r'^[A-Z]{3}[0-9]{4}$',  # Old format: KAR1234
                r'^[A-Z]{2}[0-9]{2}[A-Z]{4}[0-9]{4}$',  # New BH series
            ]
            
            print("License plate reader initialized successfully")
            
        except Exception as e:
            print(f"Error initializing plate reader: {e}")
            self.reader = None
    
    def detect_and_read(self, image_path):
        """
        Detect and read license plate from image
        
        Args:
            image_path (str): Path to the image file
            
        Returns:
            dict: Plate detection results
        """
        if self.reader is None:
            return self._empty_result()
        
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image from {image_path}")
            
            # Method 1: Direct OCR on full image
            ocr_result = self._ocr_detection(image)
            if ocr_result['plate_detected']:
                return ocr_result
            
            # Method 2: Preprocess and try OCR
            preprocessed_result = self._preprocessed_detection(image)
            if preprocessed_result['plate_detected']:
                return preprocessed_result
            
            # Method 3: Region-based detection
            region_result = self._region_based_detection(image)
            
            return region_result
            
        except Exception as e:
            print(f"Error in plate detection: {e}")
            return self._empty_result()
    
    def _ocr_detection(self, image):
        """Direct OCR detection on full image"""
        try:
            # Read all text in image
            results = self.reader.readtext(image)
            
            best_result = None
            best_confidence = 0
            
            for (bbox, text, confidence) in results:
                # Clean and validate text
                cleaned_text = self._clean_plate_text(text)
                
                if self._is_valid_plate(cleaned_text) and confidence > 0.4:
                    if confidence > best_confidence:
                        best_confidence = confidence
                        best_result = {
                            'text': cleaned_text,
                            'confidence': confidence,
                            'bbox': self._convert_bbox(bbox)
                        }
            
            if best_result:
                return {
                    'plate_detected': True,
                    'plate_number': best_result['text'],
                    'plate_confidence': best_result['confidence'],
                    'plate_bbox': best_result['bbox']
                }
            
            return self._empty_result()
            
        except Exception as e:
            print(f"OCR detection error: {e}")
            return self._empty_result()
    
    def _preprocessed_detection(self, image):
        """OCR detection with image preprocessing"""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply various preprocessing techniques
            preprocessed_images = [
                gray,  # Original grayscale
                cv2.bilateralFilter(gray, 11, 17, 17),  # Noise reduction
                cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],  # Otsu threshold
                cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)  # Adaptive threshold
            ]
            
            best_result = None
            best_confidence = 0
            
            for processed_img in preprocessed_images:
                results = self.reader.readtext(processed_img)
                
                for (bbox, text, confidence) in results:
                    cleaned_text = self._clean_plate_text(text)
                    
                    if self._is_valid_plate(cleaned_text) and confidence > best_confidence:
                        best_confidence = confidence
                        best_result = {
                            'text': cleaned_text,
                            'confidence': confidence,
                            'bbox': self._convert_bbox(bbox)
                        }
            
            if best_result:
                return {
                    'plate_detected': True,
                    'plate_number': best_result['text'],
                    'plate_confidence': best_result['confidence'],
                    'plate_bbox': best_result['bbox']
                }
            
            return self._empty_result()
            
        except Exception as e:
            print(f"Preprocessed detection error: {e}")
            return self._empty_result()
    
    def _region_based_detection(self, image):
        """Detection based on potential plate regions"""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Find contours that might be license plates
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filter contours by aspect ratio and area
            potential_plates = []
            h, w = gray.shape
            min_area = (h * w) * 0.01  # Minimum 1% of image area
            max_area = (h * w) * 0.3   # Maximum 30% of image area
            
            for contour in contours:
                area = cv2.contourArea(contour)
                
                if min_area < area < max_area:
                    # Get bounding rectangle
                    x, y, w_rect, h_rect = cv2.boundingRect(contour)
                    aspect_ratio = w_rect / h_rect
                    
                    # License plates typically have aspect ratio between 2:1 and 5:1
                    if 2.0 <= aspect_ratio <= 5.0:
                        potential_plates.append((x, y, w_rect, h_rect, area))
            
            # Sort by area (largest first)
            potential_plates.sort(key=lambda x: x[4], reverse=True)
            
            # Try OCR on potential plate regions
            for x, y, w_rect, h_rect, area in potential_plates[:5]:  # Check top 5 candidates
                # Extract region with some padding
                padding = 10
                x1 = max(0, x - padding)
                y1 = max(0, y - padding)
                x2 = min(gray.shape[1], x + w_rect + padding)
                y2 = min(gray.shape[0], y + h_rect + padding)
                
                roi = gray[y1:y2, x1:x2]
                
                if roi.size > 0:
                    # Enhance the ROI
                    roi = cv2.resize(roi, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
                    roi = cv2.bilateralFilter(roi, 9, 75, 75)
                    
                    results = self.reader.readtext(roi)
                    
                    for (bbox, text, confidence) in results:
                        cleaned_text = self._clean_plate_text(text)
                        
                        if self._is_valid_plate(cleaned_text) and confidence > 0.4:
                            return {
                                'plate_detected': True,
                                'plate_number': cleaned_text,
                                'plate_confidence': confidence,
                                'plate_bbox': {
                                    'x1': x1, 'y1': y1,
                                    'x2': x2, 'y2': y2,
                                    'confidence': confidence,
                                    'width': x2 - x1,
                                    'height': y2 - y1
                                }
                            }
            
            return self._empty_result()
            
        except Exception as e:
            print(f"Region-based detection error: {e}")
            return self._empty_result()
    
    def _clean_plate_text(self, text):
        """Clean and format detected text"""
        # Remove special characters, spaces, and convert to uppercase
        cleaned = re.sub(r'[^A-Z0-9]', '', text.upper())
        
        # Remove common OCR errors
        cleaned = cleaned.replace('O', '0')  # O to 0
        cleaned = cleaned.replace('I', '1')  # I to 1
        cleaned = cleaned.replace('S', '5')  # S to 5 (sometimes)
        
        return cleaned
    
    def _is_valid_plate(self, text):
        """Check if text matches Indian license plate patterns"""
        if not text or len(text) < 6:
            return False
        
        # Check against Indian license plate patterns
        for pattern in self.plate_patterns:
            if re.match(pattern, text):
                return True
        
        # Relaxed validation for partial matches
        if 6 <= len(text) <= 12:
            # Should have both letters and numbers
            has_letters = bool(re.search(r'[A-Z]', text))
            has_numbers = bool(re.search(r'[0-9]', text))
            
            if has_letters and has_numbers:
                return True
        
        return False
    
    def _convert_bbox(self, bbox):
        """Convert EasyOCR bbox to our format"""
        if isinstance(bbox, list) and len(bbox) == 4:
            # bbox is list of 4 points: [[x1,y1], [x2,y1], [x2,y2], [x1,y2]]
            x_coords = [point[0] for point in bbox]
            y_coords = [point[1] for point in bbox]
            
            return {
                'x1': int(min(x_coords)),
                'y1': int(min(y_coords)),
                'x2': int(max(x_coords)),
                'y2': int(max(y_coords)),
                'width': int(max(x_coords) - min(x_coords)),
                'height': int(max(y_coords) - min(y_coords))
            }
        
        return {}
    
    def _empty_result(self):
        """Return empty detection result"""
        return {
            'plate_detected': False,
            'plate_number': '',
            'plate_confidence': 0.0,
            'plate_bbox': {}
        }
    
    def enhance_image_for_ocr(self, image):
        """Enhance image for better OCR results"""
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Resize if too small
        h, w = gray.shape
        if h < 100 or w < 100:
            gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        
        # Noise reduction
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # Contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)
        
        return enhanced