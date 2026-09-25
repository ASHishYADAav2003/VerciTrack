import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "modelLoaded" in data

def test_grade_batch_grade_A_eligible():
    """Test grading logic for Grade A (<= 5% defect, >= 75% conf)."""
    payload = {
        "batchId": "BATCH-001",
        "samplesClassified": 100,
        "classCounts": {
            "premium": 85,
            "longberry": 10,
            "peaberry": 2,
            "defect": 3
        },
        "classificationConfidences": [0.9] * 100
    }
    response = client.post("/grade-batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["qualityGrade"] == "A"
    assert data["qrEligible"] is True
    assert data["defectPercentage"] == 3.0
    assert data["aiConfidence"] == 90.0
    assert "Eligible for blockchain" in data["reason"]

def test_grade_batch_reject_high_defect():
    """Test grading logic for Reject (> 25% defect)."""
    payload = {
        "batchId": "BATCH-002",
        "samplesClassified": 100,
        "classCounts": {
            "premium": 50,
            "longberry": 10,
            "peaberry": 10,
            "defect": 30
        },
        "classificationConfidences": [0.9] * 100
    }
    response = client.post("/grade-batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["qualityGrade"] == "Reject"
    assert data["qrEligible"] is False
    assert data["defectPercentage"] == 30.0

def test_grade_batch_reject_low_samples():
    """Test grading logic for Reject (samples < 10)."""
    payload = {
        "batchId": "BATCH-003",
        "samplesClassified": 5,
        "classCounts": {
            "premium": 5,
            "longberry": 0,
            "peaberry": 0,
            "defect": 0
        },
        "classificationConfidences": [0.9] * 5
    }
    response = client.post("/grade-batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["qualityGrade"] == "Reject"
    assert data["qrEligible"] is False

def test_grade_batch_reject_low_confidence():
    """Test grading logic for Reject (confidence < 75%)."""
    payload = {
        "batchId": "BATCH-004",
        "samplesClassified": 20,
        "classCounts": {
            "premium": 20,
            "longberry": 0,
            "peaberry": 0,
            "defect": 0
        },
        "classificationConfidences": [0.6] * 20
    }
    response = client.post("/grade-batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["qualityGrade"] == "Reject"
    assert data["qrEligible"] is False
    assert data["aiConfidence"] == 60.0

def test_grade_batch_grade_C_not_eligible():
    """Test grading logic for Grade C (12% < defect <= 25%, not QR eligible)."""
    payload = {
        "batchId": "BATCH-005",
        "samplesClassified": 100,
        "classCounts": {
            "premium": 60,
            "longberry": 10,
            "peaberry": 10,
            "defect": 20
        },
        "classificationConfidences": [0.8] * 100
    }
    response = client.post("/grade-batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["qualityGrade"] == "C"
    assert data["qrEligible"] is False
    assert data["defectPercentage"] == 20.0
