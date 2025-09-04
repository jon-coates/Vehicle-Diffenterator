/**
 * Vehicle Columnar Comparison Interface
 * A responsive web application for comparing vehicle specifications in a columnar format
 */

class VehicleColumnarComparison {
    constructor() {
        this.vehicles = [];
        this.categories = new Set();
        this.currentFilter = 'all';
        this.currentSort = 'price-low';
        this.dataLabelMapping = null;
        
        this.initializeEventListeners();
        this.loadDataLabelMapping();
        this.loadDefaultData();
    }

    initializeEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.target.dataset.source));
        });

        // Preloaded data dropdown handler
        const preloadedSelect = document.getElementById('preloaded-data-select');
        preloadedSelect.addEventListener('change', (e) => this.handlePreloadedDataSelection(e));

        // File input handler
        const fileInput = document.getElementById('vehicle-data-file');
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // Filter and sort handlers
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.renderComparisonTable();
        });

        document.getElementById('sort-option').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderComparisonTable();
        });
    }

    async loadDataLabelMapping() {
        try {
            const response = await fetch('dataLabelMapping.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.dataLabelMapping = await response.json();
            console.log('Data label mapping loaded successfully');
        } catch (error) {
            console.error('Error loading data label mapping:', error);
            console.warn('Continuing without data label mapping - using fallback formatting');
        }
    }

    async loadDefaultData() {
        try {
            // Load the first available dataset by default (Suzuki Jimny)
            const response = await fetch('vehicleData/suzukiJimny.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.processVehicleData(data);
            
            // Update the dropdown to show the selected dataset
            const preloadedSelect = document.getElementById('preloaded-data-select');
            if (preloadedSelect) {
                preloadedSelect.value = 'suzukiJimny.json';
            }
        } catch (error) {
            console.error('Error loading default data:', error);
            this.showNoData();
        }
    }

    switchTab(source) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-source="${source}"]`).classList.add('active');

        // Update panels
        document.querySelectorAll('.data-source-panel').forEach(panel => panel.classList.remove('active'));
        document.getElementById(`${source}-panel`).classList.add('active');
    }

    async handlePreloadedDataSelection(event) {
        const selectedFile = event.target.value;
        if (!selectedFile) return;

        try {
            this.showLoading(true);
            const response = await fetch(`vehicleData/${selectedFile}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.processVehicleData(data);
        } catch (error) {
            console.error('Error loading preloaded data:', error);
            this.showError(`Failed to load ${selectedFile}. Please check if the file exists and is accessible.`);
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/json') {
            this.showError('Please select a valid JSON file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.processVehicleData(data);
            } catch (error) {
                console.error('Error parsing JSON:', error);
                this.showError('Invalid JSON file. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }

    processVehicleData(data) {
        try {
            this.showLoading(true);
            
            // Handle different data structures
            const vehicles = data.data || data.vehicles || data;
            if (!Array.isArray(vehicles)) {
                throw new Error('Invalid data structure. Expected an array of vehicles.');
            }

            if (vehicles.length === 0) {
                this.showNoData();
                return;
            }

            this.vehicles = vehicles.map(vehicle => this.normalizeVehicleData(vehicle));
            this.populateCategoryFilter();
            this.renderComparisonTable();
            this.showLoading(false);
        } catch (error) {
            console.error('Error processing vehicle data:', error);
            this.showError('Error processing vehicle data: ' + error.message);
        }
    }

    normalizeVehicleData(vehicle) {
        // Handle different data structures from the sample and API
        const vehicleData = vehicle.vehicle || vehicle;
        const generalInfo = vehicleData.vehicleGeneralInfo || {};
        
        return {
            id: vehicleData.vehicleId || vehicleData.id || Math.random().toString(36),
            make: generalInfo.localMake || vehicleData.make || 'Unknown',
            model: generalInfo.localModel || vehicleData.model || 'Unknown',
            trim: generalInfo.localTrimLevel || vehicleData.trim || 'Base',
            versionName: generalInfo.localVersionName || vehicleData.versionName || '',
            year: vehicleData.modelYear || vehicleData.year || new Date().getFullYear(),
            price: vehicleData.price || 0,
            specifications: this.extractSpecifications(vehicleData),
            isCurrent: vehicleData.isCurrent !== false
        };
    }

    extractSpecifications(vehicleData) {
        const specs = {};
        
        // Extract specifications from all available categories dynamically
        // Skip non-specification fields that shouldn't be included
        const excludeFields = [
            'vehicleId', 'make', 'model', 'trim', 'versionName', 'modelYear', 
            'price', 'isCurrent', 'vehicleGeneralInfo', 'standardText',
            'makeDetails', 'modelDetails', 'calculated'
        ];
        
        Object.keys(vehicleData).forEach(category => {
            // Only include categories that are objects and not in the exclude list
            if (typeof vehicleData[category] === 'object' && 
                vehicleData[category] !== null && 
                !Array.isArray(vehicleData[category]) &&
                !excludeFields.includes(category)) {
                specs[category] = this.flattenObject(vehicleData[category]);
                this.categories.add(category);
            }
        });

        return specs;
    }

    flattenObject(obj, prefix = '') {
        const flattened = {};
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const newKey = prefix ? `${prefix}.${key}` : key;
                const value = obj[key];
                
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    Object.assign(flattened, this.flattenObject(value, newKey));
                } else {
                    // Check if this is a local field and prefer it over non-local
                    const isLocalField = key.startsWith('local');
                    const nonLocalKey = key.replace(/^local/, '');
                    const nonLocalNewKey = prefix ? `${prefix}.${nonLocalKey}` : nonLocalKey;
                    
                    if (isLocalField) {
                        // Use the local field without the 'local' prefix
                        flattened[nonLocalNewKey] = value;
                    } else {
                        // Only add non-local field if no local version exists
                        if (!obj[`local${key.charAt(0).toUpperCase() + key.slice(1)}`]) {
                            flattened[newKey] = value;
                        }
                    }
                }
            }
        }
        
        return flattened;
    }

    shouldExcludeField(category, specification) {
        const specLower = specification.toLowerCase();
        
        // Exclude "others" category entirely
        if (category === 'others') {
            return true;
        }
        
        // Performance field exclusions
        if (category === 'performance') {
            const performanceExcludeTerms = ['mph', 'mpg', 'gallon', 'miles'];
            return performanceExcludeTerms.some(term => specLower.includes(term));
        }
        
        // Dimension field exclusions
        if (category === 'dimensions') {
            const dimensionExcludeTerms = ['inches', 'feet', 'cubic feet', 'in', 'cuft'];
            return dimensionExcludeTerms.some(term => specLower.includes(term));
        }
        
        // Warranty field exclusions
        if (category === 'warranty') {
            const warrantyExcludeTerms = ['miles'];
            return warrantyExcludeTerms.some(term => specLower.includes(term));
        }
        
        // Weight field exclusions
        if (category === 'weights') {
            const weightExcludeTerms = ['pounds', 'lbs', 'lb'];
            return weightExcludeTerms.some(term => specLower.includes(term));
        }
        
        return false;
    }

    populateCategoryFilter() {
        const filter = document.getElementById('category-filter');
        filter.innerHTML = '<option value="all">All Categories</option>';
        
        const sortedCategories = Array.from(this.categories).sort();
        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = this.formatCategoryName(category);
            filter.appendChild(option);
        });
    }

    formatCategoryName(category) {
        return category
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    getSortedVehicles() {
        const sorted = [...this.vehicles];
        
        switch (this.currentSort) {
            case 'price-low':
                return sorted.sort((a, b) => a.price - b.price);
            case 'price-high':
                return sorted.sort((a, b) => b.price - a.price);
            case 'year-new':
                return sorted.sort((a, b) => b.year - a.year);
            case 'year-old':
                return sorted.sort((a, b) => a.year - b.year);
            case 'trim':
                return sorted.sort((a, b) => a.trim.localeCompare(b.trim));
            default:
                return sorted;
        }
    }

    getAllSpecifications() {
        const allSpecs = {};
        
        this.vehicles.forEach(vehicle => {
            Object.keys(vehicle.specifications).forEach(category => {
                if (!allSpecs[category]) allSpecs[category] = {};
                
                Object.keys(vehicle.specifications[category]).forEach(spec => {
                    // Skip fields that should be excluded based on category and specification
                    if (this.shouldExcludeField(category, spec)) {
                        return;
                    }
                    
                    if (!allSpecs[category][spec]) allSpecs[category][spec] = new Set();
                    allSpecs[category][spec].add(vehicle.specifications[category][spec]);
                });
            });
        });

        return allSpecs;
    }

    getFilteredSpecifications() {
        const allSpecs = this.getAllSpecifications();
        
        if (this.currentFilter === 'all') {
            return allSpecs;
        }
        
        return { [this.currentFilter]: allSpecs[this.currentFilter] || {} };
    }

    compareVehicles(vehicle1, vehicle2) {
        const adds = [];
        const removes = [];
        
        // Get all specifications from both vehicles
        const allSpecs = new Set();
        Object.keys(vehicle1.specifications).forEach(category => {
            Object.keys(vehicle1.specifications[category]).forEach(spec => {
                if (!this.shouldExcludeField(category, spec)) {
                    allSpecs.add(`${category}.${spec}`);
                }
            });
        });
        Object.keys(vehicle2.specifications).forEach(category => {
            Object.keys(vehicle2.specifications[category]).forEach(spec => {
                if (!this.shouldExcludeField(category, spec)) {
                    allSpecs.add(`${category}.${spec}`);
                }
            });
        });

        // Compare each specification
        allSpecs.forEach(specKey => {
            const [category, spec] = specKey.split('.');
            const value1 = vehicle1.specifications[category]?.[spec];
            const value2 = vehicle2.specifications[category]?.[spec];
            
            // If vehicle2 has a value but vehicle1 doesn't, it's an add
            if (value2 && !value1) {
                adds.push({
                    category,
                    specification: spec,
                    value: value2
                });
            }
            // If vehicle1 has a value but vehicle2 doesn't, it's a remove
            else if (value1 && !value2) {
                removes.push({
                    category,
                    specification: spec,
                    value: value1
                });
            }
            // If both have values but they're different, it's a change
            else if (value1 && value2 && value1 !== value2) {
                adds.push({
                    category,
                    specification: spec,
                    value: value2,
                    previousValue: value1
                });
                removes.push({
                    category,
                    specification: spec,
                    value: value1,
                    newValue: value2
                });
            }
        });

        return { adds, removes };
    }

    renderComparisonTable() {
        const container = document.getElementById('comparison-table-container');
        const sortedVehicles = this.getSortedVehicles();
        const filteredSpecs = this.getFilteredSpecifications();

        if (sortedVehicles.length === 0) {
            this.showNoData();
            return;
        }

        if (sortedVehicles.length === 1) {
            container.innerHTML = `
                <div class="empty-comparison">
                    <h3>Single Vehicle Loaded</h3>
                    <p>Load at least two vehicles to see a comparison.</p>
                </div>
            `;
            return;
        }

        // Create the Ford Escape style layout
        let comparisonHTML = '<div class="ford-escape-layout">';
        
        // Main title
        const firstVehicle = sortedVehicles[0];
        comparisonHTML += `
            <div class="main-title">
                <h1>${firstVehicle.year} ${firstVehicle.make} ${firstVehicle.model} Specs</h1>
                <p>See our comprehensive details for the ${firstVehicle.make} ${firstVehicle.model}</p>
            </div>
        `;
        
        // Three column layout
        comparisonHTML += '<div class="three-column-layout">';
        
        // Column 1: First vehicle (base)
        const baseVehicle = sortedVehicles[0];
        comparisonHTML += `
            <div class="spec-column">
                <h2 class="column-header">${baseVehicle.trim}</h2>
                ${this.renderVehicleSpecs(baseVehicle, filteredSpecs)}
            </div>
        `;
        
        // Column 2: Second vehicle
        if (sortedVehicles.length > 1) {
            const secondVehicle = sortedVehicles[1];
            const addsToBase = this.getAddsToPrevious(baseVehicle, secondVehicle, filteredSpecs);
            const removesFromBase = this.getRemovesFromPrevious(baseVehicle, secondVehicle, filteredSpecs);
            comparisonHTML += `
                <div class="spec-column">
                    <h2 class="column-header">${secondVehicle.trim}</h2>
                    <div class="adds-section">
                        <h3 class="section-title">Adds to ${baseVehicle.trim}:</h3>
                        ${this.renderAddsSpecs(addsToBase)}
                    </div>
                    <div class="removes-section">
                        <h3 class="section-title">Removes from ${baseVehicle.trim}:</h3>
                        ${this.renderRemovesSpecs(removesFromBase)}
                    </div>
                </div>
            `;
        }
        
        // Column 3: Third vehicle
        if (sortedVehicles.length > 2) {
            const thirdVehicle = sortedVehicles[2];
            const addsToSecond = this.getAddsToPrevious(sortedVehicles[1], thirdVehicle, filteredSpecs);
            const removesFromSecond = this.getRemovesFromPrevious(sortedVehicles[1], thirdVehicle, filteredSpecs);
            comparisonHTML += `
                <div class="spec-column">
                    <h2 class="column-header">${thirdVehicle.trim}</h2>
                    <div class="adds-section">
                        <h3 class="section-title">Adds to ${sortedVehicles[1].trim}:</h3>
                        ${this.renderAddsSpecs(addsToSecond)}
                    </div>
                    <div class="removes-section">
                        <h3 class="section-title">Removes from ${sortedVehicles[1].trim}:</h3>
                        ${this.renderRemovesSpecs(removesFromSecond)}
                    </div>
                </div>
            `;
        }
        
        comparisonHTML += '</div></div>';
        
        container.innerHTML = comparisonHTML;
    }

    renderVehicleSpecs(vehicle, filteredSpecs) {
        let specsHTML = '';
        
        Object.keys(filteredSpecs).forEach(category => {
            const specs = filteredSpecs[category];
            if (Object.keys(specs).length === 0) return;
            
            // Only show specs that this vehicle has with "yes" values
            const vehicleSpecs = Object.keys(specs).filter(spec => {
                const value = vehicle.specifications[category]?.[spec];
                return this.isPositiveValue(value);
            });
            
            if (vehicleSpecs.length === 0) return;
            
            specsHTML += `<div class="category-group">`;
            specsHTML += `<div class="category-name">${this.formatCategoryName(category)}:</div>`;
            
            vehicleSpecs.forEach(spec => {
                const value = vehicle.specifications[category][spec];
                specsHTML += `
                    <div class="spec-item">
                        ${this.renderSpecWithValue(spec, category, value)}
                    </div>
                `;
            });
            
            specsHTML += `</div>`;
        });
        
        return specsHTML;
    }

    renderAddsSpecs(addsData) {
        if (Object.keys(addsData).length === 0) {
            return '<div class="no-adds">No additional features</div>';
        }
        
        let specsHTML = '';
        
        Object.keys(addsData).forEach(category => {
            const specs = addsData[category];
            if (Object.keys(specs).length === 0) return;
            
            // Only show specs with positive values
            const positiveSpecs = Object.keys(specs).filter(spec => {
                const value = specs[spec];
                return this.isPositiveValue(value);
            });
            
            if (positiveSpecs.length === 0) return;
            
            specsHTML += `<div class="category-group">`;
            specsHTML += `<div class="category-name">${this.formatCategoryName(category)}:</div>`;
            
            positiveSpecs.forEach(spec => {
                const value = specs[spec];
                specsHTML += `
                    <div class="spec-item">
                        ${this.renderSpecWithValue(spec, category, value)}
                    </div>
                `;
            });
            
            specsHTML += `</div>`;
        });
        
        return specsHTML;
    }

    renderRemovesSpecs(removesData) {
        if (Object.keys(removesData).length === 0) {
            return '<div class="no-removes">No features removed</div>';
        }
        
        let specsHTML = '';
        
        Object.keys(removesData).forEach(category => {
            const specs = removesData[category];
            if (Object.keys(specs).length === 0) return;
            
            // Only show specs that were removed (had positive values in previous vehicle)
            const removedSpecs = Object.keys(specs).filter(spec => {
                const value = specs[spec];
                return this.isPositiveValue(value);
            });
            
            if (removedSpecs.length === 0) return;
            
            specsHTML += `<div class="category-group">`;
            specsHTML += `<div class="category-name">${this.formatCategoryName(category)}:</div>`;
            
            removedSpecs.forEach(spec => {
                const value = specs[spec];
                specsHTML += `
                    <div class="spec-item">
                        ${this.renderSpecWithValue(spec, category, value)}
                    </div>
                `;
            });
            
            specsHTML += `</div>`;
        });
        
        return specsHTML;
    }

    renderSpecWithValue(spec, category, value) {
        const specName = this.formatSpecificationName(spec, category);
        
        if (typeof value === 'object' && value !== null) {
            let detailsHTML = `<div class="spec-name">${specName}</div>`;
            Object.keys(value).forEach(key => {
                const detailValue = value[key];
                if (this.isPositiveValue(detailValue)) {
                    detailsHTML += `
                        <div class="spec-detail">
                            <span class="detail-name">${this.formatSpecificationName(key, category)}:</span>
                            <span class="detail-value">${this.formatValue(detailValue)}</span>
                        </div>
                    `;
                }
            });
            return detailsHTML;
        } else {
            // For simple yes/no values, just show the label without the value
            if (this.isYesValue(value)) {
                return `<div class="spec-name">${specName}</div>`;
            }
            // For non-yes/no values, show on the same line
            return `<div class="spec-name">${specName}: <span class="spec-value">${this.formatValue(value)}</span></div>`;
        }
    }

    renderSpecValue(value, spec, category) {
        if (typeof value === 'object' && value !== null) {
            let detailsHTML = '';
            Object.keys(value).forEach(key => {
                const detailValue = value[key];
                if (this.isPositiveValue(detailValue)) {
                    detailsHTML += `
                        <div class="spec-detail">
                            <span class="detail-name">${this.formatSpecificationName(key, category)}:</span>
                            <span class="detail-value">${this.formatValue(detailValue)}</span>
                        </div>
                    `;
                }
            });
            return detailsHTML;
        } else {
            // For simple yes/no values, just show the label without the value
            if (this.isYesValue(value)) {
                return ''; // Just show the spec name, no additional value needed
            }
            // For non-yes/no values, show on the same line
            return `<div class="spec-detail"><span class="detail-value">${this.formatValue(value)}</span></div>`;
        }
    }

    getAddsToPrevious(previousVehicle, currentVehicle, filteredSpecs) {
        const adds = {};
        
        Object.keys(filteredSpecs).forEach(category => {
            const specs = filteredSpecs[category];
            if (Object.keys(specs).length === 0) return;
            
            Object.keys(specs).forEach(spec => {
                const previousValue = previousVehicle.specifications[category]?.[spec];
                const currentValue = currentVehicle.specifications[category]?.[spec];
                
                // If current vehicle has a positive value but previous doesn't, or they're different
                if (this.isPositiveValue(currentValue)) {
                    if (!this.isPositiveValue(previousValue) || previousValue !== currentValue) {
                        if (!adds[category]) adds[category] = {};
                        adds[category][spec] = currentValue;
                    }
                }
            });
        });
        
        return adds;
    }

    getRemovesFromPrevious(previousVehicle, currentVehicle, filteredSpecs) {
        const removes = {};
        
        Object.keys(filteredSpecs).forEach(category => {
            const specs = filteredSpecs[category];
            if (Object.keys(specs).length === 0) return;
            
            Object.keys(specs).forEach(spec => {
                const previousValue = previousVehicle.specifications[category]?.[spec];
                const currentValue = currentVehicle.specifications[category]?.[spec];
                
                // If previous vehicle had a positive value but current doesn't, or they're different
                if (this.isPositiveValue(previousValue)) {
                    if (!this.isPositiveValue(currentValue) || previousValue !== currentValue) {
                        if (!removes[category]) removes[category] = {};
                        removes[category][spec] = previousValue;
                    }
                }
            });
        });
        
        return removes;
    }

    isPositiveValue(value) {
        if (!value) return false;
        if (value === 'Not Available' || value === 'no' || value === 'No' || value === 'false' || value === 'False') return false;
        if (value === 'yes' || value === 'Yes' || value === 'true' || value === 'True') return true;
        if (typeof value === 'string' && value.toLowerCase().includes('yes')) return true;
        if (typeof value === 'string' && value.toLowerCase().includes('no')) return false;
        // For other values (numbers, strings), consider them positive if they exist
        return true;
    }

    isYesValue(value) {
        if (!value) return false;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const lowerValue = value.toLowerCase().trim();
            return lowerValue === 'yes' || lowerValue === 'y' || lowerValue === 'true';
        }
        return false;
    }

    createVehicleHeader(vehicle, index) {
        return `
            <div class="vehicle-header">
                <div class="vehicle-name">${vehicle.make} ${vehicle.model}</div>
                <div class="vehicle-trim">${vehicle.trim}</div>
                <div class="vehicle-year-version">
                    ${vehicle.year}${vehicle.versionName ? ` • ${vehicle.versionName}` : ''}
                </div>
                <div class="vehicle-price">$${this.formatPrice(vehicle.price)}</div>
            </div>
        `;
    }

    formatSpecificationName(spec, category = null) {
        // Try to find the specification in the data label mapping
        if (this.dataLabelMapping) {
            let categoryName, specification;
            
            // Handle both formats: "category.specification" and just "specification" with separate category
            if (spec.includes('.')) {
                const specParts = spec.split('.');
                categoryName = specParts[0];
                specification = specParts[1];
            } else if (category) {
                categoryName = category;
                specification = spec;
            }
            
            if (categoryName && specification) {
                // Look for the specification in the mapping
                if (this.dataLabelMapping[categoryName] && this.dataLabelMapping[categoryName][specification]) {
                    const label = this.dataLabelMapping[categoryName][specification];
                    if (label && label.en) {
                        return label.en;
                    }
                }
            }
        }
        
        // Fallback to original formatting if not found in mapping
        const fallbackLabel = spec
            .split('.')
            .pop()
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
        
        return fallbackLabel;
    }

    formatValue(value) {
        if (value === null || value === undefined) return 'Not Available';
        
        // Handle boolean values
        if (typeof value === 'boolean') {
            return this.createIconValue(value ? 'yes' : 'no');
        }
        
        // Handle string yes/no values
        if (typeof value === 'string') {
            const lowerValue = value.toLowerCase().trim();
            if (lowerValue === 'yes' || lowerValue === 'y' || lowerValue === 'true') {
                return this.createIconValue('yes');
            }
            if (lowerValue === 'no' || lowerValue === 'n' || lowerValue === 'false') {
                return this.createIconValue('no');
            }
            
            // Handle long strings
            if (value.length > 30) {
                return value.substring(0, 30) + '...';
            }
        }
        
        // Handle numeric values
        if (typeof value === 'number') {
            if (value > 1000) return value.toLocaleString();
            return value.toString();
        }
        
        return value.toString();
    }

    createIconValue(value) {
        const isYes = value === 'yes' || value === 'y' || value === 'true';
        const iconClass = isYes ? 'check' : 'cross';
        const iconSymbol = isYes ? '✓' : '✗';
        
        return `<span class="spec-icon-text"><span class="spec-icon ${iconClass}">${iconSymbol}</span></span>`;
    }

    formatPrice(price) {
        return new Intl.NumberFormat('en-AU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    }

    showLoading(show) {
        const loading = document.getElementById('loading-indicator');
        const container = document.getElementById('comparison-table-container');
        const error = document.getElementById('error-message');
        const noData = document.getElementById('no-data-message');
        
        loading.style.display = show ? 'block' : 'none';
        container.style.display = show ? 'none' : 'block';
        error.style.display = 'none';
        noData.style.display = 'none';
    }

    showError(message) {
        const loading = document.getElementById('loading-indicator');
        const container = document.getElementById('comparison-table-container');
        const error = document.getElementById('error-message');
        const noData = document.getElementById('no-data-message');
        
        loading.style.display = 'none';
        container.style.display = 'none';
        error.style.display = 'block';
        noData.style.display = 'none';
        
        document.getElementById('error-text').textContent = message;
    }

    showNoData() {
        const loading = document.getElementById('loading-indicator');
        const container = document.getElementById('comparison-table-container');
        const error = document.getElementById('error-message');
        const noData = document.getElementById('no-data-message');
        
        loading.style.display = 'none';
        container.style.display = 'none';
        error.style.display = 'none';
        noData.style.display = 'block';
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VehicleColumnarComparison();
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VehicleColumnarComparison;
}
