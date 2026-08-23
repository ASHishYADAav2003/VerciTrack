import os
import shutil
from pathlib import Path

# Placeholder for dataset preparation
# In a real scenario, this would download and split the dataset.

def setup_directories(base_path: str, classes: list):
    """Creates train, val, and test directories for the given classes."""
    splits = ['train', 'val', 'test']
    for split in splits:
        for cls in classes:
            Path(base_path, split, cls).mkdir(parents=True, exist_ok=True)
            
def main():
    base_dir = 'dataset'
    classes = ['Grade_A', 'Grade_B', 'Grade_C', 'Reject']
    
    print("Setting up dataset directories...")
    setup_directories(base_dir, classes)
    print("Directories created. Place your images in the respective folders.")

if __name__ == '__main__':
    main()
