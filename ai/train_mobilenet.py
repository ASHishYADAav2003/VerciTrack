import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms
import os

def train_model():
    data_dir = 'dataset' # Should contain train and val folders
    if not os.path.exists(os.path.join(data_dir, 'train')):
        print("Training data not found. Please run dataset_prep.py and add images.")
        return

    # Data augmentation and normalization for training
    data_transforms = {
        'train': transforms.Compose([
            transforms.RandomResizedCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
        'val': transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
    }

    image_datasets = {x: datasets.ImageFolder(os.path.join(data_dir, x),
                                              data_transforms[x])
                      for x in ['train', 'val']}
    dataloaders = {x: torch.utils.data.DataLoader(image_datasets[x], batch_size=32,
                                                 shuffle=True, num_workers=4)
                  for x in ['train', 'val']}
    
    class_names = image_datasets['train'].classes
    print(f"Classes found: {class_names}")

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # Load pre-trained MobileNetV3
    model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
    
    # Modify the last layer for our classes
    num_ftrs = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(num_ftrs, len(class_names))
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    # Simplified training loop (placeholder)
    print("Starting training (placeholder)...")
    # ... actual training loop over epochs would go here ...
    
    # Save model
    os.makedirs('models', exist_ok=True)
    torch.save(model.state_dict(), 'models/mobilenetv3_grade_model.pth')
    print("Model saved to models/mobilenetv3_grade_model.pth")

if __name__ == '__main__':
    train_model()
