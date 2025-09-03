/**
 * Vehicle Comparison Interface
 * A responsive web application for comparing vehicle specifications
 */

class VehicleComparison {
    constructor() {
        this.vehicles = [];
        this.differences = [];
        this.categories = new Set();
        this.currentFilter = 'all';
        this.currentSort = 'price-low';
        this.apiBaseUrl = 'https://vehicle-data.beta.dev-syd.carexpert.com.au/v2/vehicles';
        
        this.initializeEventListeners();
        this.loadSampleData();
    }

    initializeEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.target.dataset.source));
        });

        // File input handler
        const fileInput = document.getElementById('vehicle-data-file');
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // API search handler
        const searchButton = document.getElementById('search-api');
        searchButton.addEventListener('click', () => this.searchVehicles());

        // Enter key support for API search
        document.getElementById('make-code').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchVehicles();
        });
        document.getElementById('model-code').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchVehicles();
        });

        // Filter and sort handlers
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.renderComparisonGrid();
        });

        document.getElementById('sort-option').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderComparisonGrid();
        });
    }

    switchTab(source) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-source="${source}"]`).classList.add('active');

        // Update panels
        document.querySelectorAll('.data-source-panel').forEach(panel => panel.classList.remove('active'));
        document.getElementById(`${source}-panel`).classList.add('active');
    }

    async loadSampleData() {
        try {
            this.showLoading(true);
            const response = await fetch('vehicleData/juke.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.processVehicleData(data);
        } catch (error) {
            console.error('Error loading sample data:', error);
            this.showError('Failed to load sample data. Please check if the file exists and is accessible.');
        }
    }

    async searchVehicles() {
        const makeCode = document.getElementById('make-code').value.trim().toUpperCase();
        const modelCode = document.getElementById('model-code').value.trim().toUpperCase();
        const limit = document.getElementById('limit').value;
        const currentOnly = document.getElementById('current-only').checked;

        if (!makeCode || !modelCode) {
            this.showError('Please enter both make code and model code to search.');
            return;
        }

        try {
            this.showLoading(true);
            const searchButton = document.getElementById('search-api');
            searchButton.disabled = true;
            searchButton.innerHTML = '<span class="search-icon">⏳</span> Searching...';

            const params = new URLSearchParams({
                data_source: 'jato',
                view: 'full',
                make_code: makeCode,
                model_code: modelCode,
                is_current: currentOnly.toString(),
                page: '1',
                limit: limit
            });

            const url = `${this.apiBaseUrl}?${params}`;
            console.log('Searching API:', url);

            // Display the URL being used
            this.displayApiUrl(url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('API Response:', data);

            if (data.data && data.data.length > 0) {
                this.processVehicleData(data);
            } else {
                this.showError(`No vehicles found for make code "${makeCode}" and model code "${modelCode}". Please try different codes.`);
            }

        } catch (error) {
            console.error('Error searching vehicles:', error);
            this.showError(`Failed to search vehicles: ${error.message}. Please check your internet connection and try again.`);
        } finally {
            const searchButton = document.getElementById('search-api');
            searchButton.disabled = false;
            searchButton.innerHTML = '<span class="search-icon">🔍</span> Search Vehicles';
            this.showLoading(false);
        }
    }

    displayApiUrl(url) {
        // Create or update the API URL display
        let urlDisplay = document.getElementById('api-url-display');
        if (!urlDisplay) {
            urlDisplay = document.createElement('div');
            urlDisplay.id = 'api-url-display';
            urlDisplay.className = 'api-url-display';
            
            // Insert after the search button
            const searchButton = document.getElementById('search-api');
            searchButton.parentNode.insertBefore(urlDisplay, searchButton.nextSibling);
        }

        urlDisplay.innerHTML = `
            <div class="api-url-header">
                <strong>API Request URL:</strong>
                <button class="copy-url-button" onclick="navigator.clipboard.writeText('${url}')" title="Copy URL">
                    📋 Copy
                </button>
            </div>
            <div class="api-url-content">
                <code>${url}</code>
            </div>
        `;
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
            this.identifyDifferences();
            this.populateCategoryFilter();
            this.renderComparisonGrid();
            this.showLoading(false);
        } catch (error) {
            console.error('Error processing vehicle data:', error);
            this.showError('Error processing vehicle data: ' + error.message);
        }
    }

    normalizeVehicleData(vehicle) {
        // Handle different data structures from the sample and API
        const vehicleData = vehicle.vehicle || vehicle;
        
        return {
            id: vehicleData.vehicleId || vehicleData.id || Math.random().toString(36),
            make: vehicleData.make || 'Unknown',
            model: vehicleData.model || 'Unknown',
            trim: vehicleData.trim || 'Base',
            versionName: vehicleData.versionName || '',
            year: vehicleData.modelYear || vehicleData.year || new Date().getFullYear(),
            price: vehicleData.price || 0,
            specifications: this.extractSpecifications(vehicleData),
            isCurrent: vehicleData.isCurrent !== false
        };
    }

    extractSpecifications(vehicleData) {
        const specs = {};
        
        // Extract specifications from various categories
        const categories = [
            'audio', 'bodyExterior', 'brakes', 'convenience', 'dimensions',
            'doors', 'engine', 'fuel', 'instrumentation', 'interiorTrim',
            'lights', 'performance', 'safety', 'seats', 'steering',
            'suspension', 'transmission', 'ventilation', 'visibility', 'wheels'
        ];

        categories.forEach(category => {
            if (vehicleData[category]) {
                specs[category] = this.flattenObject(vehicleData[category]);
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
                    flattened[newKey] = value;
                }
            }
        }
        
        return flattened;
    }

    identifyDifferences() {
        if (this.vehicles.length < 2) {
            this.differences = [];
            return;
        }

        const allSpecs = {};
        const differences = [];

        // Collect all specifications across all vehicles
        this.vehicles.forEach(vehicle => {
            Object.keys(vehicle.specifications).forEach(category => {
                if (!allSpecs[category]) allSpecs[category] = {};
                
                Object.keys(vehicle.specifications[category]).forEach(spec => {
                    if (!allSpecs[category][spec]) allSpecs[category][spec] = new Set();
                    allSpecs[category][spec].add(vehicle.specifications[category][spec]);
                });
            });
        });

        // Find specifications that differ between vehicles
        Object.keys(allSpecs).forEach(category => {
            Object.keys(allSpecs[category]).forEach(spec => {
                if (allSpecs[category][spec].size > 1) {
                    differences.push({
                        category,
                        specification: spec,
                        values: {}
                    });
                    
                    this.categories.add(category);
                }
            });
        });

        // Map values to each vehicle
        differences.forEach(diff => {
            this.vehicles.forEach(vehicle => {
                const value = vehicle.specifications[diff.category]?.[diff.specification];
                diff.values[vehicle.id] = value || 'Not Available';
            });
        });

        this.differences = differences;
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

    getFilteredDifferences() {
        if (this.currentFilter === 'all') {
            return this.differences;
        }
        return this.differences.filter(diff => diff.category === this.currentFilter);
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

    renderComparisonGrid() {
        const grid = document.getElementById('comparison-grid');
        const filteredDifferences = this.getFilteredDifferences();
        const sortedVehicles = this.getSortedVehicles();

        if (sortedVehicles.length === 0) {
            this.showNoData();
            return;
        }

        grid.innerHTML = sortedVehicles.map(vehicle => 
            this.createVehicleCard(vehicle, filteredDifferences)
        ).join('');

        // Add intersection observer for lazy loading animations
        this.observeCards();
    }

    createVehicleCard(vehicle, differences) {
        const premiumFeatures = this.identifyPremiumFeatures(vehicle, differences);
        const keyFeatures = this.getKeyFeatures(vehicle, differences);
        
        return `
            <div class="vehicle-card" data-vehicle-id="${vehicle.id}">
                <div class="card-header">
                    <div class="brand-model">${vehicle.make} ${vehicle.model}</div>
                    <div class="trim-heading">${vehicle.trim}</div>
                    <div class="year-version-subheading">
                        ${vehicle.year}${vehicle.versionName ? ` • ${vehicle.versionName}` : ''}
                    </div>
                    <div class="price">$${this.formatPrice(vehicle.price)}</div>
                </div>
                
                <div class="differences-grid">
                    ${this.renderDifferences(vehicle, differences, premiumFeatures)}
                </div>
                
                <div class="feature-tags">
                    ${keyFeatures.map(feature => 
                        `<span class="feature-tag ${premiumFeatures.includes(feature) ? 'premium' : ''}">${feature}</span>`
                    ).join('')}
                </div>
                
                <div class="card-actions">
                    <button class="deal-button" onclick="showDealAlert('${vehicle.make}', '${vehicle.model}')">
                        Find a deal
                    </button>
                </div>
            </div>
        `;
    }

    renderDifferences(vehicle, differences, premiumFeatures) {
        if (differences.length === 0) {
            return '<div class="difference-row"><div class="difference-label">No differences found</div></div>';
        }

        return differences.slice(0, 8).map(diff => {
            const value = diff.values[vehicle.id] || 'Not Available';
            const isPremium = premiumFeatures.some(feature => 
                this.formatSpecificationName(diff.specification).toLowerCase().includes(feature.toLowerCase())
            );
            
            return `
                <div class="difference-row">
                    <div class="difference-label">${this.formatSpecificationName(diff.specification)}</div>
                    <div class="difference-value ${isPremium ? 'premium' : ''}">${this.formatValue(value)}</div>
                </div>
            `;
        }).join('');
    }

    identifyPremiumFeatures(vehicle, differences) {
        const premiumFeatures = [];
        
        differences.forEach(diff => {
            const vehicleValue = diff.values[vehicle.id];
            const otherValues = Object.values(diff.values).filter(v => v !== vehicleValue);
            
            // Check if this vehicle has a "better" value
            if (this.isPremiumValue(vehicleValue, otherValues, diff.specification)) {
                premiumFeatures.push(this.formatSpecificationName(diff.specification));
            }
        });
        
        return premiumFeatures;
    }

    isPremiumValue(value, otherValues, specification) {
        if (!value || value === 'Not Available') return false;
        
        const spec = specification.toLowerCase();
        
        // Numeric comparisons
        if (typeof value === 'number' || !isNaN(value)) {
            const numValue = parseFloat(value);
            const numOthers = otherValues.map(v => parseFloat(v)).filter(v => !isNaN(v));
            
            if (spec.includes('power') || spec.includes('torque') || spec.includes('speed')) {
                return numValue > Math.max(...numOthers);
            }
            if (spec.includes('consumption') || spec.includes('economy') || spec.includes('emission')) {
                return numValue < Math.min(...numOthers);
            }
        }
        
        // String comparisons for premium features
        const premiumKeywords = ['yes', 'standard', 'led', 'leather', 'premium', 'advanced', 'automatic'];
        const basicKeywords = ['no', 'manual', 'basic', 'standard'];
        
        if (premiumKeywords.some(keyword => value.toLowerCase().includes(keyword))) {
            return !otherValues.some(other => 
                premiumKeywords.some(keyword => other.toLowerCase().includes(keyword))
            );
        }
        
        return false;
    }

    getKeyFeatures(vehicle, differences) {
        const features = [];
        const vehicleSpecs = vehicle.specifications;
        
        // Extract key features from various categories
        const keySpecs = [
            'engine.engineLiters',
            'transmission.transmissionType',
            'performance.powerMaximumPowerKw',
            'audio.speakerBrandName',
            'lights.headlightsBulbTypeLowBeam',
            'safety.numberOfAirbags',
            'convenience.mobileIntegrationAppleCarplay'
        ];
        
        keySpecs.forEach(spec => {
            const [category, specification] = spec.split('.');
            const value = vehicleSpecs[category]?.[specification];
            if (value && value !== 'Not Available' && value !== 'no') {
                features.push(this.formatFeatureName(specification, value));
            }
        });
        
        return features.slice(0, 4); // Limit to 4 key features
    }

    formatSpecificationName(spec) {
        return spec
            .split('.')
            .pop()
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    formatFeatureName(spec, value) {
        const name = this.formatSpecificationName(spec);
        if (typeof value === 'string' && value.length > 20) {
            return name;
        }
        return `${name}: ${value}`;
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

    observeCards() {
        const cards = document.querySelectorAll('.vehicle-card');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });

        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });
    }

    showLoading(show) {
        const loading = document.getElementById('loading-indicator');
        const grid = document.getElementById('comparison-grid');
        const error = document.getElementById('error-message');
        const noData = document.getElementById('no-data-message');
        
        loading.style.display = show ? 'block' : 'none';
        grid.style.display = show ? 'none' : 'grid';
        error.style.display = 'none';
        noData.style.display = 'none';
    }

    showError(message) {
        const loading = document.getElementById('loading-indicator');
        const grid = document.getElementById('comparison-grid');
        const error = document.getElementById('error-message');
        const noData = document.getElementById('no-data-message');
        
        loading.style.display = 'none';
        grid.style.display = 'none';
        error.style.display = 'block';
        noData.style.display = 'none';
        
        document.getElementById('error-text').textContent = message;
    }

    showNoData() {
        const loading = document.getElementById('loading-indicator');
        const grid = document.getElementById('comparison-grid');
        const error = document.getElementById('error-message');
        const noData = document.getElementById('no-data-message');
        
        loading.style.display = 'none';
        grid.style.display = 'none';
        error.style.display = 'none';
        noData.style.display = 'block';
    }
}

// Global function to show deal alert
function showDealAlert(make, model) {
    alert(`You got a deal! Great choice on the ${make} ${model}!`);
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VehicleComparison();
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VehicleComparison;
}
