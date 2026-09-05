// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * CoffeeTraceability — v2
 *
 * Stores full lab quality data and marketplace listing info on-chain so
 * buyers can verify and compare coffees without trusting any off-chain server.
 *
 * Numeric encoding (avoid floats in Solidity):
 *   humidity        ×10    e.g. 17.2%     → 172
 *   hmf             ×10    e.g. 12.5 mg/kg → 125
 *   diastase        ×10    e.g. 14.5 DN   → 145
 *   freeAcidity     ×10    e.g. 22.4      → 224
 *   proline         ×1     e.g. 420 mg/kg → 420
 *   conductivity    ×1000  e.g. 0.32      → 320
 *   fructoseGlucose ×10    e.g. 68.4%     → 684
 *   reducingSugars  ×10    e.g. 71.2%     → 712
 *   sucrose         ×10    e.g. 1.3%      → 13
 *   ash             ×1000  e.g. 0.18%     → 180
 *   isotopicDiff    ×100   e.g. 0.30‰    → 30
 *   qualityScore    ×1     0-100 direct
 *   priceWei               ETH in wei
 *   jarSizeG               grams direct (500)
 *   colour                 mm Pfund direct (45)
 */
contract CoffeeTraceability {

    struct CoffeeBatch {
        // Identity
        string  batchId;
        string  farmerName;
        string  origin;
        string  coffeeType;
        string  pdfHash;
        string  producerDeclaration;
        // Basic quality
        uint256 humidity;
        uint256 hmf;
        uint256 colour;
        uint256 harvestYear;
        // Extended quality
        uint256 diastase;
        uint256 freeAcidity;
        uint256 proline;
        uint256 conductivity;
        uint256 fructoseGlucose;
        uint256 reducingSugars;
        uint256 sucrose;
        uint256 ash;
        uint256 isotopicDiff;
        // Quality score
        uint256 qualityScore;
        string  qualityTier;
        // Marketplace
        uint256 priceWei;
        uint256 jarSizeG;
        uint256 totalStock;
        uint256 soldCount;
        // Meta
        uint256 timestamp;
        address registeredBy;
        bool    exists;
    }

    struct Purchase {
        address buyer;
        uint256 pricePaid;
        uint256 timestamp;
    }

    mapping(string => CoffeeBatch) private batches;
    mapping(string => Purchase[]) private purchases;
    string[] private batchIds;

    event BatchRegistered(
        string  batchId,
        string  coffeeType,
        string  origin,
        uint256 qualityScore,
        string  qualityTier,
        uint256 timestamp,
        address registeredBy
    );

    event BatchUpdated(
        string  batchId,
        uint256 qualityScore,
        string  qualityTier,
        uint256 timestamp,
        address updatedBy
    );

    event BatchPurchased(
        string  batchId,
        address buyer,
        address farmerWallet,
        uint256 pricePaid,
        uint256 timestamp
    );

    /**
     * _extParams[9]:
     *   [0] diastase      ×10
     *   [1] freeAcidity   ×10
     *   [2] proline       ×1
     *   [3] conductivity  ×1000
     *   [4] fructoseGlucose ×10
     *   [5] reducingSugars  ×10
     *   [6] sucrose       ×10
     *   [7] ash           ×1000
     *   [8] isotopicDiff  ×100
     */
    function registerBatch(
        string  memory _batchId,
        string  memory _farmerName,
        string  memory _origin,
        string  memory _coffeeType,
        string  memory _pdfHash,
        string  memory _producerDeclaration,
        uint256 _humidity,
        uint256 _hmf,
        uint256 _colour,
        uint256 _harvestYear,
        uint256[9] memory _extParams,
        uint256 _qualityScore,
        string  memory _qualityTier,
        uint256 _priceWei,
        uint256 _jarSizeG,
        uint256 _totalStock
    ) public {
        require(!batches[_batchId].exists, "Batch already registered");
        require(bytes(_batchId).length > 0, "Batch ID required");

        batches[_batchId] = CoffeeBatch({
            batchId:             _batchId,
            farmerName:       _farmerName,
            origin:              _origin,
            coffeeType:           _coffeeType,
            pdfHash:             _pdfHash,
            producerDeclaration: _producerDeclaration,
            humidity:            _humidity,
            hmf:                 _hmf,
            colour:              _colour,
            harvestYear:         _harvestYear,
            diastase:            _extParams[0],
            freeAcidity:         _extParams[1],
            proline:             _extParams[2],
            conductivity:        _extParams[3],
            fructoseGlucose:     _extParams[4],
            reducingSugars:      _extParams[5],
            sucrose:             _extParams[6],
            ash:                 _extParams[7],
            isotopicDiff:        _extParams[8],
            qualityScore:        _qualityScore,
            qualityTier:         _qualityTier,
            priceWei:            _priceWei,
            jarSizeG:            _jarSizeG,
            totalStock:          _totalStock,
            soldCount:           0,
            timestamp:           block.timestamp,
            registeredBy:        msg.sender,
            exists:              true
        });

        batchIds.push(_batchId);

        emit BatchRegistered(
            _batchId, _coffeeType, _origin,
            _qualityScore, _qualityTier,
            block.timestamp, msg.sender
        );
    }

    function updateBatch(
        string  memory _batchId,
        string  memory _farmerName,
        string  memory _origin,
        string  memory _coffeeType,
        string  memory _pdfHash,
        string  memory _producerDeclaration,
        uint256 _humidity,
        uint256 _hmf,
        uint256 _colour,
        uint256 _harvestYear,
        uint256[9] memory _extParams,
        uint256 _qualityScore,
        string  memory _qualityTier,
        uint256 _priceWei,
        uint256 _jarSizeG,
        uint256 _totalStock
    ) public {
        require(batches[_batchId].exists, "Batch not found");

        CoffeeBatch storage b = batches[_batchId];
        b.farmerName       = _farmerName;
        b.origin              = _origin;
        b.coffeeType           = _coffeeType;
        b.pdfHash             = _pdfHash;
        b.producerDeclaration = _producerDeclaration;
        b.humidity            = _humidity;
        b.hmf                 = _hmf;
        b.colour              = _colour;
        b.harvestYear         = _harvestYear;
        b.diastase            = _extParams[0];
        b.freeAcidity         = _extParams[1];
        b.proline             = _extParams[2];
        b.conductivity        = _extParams[3];
        b.fructoseGlucose     = _extParams[4];
        b.reducingSugars      = _extParams[5];
        b.sucrose             = _extParams[6];
        b.ash                 = _extParams[7];
        b.isotopicDiff        = _extParams[8];
        b.qualityScore        = _qualityScore;
        b.qualityTier         = _qualityTier;
        b.priceWei            = _priceWei;
        b.jarSizeG            = _jarSizeG;
        b.totalStock          = _totalStock;

        emit BatchUpdated(_batchId, _qualityScore, _qualityTier, block.timestamp, msg.sender);
    }

    function purchaseBatch(string memory _batchId) public payable {
        CoffeeBatch storage b = batches[_batchId];
        require(b.exists, "Batch not found");
        require(b.priceWei > 0, "No price set for this batch");
        require(msg.value >= b.priceWei, "Insufficient ETH sent");
        require(b.totalStock == 0 || b.soldCount < b.totalStock, "Out of stock");

        b.soldCount += 1;
        purchases[_batchId].push(Purchase({
            buyer:     msg.sender,
            pricePaid: msg.value,
            timestamp: block.timestamp
        }));

        payable(b.registeredBy).transfer(msg.value);

        emit BatchPurchased(_batchId, msg.sender, b.registeredBy, msg.value, block.timestamp);
    }

    function getBatchCore(string memory _batchId)
        public view
        returns (
            string memory batchId,
            string memory farmerName,
            string memory origin,
            string memory coffeeType,
            string memory pdfHash,
            string memory producerDeclaration,
            bool exists
        )
    {
        CoffeeBatch memory b = batches[_batchId];
        return (b.batchId, b.farmerName, b.origin, b.coffeeType,
                b.pdfHash, b.producerDeclaration, b.exists);
    }

    function getBatchMetrics(string memory _batchId)
        public view
        returns (
            uint256 humidity,
            uint256 hmf,
            uint256 colour,
            uint256 harvestYear,
            uint256 timestamp,
            address registeredBy
        )
    {
        CoffeeBatch memory b = batches[_batchId];
        return (b.humidity, b.hmf, b.colour, b.harvestYear, b.timestamp, b.registeredBy);
    }

    function getBatchQuality(string memory _batchId)
        public view
        returns (
            uint256 qualityScore,
            string memory qualityTier,
            uint256 humidity,
            uint256 hmf,
            uint256 diastase,
            uint256 freeAcidity,
            uint256 proline,
            uint256 conductivity,
            uint256 fructoseGlucose,
            uint256 reducingSugars,
            uint256 sucrose,
            uint256 ash,
            uint256 isotopicDiff,
            uint256 colour
        )
    {
        CoffeeBatch memory b = batches[_batchId];
        return (
            b.qualityScore, b.qualityTier,
            b.humidity, b.hmf, b.diastase,
            b.freeAcidity, b.proline, b.conductivity,
            b.fructoseGlucose, b.reducingSugars,
            b.sucrose, b.ash, b.isotopicDiff,
            b.colour
        );
    }

    function getBatchListing(string memory _batchId)
        public view
        returns (
            uint256 priceWei,
            uint256 jarSizeG,
            uint256 totalStock,
            uint256 soldCount,
            uint256 harvestYear,
            address registeredBy
        )
    {
        CoffeeBatch memory b = batches[_batchId];
        return (b.priceWei, b.jarSizeG, b.totalStock, b.soldCount, b.harvestYear, b.registeredBy);
    }

    function getPurchaseHistory(string memory _batchId)
        public view
        returns (
            address[] memory buyers,
            uint256[] memory pricesPaid,
            uint256[] memory timestamps
        )
    {
        Purchase[] memory ps = purchases[_batchId];
        buyers     = new address[](ps.length);
        pricesPaid = new uint256[](ps.length);
        timestamps = new uint256[](ps.length);
        for (uint256 i = 0; i < ps.length; i++) {
            buyers[i]     = ps[i].buyer;
            pricesPaid[i] = ps[i].pricePaid;
            timestamps[i] = ps[i].timestamp;
        }
    }

    function getAllBatchIds() public view returns (string[] memory) {
        return batchIds;
    }
}
