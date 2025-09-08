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
        content.innerHTML = this.formatCategoryData(data, vehiclesToAnalyze.length);

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
                        break;
                    case 'Transmission':
                        data.transmissionType = this.getUniqueValues(vehiclesToAnalyze, 'transmissionType');
                        data.transmissionSpeeds = this.getUniqueValues(vehiclesToAnalyze, 'transmissionNumberOfSpeeds');
                        data.transmissionDescription = this.getUniqueValues(vehiclesToAnalyze, 'transmissionDescription');
                        break;
                    case 'Fuel Economy':
                        data.fuelType = this.getUniqueValues(vehiclesToAnalyze, 'fuelType');
                        data.drivenWheels = this.getUniqueValues(vehiclesToAnalyze, 'drivenWheels');
                        data.hasEvData = this.getUniqueValues(vehiclesToAnalyze, 'hasEvData');
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
            .map(v => v.vehicle?.[property])
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


    formatCategoryData(data, vehicleCount = 1) {
        if (!data || Object.keys(data).length === 0) {
            return '<span style="color: var(--text-muted); font-style: italic;">No data available</span>';
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