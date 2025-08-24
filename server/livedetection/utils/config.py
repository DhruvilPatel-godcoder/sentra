"""
Configuration utilities for the helmet detection system
"""
import os
from pathlib import Path

def get_base_dir():
    """Get base directory of the app"""
    return Path(__file__).parent.parent

def get_media_dir():
    """Get media directory path"""
    return get_base_dir() / 'media'

def get_weights_dir():
    """Get weights directory path"""
    return get_base_dir() / 'weights'

def get_data_dir():
    """Get data directory path"""
    return get_base_dir() / 'data'

def ensure_directories():
    """Ensure all required directories exist"""
    dirs = [
        get_media_dir(),
        get_media_dir() / 'uploads',
        get_media_dir() / 'processed', 
        get_media_dir() / 'violations',
        get_media_dir() / 'temp',
        get_weights_dir(),
        get_weights_dir() / 'backup',
        get_data_dir() / 'train' / 'images',
        get_data_dir() / 'train' / 'labels',
        get_data_dir() / 'val' / 'images',
        get_data_dir() / 'val' / 'labels',
        get_data_dir() / 'test' / 'images',
        get_data_dir() / 'test' / 'labels'
    ]
    
    for directory in dirs:
        directory.mkdir(parents=True, exist_ok=True)
        
    print("All required directories created/verified")

if __name__ == "__main__":
    ensure_directories()