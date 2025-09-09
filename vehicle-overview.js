// Vehicle Overview by Category JavaScript

class VehicleOverview {
    constructor() {
        this.vehicleData = null;
        this.currentLevel = 'model';
        this.selectedVehicle = null;
        this.selectedTrim = null;
        this.selectedVariant = null;
        this.availableTrims = [];
        this.availableVariants = [];
        
        this.categoryMappings = {
            'Powertrain & Performance': {
                icon: '⚡',
                points: ['Engine Overview', 'Transmission', 'Fuel Economy']
            },
            'Handling & Mechanics': {
                icon: '🔧',
                points: ['Suspension', 'Steering', 'Braking System']
            },
            'Towing & Off-road Capacity': {
                icon: '🚗',
                points: ['Towing Capacity', 'Ground Clearance', '4WD System']
            },
            'Exterior & Dimensions': {
                icon: '📏',
                points: ['Dimensions', 'Body Style', 'Wheels & Tyres']
            },
            'Interior': {
                icon: '🪑',
                points: ['Seating', 'Cargo Space', 'Comfort Features']
            },
            'Technology': {
                icon: '💻',
                points: ['Infotainment', 'Connectivity', 'Driver Assistance']
            },
            'Safety & Security': {
                icon: '🛡️',
                points: ['Safety Features', 'Airbags', 'Security Systems']
            },
            'Cost of Ownership': {
                icon: '💰',
                points: ['Pricing', 'Fuel Costs', 'Service Intervals']
            }
        };

        this.init();
    }

