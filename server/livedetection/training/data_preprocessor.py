import os
import yaml
import shutil
import random
from pathlib import Path
import cv2
import numpy as np
from collections import defaultdict

class DataPreprocessor:
    def __init__(self):
        """Initialize data preprocessor for helmet detection dataset"""
        self.base_dir = Path(__file__).parent.parent
        self.data_dir = self.base_dir / "data"
        self.processed_dir = self.data_dir / "processed"
        
        # Data split ratios
        self.split_ratios = {
            'train': 0.7,
            'val': 0.2,
            'test': 0.1
        }
        
        # Augmentation parameters
        self.augmentation_config = {
            'brightness_range': (-0.2, 0.2),
            'contrast_range': (0.8, 1.2),
            'saturation_range': (0.8, 1.2),
            'hue_range': (-0.1, 0.1),
            'noise_probability': 0.3,
            'blur_probability': 0.2,
            'flip_probability': 0.5
        }
    
    def prepare_helmet_dataset(self, source_data_dir=None):
        """
        Prepare and organize helmet detection dataset
        
        Args:
            source_data_dir: Path to source data directory
        """
        try:
            if source_data_dir is None:
                source_data_dir = self.data_dir
            
            source_path = Path(source_data_dir)
            
            print(f"Preparing helmet dataset from: {source_path}")
            
            # Step 1: Collect all image and label files
            image_label_pairs = self._collect_image_label_pairs(source_path)
            
            if len(image_label_pairs) == 0:
                raise ValueError("No valid image-label pairs found")
            
            print(f"Found {len(image_label_pairs)} image-label pairs")
            
            # Step 2: Validate and clean data
            valid_pairs = self._validate_dataset_pairs(image_label_pairs)
            print(f"Valid pairs after cleaning: {len(valid_pairs)}")
            
            # Step 3: Split dataset
            train_pairs, val_pairs, test_pairs = self._split_dataset(valid_pairs)
            
            # Step 4: Create organized directory structure
            self._create_dataset_structure()
            
            # Step 5: Copy files to respective directories
            self._organize_dataset_files(train_pairs, val_pairs, test_pairs)
            
            # Step 6: Generate data.yaml configuration
            self._generate_dataset_config()
            
            # Step 7: Generate dataset statistics
            stats = self._generate_dataset_statistics()
            
            print("Dataset preparation completed successfully!")
            return stats
            
        except Exception as error:
            print(f"Dataset preparation failed: {error}")
            raise error
    
    def _collect_image_label_pairs(self, source_dir):
        """Collect all image and corresponding label file pairs"""
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp'}
        pairs = []
        
        # Search for images in all subdirectories
        for img_path in source_dir.rglob('*'):
            if img_path.suffix.lower() in image_extensions and img_path.is_file():
                # Look for corresponding label file
                label_path = img_path.with_suffix('.txt')
                
                # Also check in labels directory if it exists
                if not label_path.exists():
                    labels_dir = img_path.parent / 'labels'
                    if labels_dir.exists():
                        label_path = labels_dir / f"{img_path.stem}.txt"
                
                if label_path.exists():
                    pairs.append((img_path, label_path))
                else:
                    print(f"Warning: No label file found for {img_path}")
        
        return pairs
    
    def _validate_dataset_pairs(self, pairs):
        """Validate image-label pairs and remove invalid ones"""
        valid_pairs = []
        
        for img_path, label_path in pairs:
            try:
                # Validate image
                image = cv2.imread(str(img_path))
                if image is None:
                    print(f"Invalid image: {img_path}")
                    continue
                
                # Validate label file
                if not self._validate_label_file(label_path, image.shape):
                    print(f"Invalid label file: {label_path}")
                    continue
                
                valid_pairs.append((img_path, label_path))
                
            except Exception as error:
                print(f"Error validating {img_path}: {error}")
                continue
        
        return valid_pairs
    
    def _validate_label_file(self, label_path, image_shape):
        """Validate YOLO format label file"""
        try:
            h, w = image_shape[:2]
            
            with open(label_path, 'r') as file:
                lines = file.readlines()
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                parts = line.split()
                if len(parts) != 5:
                    return False
                
                # Validate class ID and coordinates
                class_id = int(parts[0])
                x_center, y_center, width, height = map(float, parts[1:5])
                
                # Check if coordinates are normalized (0-1)
                if not (0 <= x_center <= 1 and 0 <= y_center <= 1 and
                        0 <= width <= 1 and 0 <= height <= 1):
                    return False
                
                # Check if bounding box is valid
                if width <= 0 or height <= 0:
                    return False
            
            return True
            
        except Exception:
            return False
    
    def _split_dataset(self, pairs):
        """Split dataset into train, validation, and test sets"""
        # Shuffle pairs randomly
        random.shuffle(pairs)
        
        total_count = len(pairs)
        train_count = int(total_count * self.split_ratios['train'])
        val_count = int(total_count * self.split_ratios['val'])
        
        train_pairs = pairs[:train_count]
        val_pairs = pairs[train_count:train_count + val_count]
        test_pairs = pairs[train_count + val_count:]
        
        print(f"Dataset split - Train: {len(train_pairs)}, Val: {len(val_pairs)}, Test: {len(test_pairs)}")
        
        return train_pairs, val_pairs, test_pairs
    
    def _create_dataset_structure(self):
        """Create organized dataset directory structure"""
        # Create main directories
        for split in ['train', 'val', 'test']:
            (self.data_dir / split / 'images').mkdir(parents=True, exist_ok=True)
            (self.data_dir / split / 'labels').mkdir(parents=True, exist_ok=True)
        
        print("Dataset directory structure created")
    
    def _organize_dataset_files(self, train_pairs, val_pairs, test_pairs):
        """Copy files to organized structure"""
        splits = {
            'train': train_pairs,
            'val': val_pairs,
            'test': test_pairs
        }
        
        for split_name, pairs in splits.items():
            images_dir = self.data_dir / split_name / 'images'
            labels_dir = self.data_dir / split_name / 'labels'
            
            for idx, (img_path, label_path) in enumerate(pairs):
                # Generate new filename to avoid conflicts
                new_name = f"{split_name}_{idx:06d}{img_path.suffix}"
                
                # Copy image
                shutil.copy2(img_path, images_dir / new_name)
                
                # Copy label with same base name
                shutil.copy2(label_path, labels_dir / f"{Path(new_name).stem}.txt")
            
            print(f"Organized {len(pairs)} files for {split_name} split")
    
    def _generate_dataset_config(self):
        """Generate data.yaml configuration file"""
        config = {
            'path': str(self.data_dir),
            'train': 'train/images',
            'val': 'val/images',
            'test': 'test/images',
            'nc': 5,  # Number of classes
            'names': {
                0: 'person',
                1: 'helmet',
                2: 'no_helmet',
                3: 'motorcycle',
                4: 'license_plate'
            },
            'class_descriptions': {
                'person': 'Person detected in image',
                'helmet': 'Person wearing helmet',
                'no_helmet': 'Person not wearing helmet',
                'motorcycle': 'Motorcycle/bike vehicle',
                'license_plate': 'Vehicle license plate'
            },
            'training': {
                'epochs': 100,
                'batch_size': 16,
                'img_size': 640,
                'learning_rate': 0.01
            },
            'detection': {
                'confidence_threshold': 0.5,
                'iou_threshold': 0.45
            },
            'violation_rules': {
                'helmet_required': True,
                'fine_amount': 500,
                'auto_memo_generation': True
            }
        }
        
        config_path = self.data_dir / 'data.yaml'
        with open(config_path, 'w') as file:
            yaml.dump(config, file, default_flow_style=False, indent=2)
        
        print(f"Dataset configuration saved to: {config_path}")
    
    def _generate_dataset_statistics(self):
        """Generate dataset statistics"""
        stats = {
            'total_images': 0,
            'class_distribution': defaultdict(int),
            'split_sizes': {},
            'image_sizes': [],
            'annotation_count': 0
        }
        
        for split in ['train', 'val', 'test']:
            images_dir = self.data_dir / split / 'images'
            labels_dir = self.data_dir / split / 'labels'
            
            image_files = list(images_dir.glob('*'))
            label_files = list(labels_dir.glob('*.txt'))
            
            stats['split_sizes'][split] = len(image_files)
            stats['total_images'] += len(image_files)
            
            # Analyze labels
            for label_file in label_files:
                with open(label_file, 'r') as file:
                    lines = file.readlines()
                
                for line in lines:
                    line = line.strip()
                    if line:
                        class_id = int(line.split()[0])
                        stats['class_distribution'][class_id] += 1
                        stats['annotation_count'] += 1
            
            # Sample image sizes
            for img_file in image_files[:10]:  # Sample first 10 images
                img = cv2.imread(str(img_file))
                if img is not None:
                    stats['image_sizes'].append(img.shape[:2])
        
        print("\nDataset Statistics:")
        print(f"Total images: {stats['total_images']}")
        print(f"Total annotations: {stats['annotation_count']}")
        print(f"Split sizes: {stats['split_sizes']}")
        print(f"Class distribution: {dict(stats['class_distribution'])}")
        
        return stats
    
    def augment_training_data(self, augmentation_factor=2):
        """Apply data augmentation to training set"""
        try:
            train_images_dir = self.data_dir / 'train' / 'images'
            train_labels_dir = self.data_dir / 'train' / 'labels'
            
            original_images = list(train_images_dir.glob('*'))
            augmented_count = 0
            
            for img_path in original_images:
                label_path = train_labels_dir / f"{img_path.stem}.txt"
                
                if not label_path.exists():
                    continue
                
                # Load image and labels
                image = cv2.imread(str(img_path))
                if image is None:
                    continue
                
                # Generate augmented versions
                for aug_idx in range(augmentation_factor):
                    augmented_img, augmented_labels = self._apply_augmentations(
                        image, label_path
                    )
                    
                    # Save augmented image and labels
                    aug_img_name = f"{img_path.stem}_aug_{aug_idx}{img_path.suffix}"
                    aug_label_name = f"{img_path.stem}_aug_{aug_idx}.txt"
                    
                    cv2.imwrite(str(train_images_dir / aug_img_name), augmented_img)
                    
                    with open(train_labels_dir / aug_label_name, 'w') as file:
                        file.write(augmented_labels)
                    
                    augmented_count += 1
            
            print(f"Generated {augmented_count} augmented training samples")
            
        except Exception as error:
            print(f"Data augmentation failed: {error}")
    
    def _apply_augmentations(self, image, label_path):
        """Apply random augmentations to image and adjust labels"""
        try:
            # Read original labels
            with open(label_path, 'r') as file:
                labels = file.read()
            
            augmented_img = image.copy()
            
            # Apply random brightness
            if random.random() < 0.7:
                brightness = random.uniform(*self.augmentation_config['brightness_range'])
                augmented_img = cv2.convertScaleAbs(augmented_img, alpha=1, beta=brightness * 255)
            
            # Apply random contrast
            if random.random() < 0.7:
                contrast = random.uniform(*self.augmentation_config['contrast_range'])
                augmented_img = cv2.convertScaleAbs(augmented_img, alpha=contrast, beta=0)
            
            # Apply horizontal flip
            if random.random() < self.augmentation_config['flip_probability']:
                augmented_img = cv2.flip(augmented_img, 1)
                # Adjust labels for horizontal flip
                labels = self._flip_labels_horizontal(labels)
            
            # Add noise
            if random.random() < self.augmentation_config['noise_probability']:
                noise = np.random.normal(0, 25, augmented_img.shape).astype(np.uint8)
                augmented_img = cv2.add(augmented_img, noise)
            
            # Apply blur
            if random.random() < self.augmentation_config['blur_probability']:
                kernel_size = random.choice([3, 5])
                augmented_img = cv2.GaussianBlur(augmented_img, (kernel_size, kernel_size), 0)
            
            return augmented_img, labels
            
        except Exception as error:
            print(f"Augmentation error: {error}")
            return image, labels
    
    def _flip_labels_horizontal(self, labels_text):
        """Adjust labels for horizontal flip"""
        lines = labels_text.strip().split('\n')
        flipped_lines = []
        
        for line in lines:
            if line.strip():
                parts = line.split()
                if len(parts) == 5:
                    class_id = parts[0]
                    x_center = 1.0 - float(parts[1])  # Flip x coordinate
                    y_center = parts[2]
                    width = parts[3]
                    height = parts[4]
                    
                    flipped_line = f"{class_id} {x_center} {y_center} {width} {height}"
                    flipped_lines.append(flipped_line)
        
        return '\n'.join(flipped_lines)