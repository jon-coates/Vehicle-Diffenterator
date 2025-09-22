// Vehicle Data Export Tool JavaScript

class VehicleDataExport {
    constructor() {
        this.vehicleData = null;
        this.selectedCategories = new Set();
        this.selectedVehicles = [];
        this.currentLevel = 'all';
        this.availableCategories = [
            'audio',
            'bodyExterior',
            'brakes',
            'bumpers',
            'cargoArea',
            'convenience',
            'dimensions',
            'doors',
            'emergency',
            'engine',
            'fuel',
            'hybridAndElectricSystems',
            'instrumentation',
            'interiorTrim',
            'lights',
            'locks',
            'paint',
            'performance',
            'roof',
            'safety',
            'seats',
            'service',
            'steering',
            'storage',
            'suspension',
            'transmission',
            'ventilation',
            'version',
            'visibility',
            'warranty',
            'weatherProtection',
            'weights',
            'wheels'
        ];

        this.categoryDisplayNames = {
            'audio': 'Audio Systems',
            'bodyExterior': 'Body & Exterior',
            'brakes': 'Braking System',
            'bumpers': 'Bumpers',
            'cargoArea': 'Cargo Area',
            'convenience': 'Convenience Features',
            'dimensions': 'Dimensions',
            'doors': 'Doors',
            'emergency': 'Emergency Equipment',
            'engine': 'Engine',
            'fuel': 'Fuel System',
            'hybridAndElectricSystems': 'Hybrid & Electric Systems',
            'instrumentation': 'Instrumentation',
            'interiorTrim': 'Interior Trim',
            'lights': 'Lighting',
            'locks': 'Locks & Security',
            'paint': 'Paint & Finishes',
            'performance': 'Performance',
            'roof': 'Roof',
            'safety': 'Safety Features',
            'seats': 'Seating',
            'service': 'Service & Maintenance',
            'steering': 'Steering',
            'storage': 'Storage',
            'suspension': 'Suspension',
            'transmission': 'Transmission',
            'ventilation': 'Ventilation',
            'version': 'Version Info',
            'visibility': 'Visibility',
            'warranty': 'Warranty',
            'weatherProtection': 'Weather Protection',
            'weights': 'Weights',
            'wheels': 'Wheels & Tyres'
        };

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.populateCategories();
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

        // Category selection
        document.getElementById('select-all-categories').addEventListener('click', () => {
            this.selectAllCategories();
        });

        document.getElementById('deselect-all-categories').addEventListener('click', () => {
            this.deselectAllCategories();
        });

        // Export buttons
        document.getElementById('export-json').addEventListener('click', () => {
            this.exportData('json');
        });

        document.getElementById('export-csv').addEventListener('click', () => {
            this.exportData('csv');
        });

        document.getElementById('preview-data').addEventListener('click', () => {
            this.previewData();
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
        this.resetAllSelections();
    }

    async onPreloadedDataChange(filename) {
        if (!filename) {
            this.hideAllPanels();
            return;
        }

        try {
            await this.loadVehicleData(filename);
            this.showVehicleSelection();
        } catch (error) {
            this.showError('Failed to load vehicle data: ' + error.message);
        }
    }

    async onFileUpload(file) {
        if (!file) {
            this.hideAllPanels();
            return;
        }

        try {
            this.showLoading();
            const text = await file.text();
            this.vehicleData = JSON.parse(text);
            this.showVehicleSelection();
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

    showVehicleSelection() {
        if (!this.vehicleData?.data || this.vehicleData.data.length === 0) {
            this.showError('No vehicle data available');
            return;
        }

        this.populateVehicleSelection();
        document.getElementById('vehicle-selection-panel').style.display = 'block';
        document.getElementById('category-selection-panel').style.display = 'block';
        document.getElementById('export-options').style.display = 'block';
    }

    populateVehicleSelection() {
        const container = document.getElementById('vehicle-selection-controls');
        container.innerHTML = '';

        if (this.currentLevel === 'all') {
            // Show summary for all vehicles
            const summary = document.createElement('div');
            summary.className = 'selection-summary';
            summary.innerHTML = `
                <div class="summary-title">All Vehicles Selected</div>
                <div class="summary-content">
                    ${this.vehicleData.data.length} vehicles from the selected dataset will be included in the export.
                </div>
            `;
            container.appendChild(summary);
            this.selectedVehicles = this.vehicleData.data;
            return;
        }

        // Create level-specific controls
        this.createLevelControls(container);
    }

    createLevelControls(container) {
        const vehicles = this.vehicleData.data;
        
        if (this.currentLevel === 'model') {
            // Group by make and model
            const modelGroups = this.groupByModel(vehicles);
            this.createModelControls(container, modelGroups);
        } else if (this.currentLevel === 'trim') {
            // Group by make, model, and trim
            const trimGroups = this.groupByTrim(vehicles);
            this.createTrimControls(container, trimGroups);
        } else if (this.currentLevel === 'variant') {
            // Show individual variants
            this.createVariantControls(container, vehicles);
        }
    }

    groupByModel(vehicles) {
        const groups = {};
        vehicles.forEach(vehicle => {
            const make = vehicle.vehicle?.make || 'Unknown';
            const model = vehicle.vehicle?.model || 'Unknown';
            const key = `${make} ${model}`;
            
            if (!groups[key]) {
                groups[key] = {
                    make,
                    model,
                    vehicles: []
                };
            }
            groups[key].vehicles.push(vehicle);
        });
        return groups;
    }

    groupByTrim(vehicles) {
        const groups = {};
        vehicles.forEach(vehicle => {
            const make = vehicle.vehicle?.make || 'Unknown';
            const model = vehicle.vehicle?.model || 'Unknown';
            const trim = vehicle.vehicle?.trim || 'Base';
            const key = `${make} ${model} ${trim}`;
            
            if (!groups[key]) {
                groups[key] = {
                    make,
                    model,
                    trim,
                    vehicles: []
                };
            }
            groups[key].vehicles.push(vehicle);
        });
        return groups;
    }

    createModelControls(container, modelGroups) {
        // Add select all/deselect all for models
        const selectAllContainer = document.createElement('div');
        selectAllContainer.className = 'control-group select-all-container';
        selectAllContainer.style.marginBottom = '1rem';
        selectAllContainer.style.paddingBottom = '1rem';
        selectAllContainer.style.borderBottom = '1px solid var(--border-color)';
        
        const selectAllButton = document.createElement('button');
        selectAllButton.type = 'button';
        selectAllButton.className = 'export-button secondary';
        selectAllButton.textContent = 'Select All Models';
        selectAllButton.style.marginRight = '0.5rem';
        selectAllButton.addEventListener('click', () => this.selectAllModels());
        
        const deselectAllButton = document.createElement('button');
        deselectAllButton.type = 'button';
        deselectAllButton.className = 'export-button secondary';
        deselectAllButton.textContent = 'Deselect All Models';
        deselectAllButton.addEventListener('click', () => this.deselectAllModels());
        
        selectAllContainer.appendChild(selectAllButton);
        selectAllContainer.appendChild(deselectAllButton);
        container.appendChild(selectAllContainer);

        Object.entries(modelGroups).forEach(([key, group]) => {
            const control = document.createElement('div');
            control.className = 'control-group';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `model-${key.replace(/\s+/g, '-')}`;
            checkbox.value = key;
            checkbox.addEventListener('change', () => this.updateVehicleSelection());
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = `${group.make} ${group.model} (${group.vehicles.length} vehicles)`;
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '0.5rem';
            label.style.cursor = 'pointer';
            
            label.insertBefore(checkbox, label.firstChild);
            control.appendChild(label);
            container.appendChild(control);
        });
    }

    createTrimControls(container, trimGroups) {
        // Add select all/deselect all for trims
        const selectAllContainer = document.createElement('div');
        selectAllContainer.className = 'control-group select-all-container';
        selectAllContainer.style.marginBottom = '1rem';
        selectAllContainer.style.paddingBottom = '1rem';
        selectAllContainer.style.borderBottom = '1px solid var(--border-color)';
        
        const selectAllButton = document.createElement('button');
        selectAllButton.type = 'button';
        selectAllButton.className = 'export-button secondary';
        selectAllButton.textContent = 'Select All Trims';
        selectAllButton.style.marginRight = '0.5rem';
        selectAllButton.addEventListener('click', () => this.selectAllTrims());
        
        const deselectAllButton = document.createElement('button');
        deselectAllButton.type = 'button';
        deselectAllButton.className = 'export-button secondary';
        deselectAllButton.textContent = 'Deselect All Trims';
        deselectAllButton.addEventListener('click', () => this.deselectAllTrims());
        
        selectAllContainer.appendChild(selectAllButton);
        selectAllContainer.appendChild(deselectAllButton);
        container.appendChild(selectAllContainer);

        Object.entries(trimGroups).forEach(([key, group]) => {
            const control = document.createElement('div');
            control.className = 'control-group';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `trim-${key.replace(/\s+/g, '-')}`;
            checkbox.value = key;
            checkbox.addEventListener('change', () => this.updateVehicleSelection());
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = `${group.make} ${group.model} ${group.trim} (${group.vehicles.length} vehicles)`;
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '0.5rem';
            label.style.cursor = 'pointer';
            
            label.insertBefore(checkbox, label.firstChild);
            control.appendChild(label);
            container.appendChild(control);
        });
    }

    createVariantControls(container, vehicles) {
        // Add select all/deselect all for variants
        const selectAllContainer = document.createElement('div');
        selectAllContainer.className = 'control-group select-all-container';
        selectAllContainer.style.marginBottom = '1rem';
        selectAllContainer.style.paddingBottom = '1rem';
        selectAllContainer.style.borderBottom = '1px solid var(--border-color)';
        
        const selectAllButton = document.createElement('button');
        selectAllButton.type = 'button';
        selectAllButton.className = 'export-button secondary';
        selectAllButton.textContent = 'Select All Variants';
        selectAllButton.style.marginRight = '0.5rem';
        selectAllButton.addEventListener('click', () => this.selectAllVariants());
        
        const deselectAllButton = document.createElement('button');
        deselectAllButton.type = 'button';
        deselectAllButton.className = 'export-button secondary';
        deselectAllButton.textContent = 'Deselect All Variants';
        deselectAllButton.addEventListener('click', () => this.deselectAllVariants());
        
        selectAllContainer.appendChild(selectAllButton);
        selectAllContainer.appendChild(deselectAllButton);
        container.appendChild(selectAllContainer);

        vehicles.forEach((vehicle, index) => {
            const control = document.createElement('div');
            control.className = 'control-group';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `variant-${index}`;
            checkbox.value = index;
            checkbox.addEventListener('change', () => this.updateVehicleSelection());
            
            const versionName = vehicle.vehicle?.versionName || 'Unknown Variant';
            const make = vehicle.vehicle?.make || 'Unknown';
            const model = vehicle.vehicle?.model || 'Unknown';
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = `${make} ${model} - ${versionName}`;
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '0.5rem';
            label.style.cursor = 'pointer';
            
            label.insertBefore(checkbox, label.firstChild);
            control.appendChild(label);
            container.appendChild(control);
        });
    }

    updateVehicleSelection() {
        this.selectedVehicles = [];
        
        if (this.currentLevel === 'all') {
            this.selectedVehicles = this.vehicleData.data;
        } else {
            const checkboxes = document.querySelectorAll('#vehicle-selection-controls input[type="checkbox"]:checked');
            checkboxes.forEach(checkbox => {
                if (this.currentLevel === 'model' || this.currentLevel === 'trim') {
                    const key = checkbox.value;
                    const groups = this.currentLevel === 'model' ? this.groupByModel(this.vehicleData.data) : this.groupByTrim(this.vehicleData.data);
                    if (groups[key]) {
                        this.selectedVehicles.push(...groups[key].vehicles);
                    }
                } else if (this.currentLevel === 'variant') {
                    const index = parseInt(checkbox.value);
                    if (this.vehicleData.data[index]) {
                        this.selectedVehicles.push(this.vehicleData.data[index]);
                    }
                }
            });
        }
        
        this.updateSelectionSummary();
    }

    updateSelectionSummary() {
        const summary = document.getElementById('selection-summary');
        const content = document.getElementById('selection-summary-content');
        
        if (this.selectedVehicles.length === 0) {
            summary.style.display = 'none';
            return;
        }
        
        summary.style.display = 'block';
        
        let summaryText = `${this.selectedVehicles.length} vehicle(s) selected`;
        
        if (this.selectedVehicles.length > 0) {
            const makes = [...new Set(this.selectedVehicles.map(v => v.vehicle?.make).filter(Boolean))];
            const models = [...new Set(this.selectedVehicles.map(v => v.vehicle?.model).filter(Boolean))];
            const trims = [...new Set(this.selectedVehicles.map(v => v.vehicle?.trim).filter(Boolean))];
            
            if (makes.length > 0) {
                summaryText += ` from ${makes.join(', ')}`;
            }
            if (models.length > 0) {
                summaryText += ` (${models.join(', ')})`;
            }
            if (trims.length > 0 && this.currentLevel !== 'variant') {
                summaryText += ` - ${trims.length} trim level(s)`;
            }
            
            // Add year range if available
            const years = this.selectedVehicles.map(v => v.vehicle?.modelYear).filter(Boolean);
            if (years.length > 0) {
                const minYear = Math.min(...years);
                const maxYear = Math.max(...years);
                if (minYear === maxYear) {
                    summaryText += ` (${minYear})`;
                } else {
                    summaryText += ` (${minYear}-${maxYear})`;
                }
            }
        }
        
        content.textContent = summaryText;
    }

    onLevelChange(level) {
        // Update active button
        document.querySelectorAll('.level-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-level="${level}"]`).classList.add('active');
        
        this.currentLevel = level;
        this.selectedVehicles = [];
        
        if (this.vehicleData) {
            this.populateVehicleSelection();
        }
    }

    populateCategories() {
        const container = document.getElementById('category-grid');
        container.innerHTML = '';

        this.availableCategories.forEach(category => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.addEventListener('click', () => this.toggleCategory(category));

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'category-checkbox';
            checkbox.checked = this.selectedCategories.has(category);

            const label = document.createElement('span');
            label.className = 'category-label';
            label.textContent = this.categoryDisplayNames[category] || category;

            item.appendChild(checkbox);
            item.appendChild(label);
            container.appendChild(item);
        });
    }

    toggleCategory(category) {
        if (this.selectedCategories.has(category)) {
            this.selectedCategories.delete(category);
        } else {
            this.selectedCategories.add(category);
        }
        
        // Update visual state
        const item = event.currentTarget;
        const checkbox = item.querySelector('.category-checkbox');
        checkbox.checked = this.selectedCategories.has(category);
        
        if (this.selectedCategories.has(category)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    }

    selectAllCategories() {
        this.selectedCategories.clear();
        this.availableCategories.forEach(category => {
            this.selectedCategories.add(category);
        });
        this.updateCategoryDisplay();
    }

    deselectAllCategories() {
        this.selectedCategories.clear();
        this.updateCategoryDisplay();
    }

    updateCategoryDisplay() {
        document.querySelectorAll('.category-item').forEach((item, index) => {
            const category = this.availableCategories[index];
            const checkbox = item.querySelector('.category-checkbox');
            const isSelected = this.selectedCategories.has(category);
            
            checkbox.checked = isSelected;
            if (isSelected) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    exportData(format) {
        if (this.selectedVehicles.length === 0) {
            alert('Please select at least one vehicle to export.');
            return;
        }

        if (this.selectedCategories.size === 0) {
            alert('Please select at least one data category to export.');
            return;
        }

        const filteredData = this.filterVehicleData();
        
        if (format === 'json') {
            this.downloadJSON(filteredData);
        } else if (format === 'csv') {
            this.downloadCSV(filteredData);
        }
    }

    filterVehicleData() {
        const filteredVehicles = this.selectedVehicles.map(vehicle => {
            const filteredVehicle = {
                meta: vehicle.meta || {},
                vehicle: {}
            };

            // Always include basic vehicle info
            const basicFields = [
                'publicId', 'vehicleId', 'uniqueId', 'make', 'model', 'trim',
                'versionName', 'modelYear', 'vehicleType', 'bodyType',
                'numberOfDoors', 'transmissionType', 'transmissionNumberOfSpeeds',
                'transmissionDescription', 'engineLiters', 'engineConfiguration',
                'engineNumberOfCylinders', 'drivenWheels', 'fuelType',
                'powertrainType', 'price', 'isCurrent', 'hasEvData'
            ];

            basicFields.forEach(field => {
                if (vehicle.vehicle?.[field] !== undefined) {
                    filteredVehicle.vehicle[field] = vehicle.vehicle[field];
                }
            });

            // Include selected categories
            this.selectedCategories.forEach(category => {
                if (vehicle.vehicle?.[category]) {
                    filteredVehicle.vehicle[category] = vehicle.vehicle[category];
                }
            });

            return filteredVehicle;
        });

        return {
            meta: this.vehicleData.meta,
            data: filteredVehicles,
            exportInfo: {
                exportedAt: new Date().toISOString(),
                selectedCategories: Array.from(this.selectedCategories),
                vehicleCount: filteredVehicles.length,
                exportLevel: this.currentLevel
            }
        };
    }

    downloadJSON(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vehicle-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    downloadCSV(data) {
        const csv = this.convertToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vehicle-data-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    convertToCSV(data) {
        if (data.data.length === 0) return '';

        // Get all possible fields from all vehicles
        const allFields = new Set();
        data.data.forEach(vehicle => {
            this.flattenObject(vehicle.vehicle, '', allFields);
        });

        const fields = Array.from(allFields).sort();
        const csvRows = [];

        // Add header row
        csvRows.push(fields.join(','));

        // Add data rows
        data.data.forEach(vehicle => {
            const row = fields.map(field => {
                const value = this.getNestedValue(vehicle.vehicle, field);
                return this.escapeCSVValue(value);
            });
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    flattenObject(obj, prefix = '', fields) {
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            const newKey = prefix ? `${prefix}.${key}` : key;
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                this.flattenObject(value, newKey, fields);
            } else {
                fields.add(newKey);
            }
        });
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : '';
        }, obj);
    }

    escapeCSVValue(value) {
        if (value === null || value === undefined) return '';
        
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    }

    previewData() {
        if (this.selectedVehicles.length === 0) {
            alert('Please select at least one vehicle to preview.');
            return;
        }

        if (this.selectedCategories.size === 0) {
            alert('Please select at least one data category to preview.');
            return;
        }

        const filteredData = this.filterVehicleData();
        const preview = document.getElementById('preview-content');
        const panel = document.getElementById('preview-panel');
        
        preview.textContent = JSON.stringify(filteredData, null, 2);
        panel.classList.add('active');
        
        // Scroll to preview
        panel.scrollIntoView({ behavior: 'smooth' });
    }

    resetAllSelections() {
        this.vehicleData = null;
        this.selectedCategories.clear();
        this.selectedVehicles = [];
        this.currentLevel = 'all';
        
        document.getElementById('vehicle-selection-panel').style.display = 'none';
        document.getElementById('category-selection-panel').style.display = 'none';
        document.getElementById('export-options').style.display = 'none';
        document.getElementById('preview-panel').classList.remove('active');
        document.getElementById('selection-summary').style.display = 'none';
        
        this.updateCategoryDisplay();
    }

    hideAllPanels() {
        document.getElementById('vehicle-selection-panel').style.display = 'none';
        document.getElementById('category-selection-panel').style.display = 'none';
        document.getElementById('export-options').style.display = 'none';
        document.getElementById('preview-panel').classList.remove('active');
    }

    showLoading() {
        document.getElementById('loading-state').style.display = 'block';
        document.getElementById('error-state').style.display = 'none';
        this.hideAllPanels();
    }

    showError(message) {
        document.getElementById('error-text').textContent = message;
        document.getElementById('error-state').style.display = 'block';
        document.getElementById('loading-state').style.display = 'none';
        this.hideAllPanels();
    }

    // Helper methods for selecting/deselecting all items
    selectAllModels() {
        const checkboxes = document.querySelectorAll('#vehicle-selection-controls input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        this.updateVehicleSelection();
    }

    deselectAllModels() {
        const checkboxes = document.querySelectorAll('#vehicle-selection-controls input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateVehicleSelection();
    }

    selectAllTrims() {
        const checkboxes = document.querySelectorAll('#vehicle-selection-controls input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        this.updateVehicleSelection();
    }

    deselectAllTrims() {
        const checkboxes = document.querySelectorAll('#vehicle-selection-controls input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateVehicleSelection();
    }

    selectAllVariants() {
        const checkboxes = document.querySelectorAll('#vehicle-selection-controls input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        this.updateVehicleSelection();
    }

    deselectAllVariants() {
        const checkboxes = document.querySelectorAll('#vehicle-selection-controls input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateVehicleSelection();
    }
}

// Initialise the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VehicleDataExport();
});
