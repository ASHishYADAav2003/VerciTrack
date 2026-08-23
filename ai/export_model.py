import torch
import torchvision.models as models
import torch.nn as nn
import os

def export_to_onnx():
    model_path = 'models/mobilenetv3_grade_model.pth'
    if not os.path.exists(model_path):
        print("Model file not found. Train the model first.")
        return
        
    class_names = ['Grade_A', 'Grade_B', 'Grade_C', 'Reject']
    
    # Re-instantiate model structure
    model = models.mobilenet_v3_small()
    num_ftrs = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(num_ftrs, len(class_names))
    
    model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    model.eval()

    # Create dummy input matching the input shape of the model
    dummy_input = torch.randn(1, 3, 224, 224)
    
    onnx_path = 'models/mobilenetv3_grade_model.onnx'
    
    # Export the model
    torch.onnx.export(
        model, 
        dummy_input, 
        onnx_path, 
        export_params=True,
        opset_version=11, 
        do_constant_folding=True, 
        input_names=['input'], 
        output_names=['output'], 
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
    )
    print(f"Model successfully exported to {onnx_path}")

if __name__ == '__main__':
    export_to_onnx()
