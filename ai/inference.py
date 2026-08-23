import torch
from torchvision import models, transforms
from PIL import Image
import torch.nn as nn
import os

class QualityGrader:
    def __init__(self, model_path: str, class_names: list):
        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        self.class_names = class_names
        
        # Load model
        self.model = models.mobilenet_v3_small()
        num_ftrs = self.model.classifier[3].in_features
        self.model.classifier[3] = nn.Linear(num_ftrs, len(self.class_names))
        
        # Load state dict
        if os.path.exists(model_path):
            self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        else:
            print(f"Warning: Model not found at {model_path}. Predictions will be random until trained.")
            
        self.model = self.model.to(self.device)
        self.model.eval()
        
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

    def predict(self, image_path: str):
        image = Image.open(image_path).convert('RGB')
        image_tensor = self.transform(image).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            outputs = self.model(image_tensor)
            probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
            confidence, predicted_idx = torch.max(probabilities, 0)
            
        return {
            "grade": self.class_names[predicted_idx.item()],
            "confidence": confidence.item()
        }

if __name__ == '__main__':
    grader = QualityGrader('models/mobilenetv3_grade_model.pth', ['Grade_A', 'Grade_B', 'Grade_C', 'Reject'])
    # Example usage:
    # print(grader.predict("sample.jpg"))
