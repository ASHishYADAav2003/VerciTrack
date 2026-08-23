// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract QualityLedger is Ownable {

    struct BatchRecord {
        string batchId;
        string qualityGrade;
        uint16 confidenceScoreBP; // Basis points (e.g., 9437 for 94.37%)
        string imageHash;
        string resultHash;
        string aiModelVersion;
        string ipfsUri;
        uint256 timestamp;
    }

    mapping(string => BatchRecord) public batches;
    
    // The relayer address is authorized to submit records to save users gas
    address public relayerAddress;

    event BatchRecorded(
        string indexed batchId,
        string qualityGrade,
        uint16 confidenceScoreBP,
        uint256 timestamp
    );

    constructor(address _relayerAddress) Ownable(msg.sender) {
        relayerAddress = _relayerAddress;
    }

    modifier onlyRelayerOrOwner() {
        require(msg.sender == relayerAddress || msg.sender == owner(), "Not authorized");
        _;
    }

    function setRelayerAddress(address _newRelayer) external onlyOwner {
        relayerAddress = _newRelayer;
    }

    function recordBatch(
        string calldata _batchId,
        string calldata _qualityGrade,
        uint16 _confidenceScoreBP,
        string calldata _imageHash,
        string calldata _resultHash,
        string calldata _aiModelVersion,
        string calldata _ipfsUri
    ) external onlyRelayerOrOwner {
        
        require(bytes(batches[_batchId].batchId).length == 0, "Batch already exists");

        BatchRecord memory newRecord = BatchRecord({
            batchId: _batchId,
            qualityGrade: _qualityGrade,
            confidenceScoreBP: _confidenceScoreBP,
            imageHash: _imageHash,
            resultHash: _resultHash,
            aiModelVersion: _aiModelVersion,
            ipfsUri: _ipfsUri,
            timestamp: block.timestamp
        });

        batches[_batchId] = newRecord;

        emit BatchRecorded(_batchId, _qualityGrade, _confidenceScoreBP, block.timestamp);
    }

    function getBatch(string calldata _batchId) external view returns (BatchRecord memory) {
        require(bytes(batches[_batchId].batchId).length > 0, "Batch not found");
        return batches[_batchId];
    }
}