    async init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Data source tabs
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchDataSource(e.target.dataset.source);
            });
        });

        // Preloaded data selection
        document.getElementById('preloaded-data-select').addEventListener('change', (e) => {
            this.onPreloadedDataChange(e.target.value);
        });

        // File upload
        document.getElementById('vehicle-data-file').addEventListener('change', (e) => {
            this.onFileUpload(e.target.files[0]);
        });

        // Level selection
        document.querySelectorAll('.level-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.onLevelChange(e.target.dataset.level);
            });
        });

        // Trim selection
        document.getElementById('trim-select').addEventListener('change', (e) => {
            this.onTrimChange(e.target.value);
        });

        // Variant selection
        document.getElementById('variant-select').addEventListener('change', (e) => {
            this.onVariantChange(e.target.value);
        });
    }

    switchDataSource(source) {
        // Update active tab
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-source="${source}"]`).classList.add('active');

        // Update active panel
        document.querySelectorAll('.data-source-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${source}-panel`).classList.add('active');

        // Reset selections
        if (source === 'preloaded') {
            document.getElementById('preloaded-data-select').value = '';
            this.resetAllSelections();
        } else {
            document.getElementById('vehicle-data-file').value = '';
            this.resetAllSelections();
        }
    }

    async onPreloadedDataChange(filename) {
        if (!filename) {
            this.hideCategoryOverview();
            return;
        }

        try {
            await this.loadVehicleData(filename);
            this.displayVehicleSelection();
        } catch (error) {
            this.showError('Failed to load vehicle data: ' + error.message);
        }
    }

    async onFileUpload(file) {
        if (!file) {
            this.hideCategoryOverview();
            return;
        }

        try {
            this.showLoading();
            const text = await file.text();
            this.vehicleData = JSON.parse(text);
            this.displayVehicleSelection();
        } catch (error) {
            this.showError('Failed to load file: ' + error.message);
        }
    }

    async loadVehicleData(filename) {
        try {
            this.showLoading();
            const response = await fetch(`vehicleData/${filename}`);
            this.vehicleData = await response.json();
        } catch (error) {
            throw new Error('Failed to load vehicle data: ' + error.message);
        }
    }

    displayVehicleSelection() {
        if (!this.vehicleData?.data || this.vehicleData.data.length === 0) {
            this.showError('No vehicle data available');
            return;
        }

        this.populateTrimAndVariantOptions();
        this.updateSelectionVisibility();
        this.displayCategoryOverview();
    }

    populateTrimAndVariantOptions() {
        if (!this.vehicleData?.data) return;

        // Get unique trims
        const trims = [...new Set(this.vehicleData.data.map(v => v.vehicle?.trim).filter(Boolean))];
        this.availableTrims = trims;

        // Get unique variants (versionName)
        const variants = [...new Set(this.vehicleData.data.map(v => v.vehicle?.versionName).filter(Boolean))];
        this.availableVariants = variants;

        // Populate trim dropdown
        const trimSelect = document.getElementById('trim-select');
        trimSelect.innerHTML = '<option value="">Choose a trim...</option>';
        trims.forEach(trim => {
            const option = document.createElement('option');
            option.value = trim;
            option.textContent = trim;
            trimSelect.appendChild(option);
        });

        // Populate variant dropdown
        const variantSelect = document.getElementById('variant-select');
        variantSelect.innerHTML = '<option value="">Choose a variant...</option>';
        variants.forEach(variant => {
            const option = document.createElement('option');
            option.value = variant;
            option.textContent = variant;
            variantSelect.appendChild(option);
        });
    }

    updateSelectionVisibility() {
        const trimSelection = document.getElementById('trim-selection');
        const variantSelection = document.getElementById('variant-selection');

        switch (this.currentLevel) {
            case 'model':
                trimSelection.style.display = 'none';
                variantSelection.style.display = 'none';
                break;
            case 'trim':
                trimSelection.style.display = 'block';
                variantSelection.style.display = 'none';
                break;
            case 'variant':
                trimSelection.style.display = 'block';
                variantSelection.style.display = 'block';
                break;
        }
    }

    resetAllSelections() {
        this.selectedVehicle = null;
        this.selectedTrim = null;
        this.selectedVariant = null;
        this.availableTrims = [];
        this.availableVariants = [];
        
        document.getElementById('trim-select').innerHTML = '<option value="">Choose a trim...</option>';
        document.getElementById('variant-select').innerHTML = '<option value="">Choose a variant...</option>';
        document.getElementById('trim-selection').style.display = 'none';
        document.getElementById('variant-selection').style.display = 'none';
        
        this.hideCategoryOverview();
    }

    onLevelChange(level) {
        // Update active button
        document.querySelectorAll('.level-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-level="${level}"]`).classList.add('active');
        
        this.currentLevel = level;
        this.updateSelectionVisibility();
        
        if (this.vehicleData) {
            this.displayCategoryOverview();
        }
    }

    onTrimChange(trim) {
        this.selectedTrim = trim;
        
        // Update variant dropdown based on selected trim
        if (trim && this.vehicleData) {
            const filteredVariants = this.vehicleData.data
                .filter(v => v.vehicle?.trim === trim)
                .map(v => v.vehicle?.versionName)
                .filter(Boolean);
            
            const variantSelect = document.getElementById('variant-select');
            variantSelect.innerHTML = '<option value="">Choose a variant...</option>';
            [...new Set(filteredVariants)].forEach(variant => {
                const option = document.createElement('option');
                option.value = variant;
                option.textContent = variant;
                variantSelect.appendChild(option);
            });
        }
        
        this.displayCategoryOverview();
    }

    onVariantChange(variant) {
        this.selectedVariant = variant;
        this.displayCategoryOverview();
    }

    displayCategoryOverview() {
        if (!this.vehicleData?.data) return;

        const container = document.getElementById('category-overview');
        container.innerHTML = '';

        // Determine which vehicles to use for data aggregation
        let vehiclesToAnalyze = this.getVehiclesToAnalyze();
        
        if (vehiclesToAnalyze.length === 0) {
            this.hideCategoryOverview();
            return;
        }

        Object.entries(this.categoryMappings).forEach(([categoryName, categoryInfo]) => {
            const categoryCard = this.createCategoryCard(categoryName, categoryInfo, vehiclesToAnalyze);
            container.appendChild(categoryCard);
        });

        this.showCategoryOverview();
    }

    getVehiclesToAnalyze() {
        if (!this.vehicleData?.data) return [];

        let vehicles = this.vehicleData.data;

        // Filter by trim if selected
        if (this.selectedTrim) {
            vehicles = vehicles.filter(v => v.vehicle?.trim === this.selectedTrim);
        }

        // Filter by variant if selected
        if (this.selectedVariant) {
            vehicles = vehicles.filter(v => v.vehicle?.versionName === this.selectedVariant);
        }

        return vehicles;
    }

    createCategoryCard(categoryName, categoryInfo, vehiclesToAnalyze) {
        const card = document.createElement('div');
        card.className = 'category-card';

        const header = document.createElement('div');
        header.className = 'category-header';

        const icon = document.createElement('div');
        icon.className = 'category-icon';
        icon.textContent = categoryInfo.icon;

        const title = document.createElement('h3');
        title.className = 'category-title';
        title.textContent = categoryName;

        header.appendChild(icon);
        header.appendChild(title);

        const pointsContainer = document.createElement('div');
        pointsContainer.className = 'category-points';

        categoryInfo.points.forEach(pointName => {
            const point = this.createCategoryPoint(pointName, categoryName, vehiclesToAnalyze);
            pointsContainer.appendChild(point);
        });

        card.appendChild(header);
        card.appendChild(pointsContainer);

        return card;
    }

    createCategoryPoint(pointName, categoryName, vehiclesToAnalyze) {
        const point = document.createElement('div');
        point.className = 'category-point';

        const title = document.createElement('div');
        title.className = 'point-title';
        title.textContent = pointName;

        const content = document.createElement('div');
        content.className = 'point-content';
        
        // Get relevant data based on category and point
        const data = this.getCategoryData(categoryName, pointName, vehiclesToAnalyze);
        content.innerHTML = this.formatCategoryData(data, vehiclesToAnalyze.length, categoryName, pointName);

        point.appendChild(title);
        point.appendChild(content);

        return point;
    }

    getCategoryData(categoryName, pointName, vehiclesToAnalyze) {
        if (!vehiclesToAnalyze || vehiclesToAnalyze.length === 0) return {};

        const data = {};

        switch (categoryName) {
            case 'Powertrain & Performance':
                switch (pointName) {
                    case 'Engine Overview':
                        data.engineLiters = this.getUniqueValues(vehiclesToAnalyze, 'engineLiters');
                        data.engineCylinders = this.getUniqueValues(vehiclesToAnalyze, 'engineNumberOfCylinders');
                        data.engineConfiguration = this.getUniqueValues(vehiclesToAnalyze, 'engineConfiguration');
                        data.powertrainType = this.getUniqueValues(vehiclesToAnalyze, 'powertrainType');
                        data.fuelType = this.getUniqueValues(vehiclesToAnalyze, 'fuelType');
                        data.compressor = this.getUniqueValues(vehiclesToAnalyze, 'compressor');
                        data.powerMaximumPowerKw = this.getUniqueValues(vehiclesToAnalyze, 'powerMaximumPowerKw');
                        data.powerMaximumTorqueNm = this.getUniqueValues(vehiclesToAnalyze, 'powerMaximumTorqueNm');
                        data.powerMaximumPowerKwElectricMotor = this.getUniqueValues(vehiclesToAnalyze, 'powerMaximumPowerKwElectricMotor');
                        data.powerMaximumTorqueNmElectricMotor = this.getUniqueValues(vehiclesToAnalyze, 'powerMaximumTorqueNmElectricMotor');
                        break;
                    case 'Transmission':
                        data.transmissionDescription = this.generateTransmissionDescription(vehiclesToAnalyze);
                        break;
                    case 'Fuel Economy':
                        data.fuelConsumption = this.getFuelConsumptionData(vehiclesToAnalyze);
                        data.electricRange = this.getElectricRangeData(vehiclesToAnalyze);
                        break;
                }
                break;

            case 'Handling & Mechanics':
                switch (pointName) {
                    case 'Suspension':
                        data.hasHighLowGearData = this.getUniqueValues(vehiclesToAnalyze, 'hasHighLowGearData');
                        data.drivenWheels = this.getUniqueValues(vehiclesToAnalyze, 'drivenWheels');
                        break;
                    case 'Steering':
                        data.drivenWheels = this.getUniqueValues(vehiclesToAnalyze, 'drivenWheels');
                        data.vehicleType = this.getUniqueValues(vehiclesToAnalyze, 'vehicleType');
                        break;
                    case 'Braking System':
                        data.vehicleType = this.getUniqueValues(vehiclesToAnalyze, 'vehicleType');
                        data.bodyType = this.getUniqueValues(vehiclesToAnalyze, 'bodyType');
                        break;
                }
                break;

            case 'Towing & Off-road Capacity':
                switch (pointName) {
                    case 'Towing Capacity':
                        data.drivenWheels = this.getUniqueValues(vehiclesToAnalyze, 'drivenWheels');
                        data.bodyType = this.getUniqueValues(vehiclesToAnalyze, 'bodyType');
                        data.vehicleType = this.getUniqueValues(vehiclesToAnalyze, 'vehicleType');
                        break;
                    case 'Ground Clearance':
                        data.bodyType = this.getUniqueValues(vehiclesToAnalyze, 'bodyType');
                        data.drivenWheels = this.getUniqueValues(vehiclesToAnalyze, 'drivenWheels');
                        data.hasHighLowGearData = this.getUniqueValues(vehiclesToAnalyze, 'hasHighLowGearData');
                        break;
                    case '4WD System':
                        data.drivenWheels = this.getUniqueValues(vehiclesToAnalyze, 'drivenWheels');
                        data.hasHighLowGearData = this.getUniqueValues(vehiclesToAnalyze, 'hasHighLowGearData');
                        data.transmissionType = this.getUniqueValues(vehiclesToAnalyze, 'transmissionType');
                        break;
                }
                break;

            case 'Exterior & Dimensions':
                switch (pointName) {
                    case 'Dimensions':
                        data.numberOfDoors = this.getUniqueValues(vehiclesToAnalyze, 'numberOfDoors');
                        data.bodyType = this.getUniqueValues(vehiclesToAnalyze, 'bodyType');
                        data.vehicleType = this.getUniqueValues(vehiclesToAnalyze, 'vehicleType');
                        break;
                    case 'Body Style':
                        data.bodyType = this.getUniqueValues(vehiclesToAnalyze, 'bodyType');
                        data.vehicleType = this.getUniqueValues(vehiclesToAnalyze, 'vehicleType');
                        data.jatoRegionalSegment = this.getUniqueValues(vehiclesToAnalyze, 'jatoRegionalSegment');
                        break;
                    case 'Wheels & Tyres':
                        data.drivenWheels = this.getUniqueValues(vehiclesToAnalyze, 'drivenWheels');
                        data.bodyType = this.getUniqueValues(vehiclesToAnalyze, 'bodyType');
                        data.vehicleType = this.getUniqueValues(vehiclesToAnalyze, 'vehicleType');
                        break;
                }
                break;

            case 'Interior':
                switch (pointName) {
                    case 'Seating':
                        data.numberOfDoors = this.getUniqueValues(vehiclesToAnalyze, 'numberOfDoors');
                        data.bodyType = this.getUniqueValues(vehiclesToAnalyze, 'bodyType');
                        data.vehicleType = this.getUniqueValues(vehiclesToAnalyze, 'vehicleType');
                        break;
                    case 'Cargo Space':
                        data.bodyType = this.getUniqueValues(vehiclesToAnalyze, 'bodyType');
                        data.vehicleType = this.getUniqueValues(vehiclesToAnalyze, 'vehicleType');
                        data.numberOfDoors = this.getUniqueValues(vehiclesToAnalyze, 'numberOfDoors');
                        break;
                    case 'Comfort Features':
                        data.vehicleType = this.getUniqueValues(vehiclesToAnalyze, 'vehicleType');
                        data.bodyType = this.getUniqueValues(vehiclesToAnalyze, 'bodyType');
                        data.powertrainType = this.getUniqueValues(vehiclesToAnalyze, 'powertrainType');
                        break;
                }
                break;

            case 'Technology':
                switch (pointName) {
                    case 'Infotainment':
                        data.powertrainType = this.getUniqueValues(vehiclesToAnalyze, 'powertrainType');
                        data.hasEvData = this.getUniqueValues(vehiclesToAnalyze, 'hasEvData');
                        data.vehicleType = this.getUniqueValues(vehiclesToAnalyze, 'vehicleType');
                        break;
                    case 'Connectivity':
                        data.hasEvData = this.getUniqueValues(vehiclesToAnalyze, 'hasEvData');
                        data.powertrainType = this.getUniqueValues(vehiclesToAnalyze, 'powertrainType');
                        data.vehicleType = this.getUniqueValues(vehiclesToAnalyze, 'vehicleType');
                        break;
                    case 'Driver Assistance':
                        data.hasEvData = this.getUniqueValues(vehiclesToAnalyze, 'hasEvData');
                        data.vehicleType = this.getUniqueValues(vehiclesToAnalyze, 'vehicleType');
                        data.bodyType = this.getUniqueValues(vehiclesToAnalyze, 'bodyType');
                        break;
                }
                break;

            case 'Safety & Security':
                switch (pointName) {
                    case 'Safety Features':
                        data.vehicleType = this.getUniqueValues(vehiclesToAnalyze, 'vehicleType');
                        data.bodyType = this.getUniqueValues(vehiclesToAnalyze, 'bodyType');
                        data.jatoRegionalSegment = this.getUniqueValues(vehiclesToAnalyze, 'jatoRegionalSegment');
                        break;
                    case 'Airbags':
                        data.vehicleType = this.getUniqueValues(vehiclesToAnalyze, 'vehicleType');
                        data.bodyType = this.getUniqueValues(vehiclesToAnalyze, 'bodyType');
                        data.numberOfDoors = this.getUniqueValues(vehiclesToAnalyze, 'numberOfDoors');
                        break;
                    case 'Security Systems':
                        data.vehicleType = this.getUniqueValues(vehiclesToAnalyze, 'vehicleType');
                        data.bodyType = this.getUniqueValues(vehiclesToAnalyze, 'bodyType');
                        data.powertrainType = this.getUniqueValues(vehiclesToAnalyze, 'powertrainType');
                        break;
                }
                break;

            case 'Cost of Ownership':
                switch (pointName) {
                    case 'Pricing':
                        data.price = this.getPriceRange(vehiclesToAnalyze);
                        data.modelYear = this.getUniqueValues(vehiclesToAnalyze, 'modelYear');
                        data.isCurrent = this.getUniqueValues(vehiclesToAnalyze, 'isCurrent');
                        break;
                    case 'Fuel Costs':
                        data.fuelType = this.getUniqueValues(vehiclesToAnalyze, 'fuelType');
                        data.powertrainType = this.getUniqueValues(vehiclesToAnalyze, 'powertrainType');
                        data.hasEvData = this.getUniqueValues(vehiclesToAnalyze, 'hasEvData');
                        break;
                    case 'Service Intervals':
                        data.modelYear = this.getUniqueValues(vehiclesToAnalyze, 'modelYear');
                        data.isCurrent = this.getUniqueValues(vehiclesToAnalyze, 'isCurrent');
                        data.vehicleType = this.getUniqueValues(vehiclesToAnalyze, 'vehicleType');
                        break;
                }
                break;
        }

        return data;
    }

    getUniqueValues(vehicles, property) {
        const values = vehicles
            .map(v => v.vehicle?.[property] || v.vehicleGeneralInfo?.[property] || v.vehicle?.performance?.[property])
            .filter(value => value !== null && value !== undefined && value !== '');
        
        const uniqueValues = [...new Set(values)];
        return uniqueValues.length === 1 ? uniqueValues[0] : uniqueValues;
    }

    getPriceRange(vehicles) {
        const prices = vehicles
            .map(v => v.vehicle?.price)
            .filter(price => price !== null && price !== undefined && !isNaN(price));
        
        if (prices.length === 0) return null;
        
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        if (minPrice === maxPrice) {
            return minPrice;
        }
        
        return {
            min: minPrice,
            max: maxPrice,
            range: `${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}`
        };
    }


    formatCategoryData(data, vehicleCount = 1, categoryName = '', pointName = '') {
        if (!data || Object.keys(data).length === 0) {
            return '<span style="color: var(--text-muted); font-style: italic;">No data available</span>';
        }

        // Special formatting for Engine Overview
        if (categoryName === 'Powertrain & Performance' && pointName === 'Engine Overview') {
            return this.formatEngineOverviewSentence(data, vehicleCount);
        }

        // Special formatting for Transmission
        if (categoryName === 'Powertrain & Performance' && pointName === 'Transmission') {
            return this.formatTransmissionDescription(data, vehicleCount);
        }

        // Special formatting for Fuel Economy
        if (categoryName === 'Powertrain & Performance' && pointName === 'Fuel Economy') {
            return this.formatFuelEconomySentence(data, vehicleCount);
        }

        let html = '<ul style="margin: 0; padding-left: 1.2rem;">';
        
        Object.entries(data).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                if (Array.isArray(value)) {
                    if (value.length > 0) {
                        const formattedValues = value.map(v => this.formatValue(v)).join(', ');
                        html += `<li><strong>${this.formatKey(key)}:</strong> ${formattedValues}</li>`;
                    }
                } else if (typeof value === 'object' && value.range) {
                    // Handle price range
                    html += `<li><strong>${this.formatKey(key)}:</strong> ${value.range}</li>`;
                } else {
                    html += `<li><strong>${this.formatKey(key)}:</strong> ${this.formatValue(value)}</li>`;
                }
            }
        });
        
        if (vehicleCount > 1) {
            html += `<li style="color: var(--text-muted); font-style: italic; margin-top: 0.5rem;">Based on ${vehicleCount} vehicles</li>`;
        }
        
        html += '</ul>';
        return html;
    }

    formatTransmissionDescription(data, vehicleCount = 1) {
        const description = data.transmissionDescription;
        
        if (!description || description === 'No transmission data available') {
            return '<span style="color: var(--text-muted); font-style: italic;">No transmission data available</span>';
        }
        
        // Add vehicle count note if multiple vehicles
        let html = `<p style="margin: 0; line-height: 1.4;">${description}</p>`;
        if (vehicleCount > 1) {
            html += `<p style="color: var(--text-muted); font-style: italic; font-size: 0.9em; margin: 0.5rem 0 0 0;">Based on ${vehicleCount} vehicles</p>`;
        }
        
        return html;
    }

    formatEngineOverviewSentence(data, vehicleCount = 1) {
        // Helper function to ensure we're working with arrays
        const ensureArray = (value) => Array.isArray(value) ? value : (value ? [value] : []);
        
        // Get all vehicle data arrays
        const liters = ensureArray(data.engineLiters);
        const cylinders = ensureArray(data.engineCylinders);
        const configurations = ensureArray(data.engineConfiguration);
        const powertrainTypes = ensureArray(data.powertrainType);
        const fuelTypes = ensureArray(data.fuelType);
        const compressors = ensureArray(data.compressor);
        const powerKw = ensureArray(data.powerMaximumPowerKw);
        const torqueNm = ensureArray(data.powerMaximumTorqueNm);
        const powerKwElectric = ensureArray(data.powerMaximumPowerKwElectricMotor);
        const torqueNmElectric = ensureArray(data.powerMaximumTorqueNmElectricMotor);
        
        // Create engine options array
        const engineOptions = [];
        
        // Process each engine option
        for (let i = 0; i < Math.max(liters.length, powertrainTypes.length); i++) {
            const liter = liters[i];
            const cylinder = cylinders[i];
            const config = configurations[i];
            const powertrainType = powertrainTypes[i];
            const fuelType = fuelTypes[i];
            const compressor = compressors[i];
            const power = powerKw[i];
            const torque = torqueNm[i];
            const powerElectric = powerKwElectric[i];
            const torqueElectric = torqueNmElectric[i];
            
            // Skip if no displacement and not electric
            if (!liter && !this.isElectricPowertrain(powertrainType)) {
                continue;
            }
            
            const option = this.createEngineOption(liter, cylinder, config, powertrainType, fuelType, compressor, power, torque, powerElectric, torqueElectric);
            if (option) {
                engineOptions.push(option);
            }
        }
        
        // Deduplicate and sort options
        const uniqueOptions = this.deduplicateAndSortOptions(engineOptions);
        
        // Generate sentence
        const sentence = this.generateEngineSentence(uniqueOptions);
        
        // Add vehicle count note if multiple vehicles
        let html = `<p style="margin: 0; line-height: 1.4;">${sentence}</p>`;
        if (vehicleCount > 1) {
            html += `<p style="color: var(--text-muted); font-style: italic; font-size: 0.9em; margin: 0.5rem 0 0 0;">Based on ${vehicleCount} vehicles</p>`;
        }
        
        return html;
    }
    
    isElectricPowertrain(powertrainType) {
        if (!powertrainType) return false;
        const type = powertrainType.toLowerCase();
        return type.includes('battery electric') && !type.includes('hybrid');
    }
    
    isHybridPowertrain(powertrainType) {
        if (!powertrainType) return false;
        const type = powertrainType.toLowerCase();
        return type.includes('hybrid');
    }
    
    createEngineOption(liter, cylinder, config, powertrainType, fuelType, compressor, power, torque, powerElectric, torqueElectric) {
        const powertrain = powertrainType ? powertrainType.toLowerCase() : '';
        
        // Handle electric powertrains
        if (this.isElectricPowertrain(powertrain)) {
            const powerInfo = this.formatPowerInfo(powerElectric, torqueElectric);
            return {
                type: 'electric',
                description: `battery-electric powertrain${powerInfo}`,
                sortOrder: 1
            };
        }
        
        // Handle hybrid powertrains
        if (this.isHybridPowertrain(powertrain)) {
            // If engine details exist, describe them then append "hybrid"
            if (liter) {
                const displacement = this.formatDisplacement(liter);
                const cylinderDesc = this.formatCylinderDescription(cylinder, config);
                const compressorDesc = this.formatCompressor(compressor);
                const powerInfo = this.formatPowerInfo(powerElectric, torqueElectric);
                
                let description = `${displacement}${cylinderDesc}${compressorDesc} hybrid${powerInfo}`;
                return {
                    type: 'hybrid',
                    description: description,
                    sortOrder: 2
                };
            } else {
                // Fall back to generic hybrid powertrain if no engine details
                const powerInfo = this.formatPowerInfo(powerElectric, torqueElectric);
                return {
                    type: 'hybrid',
                    description: `hybrid powertrain${powerInfo}`,
                    sortOrder: 2
                };
            }
        }
        
        // Handle combustion engines
        if (!liter) return null;
        
        const displacement = this.formatDisplacement(liter);
        const cylinderDesc = this.formatCylinderDescription(cylinder, config);
        const compressorDesc = this.formatCompressor(compressor);
        const fuelDesc = this.formatFuelType(fuelType);
        const powerInfo = this.formatPowerInfo(power, torque);
        
        let description = `${displacement}${fuelDesc}${cylinderDesc}${compressorDesc} engine${powerInfo}`;
        return {
            type: 'combustion',
            description: description,
            sortOrder: 3
        };
    }
    
    formatDisplacement(liter) {
        if (!liter) return '';
        const num = parseFloat(liter);
        return `${num}-litre `;
    }
    
    formatCylinderDescription(cylinder, config) {
        if (!cylinder) return '';
        
        let configText = '';
        if (config) {
            const configLower = config.toLowerCase();
            if (configLower === 'in-line') {
                configText = 'inline-';
            } else if (configLower === 'v') {
                configText = 'V';
            } else if (configLower === 'flat') {
                configText = 'flat-';
            } else {
                configText = configLower.replace('-', '-') + '-';
            }
        }
        
        return configText + cylinder;
    }
    
    formatCompressor(compressor) {
        if (!compressor) return '';
        
        const compLower = compressor.toLowerCase();
        if (compLower === 'turbo') {
            return ' turbo';
        } else if (compLower === 'supercharger') {
            return ' supercharged';
        }
        return '';
    }
    
    formatFuelType(fuelType) {
        if (!fuelType) return '';
        
        const fuelLower = fuelType.toLowerCase();
        if (fuelLower.includes('petrol') || fuelLower.includes('unleaded')) {
            return 'petrol ';
        } else if (fuelLower.includes('diesel')) {
            return 'diesel ';
        }
        return '';
    }
    
    formatPowerInfo(power, torque) {
        if (!power && !torque) return '';
        
        const powerKw = power ? parseFloat(power) : null;
        const torqueNm = torque ? parseFloat(torque) : null;
        
        if (powerKw && torqueNm) {
            return ` producing ${powerKw} kW and ${torqueNm} Nm`;
        } else if (powerKw) {
            return ` producing ${powerKw} kW`;
        } else if (torqueNm) {
            return ` producing ${torqueNm} Nm`;
        }
        
        return '';
    }
    
    deduplicateAndSortOptions(options) {
        // Remove duplicates based on description
        const unique = options.filter((option, index, self) => 
            index === self.findIndex(o => o.description === option.description)
        );
        
        // Sort by type (electric → hybrid → combustion)
        return unique.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    
    generateEngineSentence(options) {
        if (options.length === 0) {
            return 'No engine information available.';
        }
        
        if (options.length === 1) {
            const option = options[0];
            // Use "as a" for specific descriptions, "as" for generic powertrain descriptions
            if (option.description.includes('powertrain')) {
                return `Offered as a ${option.description}.`;
            } else {
                return `Offered as a ${option.description}.`;
            }
        }
        
        if (options.length === 2) {
            return `Available with a ${options[0].description} or a ${options[1].description}.`;
        }
        
        // Three or more options
        const firstOptions = options.slice(0, -1).map(opt => `a ${opt.description}`);
        const lastOption = `a ${options[options.length - 1].description}`;
        
        return `Available with ${firstOptions.join(', ')}, or ${lastOption}.`;
    }

    formatKey(key) {
        // Convert camelCase to readable format
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    formatValue(value) {
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        if (typeof value === 'number') {
            return value.toLocaleString();
        }
        if (typeof value === 'string') {
            return value.replace(/\s+/g, ' ').trim();
        }
        if (Array.isArray(value)) {
            return value.join(', ');
        }
        return String(value);
    }

    generateTransmissionDescription(vehicles) {
        if (!vehicles || vehicles.length === 0) {
            return 'No transmission data available';
        }

        // Extract transmission options from all vehicles
        const transmissionOptions = vehicles.map(vehicle => {
            const v = vehicle.vehicle;
            return this.createTransmissionOption(v);
        }).filter(option => option !== null);

        // Deduplicate and sort options
        const uniqueOptions = this.deduplicateTransmissionOptions(transmissionOptions);
        
        if (uniqueOptions.length === 0) {
            return 'No transmission data available';
        }

        // Generate sentence
        return this.generateTransmissionSentence(uniqueOptions);
    }

    createTransmissionOption(vehicle) {
        // Access transmission data from nested transmission object or fallback to vehicle level
        const transmission = vehicle.transmission || {};
        const type = transmission.transmissionType || vehicle.transmissionType;
        const speeds = transmission.transmissionNumberOfSpeeds || vehicle.transmissionNumberOfSpeeds;
        const description = transmission.transmissionDescription || vehicle.transmissionDescription || '';
        const manufacturer = transmission.transmissionManufacturerName || vehicle.transmissionManufacturerName || '';
        const drivenWheels = transmission.driveDrivenWheels || vehicle.driveDrivenWheels || vehicle.drivenWheels;
        const fourWheelDriveType = transmission.driveFourWheelDriveType || vehicle.driveFourWheelDriveType;
        const lowHighGearRanges = transmission.transmissionLowHighGearRanges || vehicle.transmissionLowHighGearRanges;
        const descentControl = transmission.driveDescentControlSystem || vehicle.driveDescentControlSystem;
        const manualMode = description.toLowerCase().includes('manual mode');
        const paddleShifters = description.toLowerCase().includes('paddle');

        // Determine core transmission type
        let coreType = this.determineCoreType(speeds, description, type, manufacturer);
        if (!coreType) return null;

        // Add speed information
        let speedInfo = this.addSpeedInfo(coreType, speeds, description);
        
        // Add driveline information
        let drivelineInfo = this.addDrivelineInfo(drivenWheels, fourWheelDriveType);
        
        // Add off-road features
        let offRoadFeatures = this.addOffRoadFeatures(lowHighGearRanges, descentControl);
        
        // Add manual mode and paddles
        let manualFeatures = this.addManualFeatures(manualMode, paddleShifters);

        // Combine all parts - put speed before transmission type
        let option = speedInfo + coreType;
        if (drivelineInfo) option += ' (' + drivelineInfo + ')';
        if (offRoadFeatures) option += ', ' + offRoadFeatures;
        if (manualFeatures) option += ', ' + manualFeatures;

        return {
            description: option,
            sortOrder: this.getTransmissionSortOrder(coreType)
        };
    }

    determineCoreType(speeds, description, type, manufacturer) {
        const desc = description.toLowerCase();
        const manuf = manufacturer.toLowerCase();

        // Single speed (EVs)
        if (speeds === '1') {
            return 'single-speed';
        }

        // Dual clutch
        if (desc.includes('dual clutch') || desc.includes('dct')) {
            return 'dual-clutch';
        }

        // CVT variants
        if (desc.includes('continuously variable') || speeds === 'Variable') {
            if (manuf.includes('ecvt') || manuf.includes('e-cvt') || manuf.includes('Ecvt')) {
                return 'e-CVT';
            }
            return 'CVT';
        }

        // Manual
        if (type === 'Manual') {
            return 'manual';
        }

        // Automatic
        if (type === 'Automatic') {
            return 'automatic';
        }

        return null;
    }

    addSpeedInfo(coreType, speeds, description) {
        // Don't add speed info for single-speed, CVT, or e-CVT unless simulated gears
        if (coreType === 'single-speed' || coreType === 'CVT' || coreType === 'e-CVT') {
            return '';
        }

        // Add speed info for manuals and automatics if > 1 speed
        if ((coreType === 'manual' || coreType === 'automatic' || coreType === 'dual-clutch') && speeds && speeds !== '1') {
            return `${speeds}-speed `;
        }

        return '';
    }

    addDrivelineInfo(drivenWheels, fourWheelDriveType) {
        if (!drivenWheels) return '';

        let driveline = '';
        
        // Map driven wheels
        switch (drivenWheels.toLowerCase()) {
            case 'front':
                driveline = 'FWD';
                break;
            case 'rear':
                driveline = 'RWD';
                break;
            case '4x4':
            case 'awd':
                driveline = '4×4';
                break;
            default:
                driveline = drivenWheels;
        }

        // Add 4WD type if present
        if (fourWheelDriveType && fourWheelDriveType.toLowerCase() !== 'no') {
            const type = fourWheelDriveType.toLowerCase();
            if (type.includes('full') && type.includes('part')) {
                driveline += ' (full- and part-time)';
            } else if (type.includes('full')) {
                driveline += ' (full-time)';
            } else if (type.includes('part')) {
                driveline += ' (part-time)';
            } else {
                driveline += ` (${fourWheelDriveType.toLowerCase()})`;
            }
        }

        return driveline;
    }

    addOffRoadFeatures(lowHighGearRanges, descentControl) {
        const features = [];

        if (lowHighGearRanges && lowHighGearRanges.toLowerCase() === 'yes') {
            features.push('low-range');
        }

        if (descentControl && descentControl.toLowerCase() === 'yes') {
            features.push('hill-descent control');
        }

        return features.join(', ');
    }

    addManualFeatures(manualMode, paddleShifters) {
        const features = [];

        if (manualMode) {
            features.push('manual mode');
        }

        if (paddleShifters) {
            features.push('paddle shifters');
        }

        return features.join(', ');
    }

    getTransmissionSortOrder(coreType) {
        const order = {
            'single-speed': 1,
            'CVT': 2,
            'e-CVT': 2,
            'dual-clutch': 3,
            'automatic': 4,
            'manual': 5
        };
        return order[coreType] || 6;
    }

    deduplicateTransmissionOptions(options) {
        // Remove duplicates based on description
        const unique = options.filter((option, index, self) => 
            index === self.findIndex(o => o.description === option.description)
        );

        // Sort by type
        return unique.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    generateTransmissionSentence(options) {
        if (options.length === 1) {
            return this.capitaliseFirstLetter(options[0].description) + '.';
        }

        if (options.length === 2) {
            return `Available with ${options[0].description} or ${options[1].description}.`;
        }

        // Three or more options
        const firstOptions = options.slice(0, -1).map(opt => opt.description);
        const lastOption = options[options.length - 1].description;
        
        return `Available with ${firstOptions.join(', ')}, or ${lastOption}.`;
    }

    capitaliseFirstLetter(str) {
        if (!str || str.length === 0) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    getFuelConsumptionData(vehicles) {
        const fuelConsumptionValues = vehicles
            .map(v => v.vehicle?.performance?.fuelConsumptionAdr8102CombinedL100km)
            .filter(value => value !== null && value !== undefined && !isNaN(value));
        
        if (fuelConsumptionValues.length === 0) return null;
        
        const uniqueValues = [...new Set(fuelConsumptionValues)];
        return uniqueValues.length === 1 ? uniqueValues[0] : uniqueValues;
    }

    getElectricRangeData(vehicles) {
        const electricRangeValues = vehicles
            .map(v => v.vehicle?.performance?.bevPureElectricRangeCombinedKm)
            .filter(value => value !== null && value !== undefined && !isNaN(value));
        
        if (electricRangeValues.length === 0) return null;
        
        const uniqueValues = [...new Set(electricRangeValues)];
        return uniqueValues.length === 1 ? uniqueValues[0] : uniqueValues;
    }

    formatFuelEconomySentence(data, vehicleCount = 1) {
        const fuelConsumption = data.fuelConsumption;
        const electricRange = data.electricRange;
        
        // If no data available
        if (!fuelConsumption && !electricRange) {
            return '<span style="color: var(--text-muted); font-style: italic;">No fuel economy data available</span>';
        }
        
        const sentences = [];
        
        // Handle fuel consumption (ICE/Hybrid)
        if (fuelConsumption) {
            if (Array.isArray(fuelConsumption)) {
                const min = Math.min(...fuelConsumption);
                const max = Math.max(...fuelConsumption);
                sentences.push(`Combined fuel consumption ranges from ${min} to ${max} L/100 km (ADR 81/02).`);
            } else {
                sentences.push(`Combined fuel consumption is ${fuelConsumption} L/100 km (ADR 81/02).`);
            }
        }
        
        // Handle electric range (EV)
        if (electricRange) {
            if (Array.isArray(electricRange)) {
                const min = Math.min(...electricRange);
                const max = Math.max(...electricRange);
                sentences.push(`Provides a combined electric range of ${min}–${max} km.`);
            } else {
                sentences.push(`Provides a combined electric range of ${electricRange} km.`);
            }
        }
        
        // Add vehicle count note if multiple vehicles
        let html = `<p style="margin: 0; line-height: 1.4;">${sentences.join(' ')}</p>`;
        if (vehicleCount > 1) {
            html += `<p style="color: var(--text-muted); font-style: italic; font-size: 0.9em; margin: 0.5rem 0 0 0;">Based on ${vehicleCount} vehicles</p>`;
        }
        
        return html;
    }

    showLoading() {
        document.getElementById('loading-state').style.display = 'block';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('no-data-state').style.display = 'none';
        document.getElementById('category-overview').style.display = 'none';
    }

    showError(message) {
        document.getElementById('error-text').textContent = message;
        document.getElementById('error-state').style.display = 'block';
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('no-data-state').style.display = 'none';
        document.getElementById('category-overview').style.display = 'none';
    }

    showCategoryOverview() {
        document.getElementById('category-overview').style.display = 'grid';
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('no-data-state').style.display = 'none';
    }

    hideCategoryOverview() {
        document.getElementById('category-overview').style.display = 'none';
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('no-data-state').style.display = 'block';
    }
}

// Initialise the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VehicleOverview();
});