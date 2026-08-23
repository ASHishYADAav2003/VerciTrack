import os
from web3 import Web3
from web3.middleware import geth_poa_middleware
import json

def get_web3_provider():
    rpc_url = os.getenv("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org")
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)
    return w3

def record_on_blockchain(
    batch_id: str,
    quality_grade: str,
    confidence: float,
    image_hash: str,
    result_hash: str,
    model_version: str,
    ipfs_uri: str
) -> str:
    """
    Sends a transaction to the QualityLedger smart contract on Base Sepolia.
    Uses the backend relayer wallet.
    """
    w3 = get_web3_provider()
    
    private_key = os.getenv("RELAYER_PRIVATE_KEY")
    contract_address = os.getenv("CONTRACT_ADDRESS")
    
    if not private_key or not contract_address:
        print("Warning: Blockchain credentials missing. Mocking transaction.")
        return "mock_tx_hash_0x123abc..."

    account = w3.eth.account.from_key(private_key)
    
    # In a real app, load the ABI from the compiled Hardhat artifacts
    # For now, we mock the ABI with just the recordBatch function
    contract_abi = [
        {
            "inputs": [
                {"internalType": "string", "name": "_batchId", "type": "string"},
                {"internalType": "string", "name": "_qualityGrade", "type": "string"},
                {"internalType": "uint16", "name": "_confidenceScoreBP", "type": "uint16"},
                {"internalType": "string", "name": "_imageHash", "type": "string"},
                {"internalType": "string", "name": "_resultHash", "type": "string"},
                {"internalType": "string", "name": "_aiModelVersion", "type": "string"},
                {"internalType": "string", "name": "_ipfsUri", "type": "string"}
            ],
            "name": "recordBatch",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ]
    
    contract = w3.eth.contract(address=contract_address, abi=contract_abi)
    
    # Convert confidence float (e.g. 0.9437) to basis points uint16 (9437)
    confidence_bp = int(confidence * 10000)
    
    # Build transaction
    nonce = w3.eth.get_transaction_count(account.address)
    tx = contract.functions.recordBatch(
        batch_id, quality_grade, confidence_bp, image_hash, result_hash, model_version, ipfs_uri
    ).build_transaction({
        'chainId': 84532, # Base Sepolia chain ID
        'gas': 2000000,
        'maxFeePerGas': w3.to_wei('2', 'gwei'),
        'maxPriorityFeePerGas': w3.to_wei('1', 'gwei'),
        'nonce': nonce,
    })
    
    # Sign transaction
    signed_tx = w3.eth.account.sign_transaction(tx, private_key=private_key)
    
    # Send transaction
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    
    return w3.to_hex(tx_hash)
