import hashlib
import requests
import os

def generate_hash(file_path: str) -> str:
    """Generates a SHA-256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read and update hash string value in blocks of 4K
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def generate_result_hash(grade: str, confidence: float) -> str:
    """Generates a SHA-256 hash of the grading result."""
    data = f"{grade}:{confidence}".encode('utf-8')
    return hashlib.sha256(data).hexdigest()

def upload_to_ipfs(file_path: str) -> str:
    """
    Uploads a file to IPFS via Pinata API.
    Requires PINATA_API_KEY and PINATA_SECRET_API_KEY in environment.
    """
    api_key = os.getenv("PINATA_API_KEY")
    api_secret = os.getenv("PINATA_SECRET_API_KEY")
    
    if not api_key or not api_secret:
        print("Warning: Pinata API keys not found, returning mock IPFS URI")
        return "ipfs://mock_cid_due_to_missing_keys"
        
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    
    headers = {
        "pinata_api_key": api_key,
        "pinata_secret_api_key": api_secret
    }
    
    with open(file_path, 'rb') as fp:
        files = {"file": (file_path.split("/")[-1], fp)}
        response = requests.post(url, files=files, headers=headers)
        
        if response.status_code == 200:
            cid = response.json()["IpfsHash"]
            return f"ipfs://{cid}"
        else:
            raise Exception(f"Failed to upload to Pinata: {response.text}")
