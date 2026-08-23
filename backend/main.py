from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import uuid
import os
from dotenv import load_dotenv

# Import services
# from ai_service import get_quality_grade
# from storage_service import upload_to_ipfs, generate_hash
# from db_service import save_batch_record
# from blockchain_service import record_on_blockchain

load_dotenv()

app = FastAPI(title="Quality Grading API")

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Quality Grading API is running"}

@app.post("/api/grade")
async def grade_product(
    file: UploadFile = File(...),
    product_name: str = Form(...),
    origin: str = Form(...),
    farmer_id: str = Form(...)
):
    try:
        # 1. Generate unique Batch ID
        batch_id = str(uuid.uuid4())
        
        # 2. Save file temporarily
        temp_file_path = f"/tmp/{batch_id}_{file.filename}"
        with open(temp_file_path, "wb") as f:
            f.write(await file.read())
            
        # Placeholder for actual service calls
        # 3. AI Grading
        # ai_result = get_quality_grade(temp_file_path)
        ai_result = {"grade": "Grade_A", "confidence": 0.9437, "model_version": "v1.0"}
        
        # 4. Storage & Hashing
        # image_hash = generate_hash(temp_file_path)
        # ipfs_uri = upload_to_ipfs(temp_file_path)
        image_hash = "dummy_image_hash"
        ipfs_uri = "ipfs://dummy_cid"
        result_hash = "dummy_result_hash" # Hash of AI result
        
        # 5. Blockchain Recording
        # tx_hash = record_on_blockchain(
        #     batch_id=batch_id,
        #     quality_grade=ai_result["grade"],
        #     confidence=ai_result["confidence"],
        #     image_hash=image_hash,
        #     result_hash=result_hash,
        #     model_version=ai_result["model_version"],
        #     ipfs_uri=ipfs_uri
        # )
        tx_hash = "dummy_tx_hash"
        
        # 6. Database Saving
        batch_record = {
            "batch_id": batch_id,
            "product_name": product_name,
            "origin": origin,
            "farmer_id": farmer_id,
            "grade": ai_result["grade"],
            "confidence": ai_result["confidence"],
            "ipfs_uri": ipfs_uri,
            "tx_hash": tx_hash
        }
        # save_batch_record(batch_record)
        
        # Cleanup
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            
        return {"status": "success", "data": batch_record}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
