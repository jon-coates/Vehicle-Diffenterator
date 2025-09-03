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
        this.itemsPerPage = 10;
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

        // Accordion handler
        const accordionHeader = document.getElementById('accordion-header');
        if (accordionHeader) {
            accordionHeader.addEventListener('click', () => this.toggleAccordion());
        }

        // Filter and sort handlers
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.renderComparisonGrid();
        });

        document.getElementById('sort-option').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderComparisonGrid();
        });

        document.getElementById('items-per-page').addEventListener('change', (e) => {
            this.itemsPerPage = e.target.value === 'all' ? null : parseInt(e.target.value);
            this.renderComparisonGrid();
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
            // If default data fails, show the no data message instead of error
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

    toggleAccordion() {
        const accordionHeader = document.getElementById('accordion-header');
        const accordionContent = document.getElementById('accordion-content');
        const accordionIcon = document.getElementById('accordion-icon');

        const isExpanded = accordionHeader.classList.contains('expanded');
        
        if (isExpanded) {
            accordionHeader.classList.remove('expanded');
            accordionContent.classList.remove('expanded');
        } else {
            accordionHeader.classList.add('expanded');
            accordionContent.classList.add('expanded');
        }
    }

    async loadSampleData() {
        try {
            this.showLoading(true);
            const response = await fetch('vehicleData/allJuke.json');
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
            this.identifyDifferences();
            this.populateCategoryFilter();
            this.renderStatistics();
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
                    // Skip fields that should be excluded based on category and specification
                    if (this.shouldExcludeField(category, spec)) {
                        return;
                    }
                    
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

    calculateFieldDifferenceStatistics() {
        if (this.vehicles.length < 2) {
            return {
                totalFields: 0,
                differentFields: 0,
                identicalFields: 0,
                categoryBreakdown: {},
                mostDifferentCategory: null,
                leastDifferentCategory: null,
                averageDifferencesPerCategory: 0
            };
        }

        const allSpecs = {};
        const categoryStats = {};

        // Collect all specifications across all vehicles
        this.vehicles.forEach(vehicle => {
            Object.keys(vehicle.specifications).forEach(category => {
                if (!allSpecs[category]) allSpecs[category] = {};
                if (!categoryStats[category]) {
                    categoryStats[category] = {
                        total: 0,
                        different: 0,
                        identical: 0
                    };
                }
                
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

        // Calculate differences per category - count unique field names, not instances
        Object.keys(allSpecs).forEach(category => {
            const uniqueFieldNames = Object.keys(allSpecs[category]);
            categoryStats[category].total = uniqueFieldNames.length;
            
            uniqueFieldNames.forEach(spec => {
                if (allSpecs[category][spec].size > 1) {
                    categoryStats[category].different++;
                } else {
                    categoryStats[category].identical++;
                }
            });
        });

        // Calculate totals
        const totalFields = Object.values(categoryStats).reduce((sum, stats) => sum + stats.total, 0);
        const differentFields = Object.values(categoryStats).reduce((sum, stats) => sum + stats.different, 0);
        const identicalFields = Object.values(categoryStats).reduce((sum, stats) => sum + stats.identical, 0);

        // Find most and least different categories based on absolute differences
        let mostDifferentCategory = null;
        let leastDifferentCategory = null;
        let maxDifferences = 0;
        let minDifferences = Infinity;

        Object.keys(categoryStats).forEach(category => {
            const stats = categoryStats[category];
            
            // Find category with most absolute differences
            if (stats.different > maxDifferences) {
                maxDifferences = stats.different;
                mostDifferentCategory = category;
            }
            
            // Find category with least absolute differences (but only if it has some differences)
            if (stats.different < minDifferences && stats.different > 0) {
                minDifferences = stats.different;
                leastDifferentCategory = category;
            }
        });

        const averageDifferencesPerCategory = Object.keys(categoryStats).length > 0 
            ? differentFields / Object.keys(categoryStats).length 
            : 0;

        return {
            totalFields,
            differentFields,
            identicalFields,
            categoryBreakdown: categoryStats,
            mostDifferentCategory,
            leastDifferentCategory,
            averageDifferencesPerCategory,
            differencePercentage: totalFields > 0 ? (differentFields / totalFields) * 100 : 0
        };
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

    renderStatistics() {
        const accordion = document.getElementById('statistics-accordion');
        const statsGrid = document.getElementById('stats-grid');
        
        if (this.vehicles.length < 2) {
            accordion.style.display = 'none';
            return;
        }

        const stats = this.calculateFieldDifferenceStatistics();
        
        // Debug logging to verify the fix
        console.log('Field Difference Statistics:', stats);
        console.log('Total categories found:', Object.keys(stats.categoryBreakdown).length);
        
        // Show top 10 categories by absolute differences
        const sortedByDifferences = Object.entries(stats.categoryBreakdown)
            .sort(([,a], [,b]) => b.different - a.different)
            .slice(0, 10);
        console.log('Top 10 categories by absolute differences:', sortedByDifferences);
        
        // Show top 10 categories by difference ratio
        const sortedByRatio = Object.entries(stats.categoryBreakdown)
            .map(([name, stats]) => [name, { ...stats, ratio: stats.total > 0 ? stats.different / stats.total : 0 }])
            .sort(([,a], [,b]) => b.ratio - a.ratio)
            .slice(0, 10);
        console.log('Top 10 categories by difference ratio:', sortedByRatio);
        
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">Total Fields</div>
                    <div class="stat-value">${stats.totalFields}</div>
                </div>
                <div class="stat-description">Total number of specification fields across all vehicles</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">Different Fields</div>
                    <div class="stat-value">${stats.differentFields}</div>
                </div>
                <div class="stat-description">Fields that vary between vehicles</div>
                <div class="stat-details">
                    <strong>${stats.differencePercentage.toFixed(1)}%</strong> of all fields differ
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">Identical Fields</div>
                    <div class="stat-value">${stats.identicalFields}</div>
                </div>
                <div class="stat-description">Fields that are the same across all vehicles</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">Categories</div>
                    <div class="stat-value">${Object.keys(stats.categoryBreakdown).length}</div>
                </div>
                <div class="stat-description">Number of specification categories</div>
                <div class="stat-details">
                    <strong>${stats.averageDifferencesPerCategory.toFixed(1)}</strong> avg differences per category
                </div>
            </div>
            
            ${stats.mostDifferentCategory ? `
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">Most Different</div>
                    <div class="stat-value">${this.formatCategoryName(stats.mostDifferentCategory)}</div>
                </div>
                <div class="stat-description">Category with highest variation</div>
                <div class="stat-details">
                    <strong>${stats.categoryBreakdown[stats.mostDifferentCategory].different}</strong> of 
                    <strong>${stats.categoryBreakdown[stats.mostDifferentCategory].total}</strong> fields differ
                </div>
            </div>
            ` : ''}
            
            ${stats.leastDifferentCategory ? `
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">Most Similar</div>
                    <div class="stat-value">${this.formatCategoryName(stats.leastDifferentCategory)}</div>
                </div>
                <div class="stat-description">Category with lowest variation</div>
                <div class="stat-details">
                    <strong>${stats.categoryBreakdown[stats.leastDifferentCategory].different}</strong> of 
                    <strong>${stats.categoryBreakdown[stats.leastDifferentCategory].total}</strong> fields differ
                </div>
            </div>
            ` : ''}
        `;
        
        accordion.style.display = 'block';
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

        return differences.slice(0, this.itemsPerPage || 20).map(diff => {
            const value = diff.values[vehicle.id] || 'Not Available';
            const isPremium = premiumFeatures.some(feature => 
                this.formatSpecificationName(diff.specification, diff.category).toLowerCase().includes(feature.toLowerCase())
            );
            
            return `
                <div class="difference-row">
                    <div class="difference-label">${this.formatSpecificationName(diff.specification, diff.category)}</div>
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
                premiumFeatures.push(this.formatSpecificationName(diff.specification, diff.category));
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
        const accordion = document.getElementById('statistics-accordion');
        
        loading.style.display = show ? 'block' : 'none';
        grid.style.display = show ? 'none' : 'grid';
        error.style.display = 'none';
        noData.style.display = 'none';
        if (show) accordion.style.display = 'none';
    }

    showError(message) {
        const loading = document.getElementById('loading-indicator');
        const grid = document.getElementById('comparison-grid');
        const error = document.getElementById('error-message');
        const noData = document.getElementById('no-data-message');
        const accordion = document.getElementById('statistics-accordion');
        
        loading.style.display = 'none';
        grid.style.display = 'none';
        error.style.display = 'block';
        noData.style.display = 'none';
        accordion.style.display = 'none';
        
        document.getElementById('error-text').textContent = message;
    }

    showNoData() {
        const loading = document.getElementById('loading-indicator');
        const grid = document.getElementById('comparison-grid');
        const error = document.getElementById('error-message');
        const noData = document.getElementById('no-data-message');
        const accordion = document.getElementById('statistics-accordion');
        
        loading.style.display = 'none';
        grid.style.display = 'none';
        error.style.display = 'none';
        noData.style.display = 'block';
        accordion.style.display = 'none';
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
