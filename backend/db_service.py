import os
from supabase import create_client, Client

def get_supabase_client() -> Client:
    """Initializes and returns a Supabase client."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        print("Warning: Supabase credentials not found. DB operations will be mocked.")
        return None
        
    return create_client(url, key)

def save_batch_record(batch_record: dict):
    """
    Saves the complete batch record to Supabase PostgreSQL.
    """
    supabase = get_supabase_client()
    if not supabase:
        print("Mocking DB save:", batch_record)
        return
        
    data, count = supabase.table('batches').insert(batch_record).execute()
    return data

def get_batch_record(batch_id: str):
    """
    Retrieves a batch record from Supabase.
    """
    supabase = get_supabase_client()
    if not supabase:
        return {"error": "Mock mode, cannot retrieve data"}
        
    response = supabase.table('batches').select("*").eq("batch_id", batch_id).execute()
    if len(response.data) > 0:
        return response.data[0]
    return None
