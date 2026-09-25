import os
import io
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
from PIL import Image

# Handle TF logging before importing tensorflow
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import tensorflow as tf

app = FastAPI(title="HAV Coffee Traceability AI Service")

# Allow all origins for now (CORS) - will restrict later for Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "coffee_classifier.h5")
# Make sure this matches the classes used in train_model.py
# We are mapping the trained classes (Dark, Green, Light, Medium) to the required Workflow classes
MODEL_CLASS_NAMES = ['Dark', 'Green', 'Light', 'Medium']
WORKFLOW_CLASS_NAMES = ['Premium', 'Defect', 'Longberry', 'Peaberry']
CLASS_NAMES = WORKFLOW_CLASS_NAMES
IMG_SIZE = (224, 224)

# Global variable to hold the loaded model
model = None

try:
    if os.path.exists(MODEL_PATH):
        model = tf.keras.models.load_model(MODEL_PATH)
        print(f"Model loaded successfully from {MODEL_PATH}")
    else:
        print(f"Warning: Model file not found at {MODEL_PATH}. Inference will fail until model is trained.")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Pydantic models for the batch grading endpoint
class GradeBatchRequest(BaseModel):
    batchId: str
    samplesClassified: int
    classCounts: Dict[str, int]
    classificationConfidences: List[float]

class GradeBatchResponse(BaseModel):
    batchId: str
    classDistribution: Dict[str, str]
    defectPercentage: float
    qualityGrade: str
    aiConfidence: float
    qrEligible: bool
    reason: str

@app.get("/health")
def health_check():
    """
    Health check endpoint to verify server status and model loading.
    """
    return {
        "status": "ok",
        "modelLoaded": model is not None,
        "modelPath": MODEL_PATH,
        "cwd": os.getcwd()
    }

@app.post("/classify-sample")
async def classify_sample(file: UploadFile = File(...)):
    """
    Accepts an uploaded image of a coffee bean sample and returns its classification.
    """
    global model
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded. Please train the model first.")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    try:
        # Read the image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Preprocess the image
        # Resize to 224x224
        image = image.resize(IMG_SIZE)
        img_array = np.array(image)
        
        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        
        # Note: We don't manually normalize to [-1, 1] here because our model 
        # includes the Rescaling layer which handles this.
        
        # Inference
        predictions = model.predict(img_array, verbose=0)[0]
        
        # Get highest confidence class
        predicted_idx = np.argmax(predictions)
        confidence = float(predictions[predicted_idx])
        predicted_class = WORKFLOW_CLASS_NAMES[predicted_idx]

        return {
            "class": predicted_class,
            "confidence": confidence
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/grade-batch", response_model=GradeBatchResponse)
async def grade_batch(payload: GradeBatchRequest):
    """
    Aggregates classification results across a batch and determines quality grade and QR eligibility.
    """
    total_samples = payload.samplesClassified
    
    # Calculate defect percentage (Assuming 'Defect' is the defect class)
    defect_count = payload.classCounts.get("Defect", 0)
    defectPercentage = (defect_count / total_samples) * 100 if total_samples > 0 else 0
    
    # Calculate class distribution percentages
    classDistribution = {}
    for cls in CLASS_NAMES:
        count = payload.classCounts.get(cls, 0)
        pct = (count / total_samples) * 100 if total_samples > 0 else 0
        classDistribution[cls] = f"{pct:.1f}%"
        
    # Calculate AI confidence
    if payload.classificationConfidences:
        aiConfidence = np.mean(payload.classificationConfidences) * 100
    else:
        aiConfidence = 0.0
        
    aiConfidence = round(float(aiConfidence), 1)

    # Determine grade based on provided rules
    qualityGrade = "Reject"
    reason = "Unknown"
    
    if total_samples < 10:
        qualityGrade = "Reject"
        reason = "Reject: Insufficient sample size (less than 10) for classification-based estimate."
    elif aiConfidence < 75:
        qualityGrade = "Reject"
        reason = f"Reject: Model AI confidence is too low to certify ({aiConfidence}% < 75%)."
    elif defectPercentage > 25:
        qualityGrade = "Reject"
        reason = f"Reject: Defect rate exceeds 25% (is {defectPercentage:.1f}%)."
    elif defectPercentage <= 5:
        qualityGrade = "A"
        reason = "Grade A: Defect rate is 5% or lower."
    elif 5 < defectPercentage <= 12:
        qualityGrade = "B"
        reason = "Grade B: Defect rate is between 5% and 12%."
    elif 12 < defectPercentage <= 25:
        qualityGrade = "C"
        reason = "Grade C: Defect rate is between 12% and 25%. Needs manual inspection."

    # Determine QR Eligibility
    qrEligible = False
    if qualityGrade in ("A", "B") and aiConfidence >= 75 and total_samples >= 10:
        qrEligible = True
        
    if qrEligible:
        reason += " Eligible for blockchain QR certification."

    return {
        "batchId": payload.batchId,
        "classDistribution": classDistribution,
        "defectPercentage": defectPercentage,
        "qualityGrade": qualityGrade,
        "aiConfidence": aiConfidence,
        "qrEligible": qrEligible,
        "reason": reason
    }
