# HAV Coffee Traceability AI Service

This microservice provides image classification and quality grading for the HAV Coffee Traceability System. It uses a lightweight MobileNetV2 model to classify coffee bean photos and a rule engine to grade batches and determine their eligibility for blockchain certification via QR codes.

## Requirements and Environment

The service runs on Python 3.10+.
First, install the required dependencies:

```bash
pip install -r requirements.txt
```

## Dataset Structure

For training the model, place the USK-Coffee dataset inside a `dataset/` directory in the root of this service (`ai-service/dataset/`). The structure should be exactly:
```
dataset/
├── defect/
│   ├── defect_1.jpg
│   └── ...
├── longberry/
│   ├── longberry_1.jpg
│   └── ...
├── peaberry/
│   ├── peaberry_1.jpg
│   └── ...
└── premium/
    ├── premium_1.jpg
    └── ...
```

## Training the Model

Run the training script to load the dataset, apply data augmentation, and train a transfer-learning MobileNetV2 model for classification:

```bash
python train_model.py
```

This will:
- Load images and apply train/validation splitting (80/20)
- Train the model with early stopping on validation loss
- Save the final model to `models/coffee_classifier.h5`
- Generate a training curve plot at `models/training_history.png`
- Print a classification report on the validation dataset

## Starting the API

Run the FastAPI server using Uvicorn (make sure you are inside the `ai-service` directory):

```bash
uvicorn app.main:app --reload
```
The server will start on `http://127.0.0.1:8000`. It will attempt to load the model from disk if it exists; if it is missing, the server will still start gracefully but the `/classify-sample` endpoint will return a `503` error until training is complete.

## Running Tests

Run the test suite using pytest to verify the batch grading logic:

```bash
pytest test_api.py
```

## API Endpoints

### 1. Health Check
```bash
curl http://127.0.0.1:8000/health
```

### 2. Classify a Single Sample
Classifies a single uploaded coffee bean image.
```bash
curl -X POST "http://127.0.0.1:8000/classify-sample" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@path/to/your/image.jpg"
```
**Example Response:**
```json
{
  "class": "premium",
  "confidence": 0.985
}
```

### 3. Grade Batch
Aggregates classifications across a batch, assigns a quality grade, and determines QR/Blockchain eligibility.
```bash
curl -X POST "http://127.0.0.1:8000/grade-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "BATCH-1001",
    "samplesClassified": 100,
    "classCounts": {
      "premium": 85,
      "longberry": 10,
      "peaberry": 2,
      "defect": 3
    },
    "classificationConfidences": [0.92, 0.95, 0.88, 0.97]
  }'
```
**Example Response:**
```json
{
  "batchId": "BATCH-1001",
  "classDistribution": {
    "defect": "3.0%",
    "longberry": "10.0%",
    "peaberry": "2.0%",
    "premium": "85.0%"
  },
  "defectPercentage": 3.0,
  "qualityGrade": "A",
  "aiConfidence": 93.0,
  "qrEligible": true,
  "reason": "Grade A: Defect rate is 5% or lower. Eligible for blockchain QR certification."
}
```
