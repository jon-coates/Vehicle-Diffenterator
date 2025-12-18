// Fuel Cost Calculator JavaScript

class FuelCostCalculator {
    constructor() {
        this.vehicleDataMap = {}; // Map of filename -> vehicle data
        this.variants = []; // Array of {variant, vehicleName, filename}
        this.currentCalculations = [];
        this.selectedVehicles = new Set(); // Set of selected vehicle filenames
        this.vehicleList = [
            { filename: 'bydSealion6.json', name: 'BYD Sealion 6' },
            { filename: 'bydSealion7.json', name: 'BYD Sealion 7' },
            { filename: 'FDRA.json', name: 'Ford Ranger' },
            { filename: 'fordTransit.json', name: 'Ford Transit' },
            { filename: 'hyKona.json', name: 'Hyundai Kona' },
            { filename: 'mazda2.json', name: 'Mazda 2' },
            { filename: 'allJuke.json', name: 'Nissan Juke' },
            { filename: 'nissanPatrol.json', name: 'Nissan Patrol' },
            { filename: 'suzukiJimny.json', name: 'Suzuki Jimny' },
            { filename: 'teslamodely.json', name: 'Tesla Model Y' },
            { filename: 'rav4.json', name: 'Toyota RAV4' }
        ];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDefaults();
        this.setupNumberFormatting();
    }

    formatNumber(num) {
        if (num === null || num === undefined || isNaN(num)) return '0';
        return parseFloat(num).toLocaleString('en-AU');
    }

    formatCurrency(num, decimals = 2) {
        if (num === null || num === undefined || isNaN(num)) return '$0.00';
        return '$' + parseFloat(num).toLocaleString('en-AU', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    parseNumberInput(value) {
        if (!value) return 0;
        // Remove commas and other formatting, then parse
        const cleaned = String(value).replace(/,/g, '').trim();
        return parseFloat(cleaned) || 0;
    }

    setupNumberFormatting() {
        // Format input fields on blur and format on input for better UX
        const numberInputs = [
            'distance-input',
            'weekly-distance-input',
            'unleaded-cost-input',
            'premium-unleaded-cost-input',
            'diesel-cost-input',
            'kwh-cost-input'
        ];

        numberInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (!input) return;

            // Format on blur (when user leaves the field)
            input.addEventListener('blur', (e) => {
                const value = this.parseNumberInput(e.target.value);
                if (!isNaN(value) && value >= 0) {
                    if (inputId === 'kwh-cost-input') {
                        // For kWh, show 2 decimal places
                        e.target.value = value.toLocaleString('en-AU', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        });
                    } else if (inputId.includes('cost-input')) {
                        // For cost inputs (cents), show 1 decimal place
                        e.target.value = value.toLocaleString('en-AU', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1
                        });
                    } else {
                        // For distance fields, show as integer
                        e.target.value = Math.round(value).toLocaleString('en-AU');
                    }
                }
            });

            // Allow typing without interference, but handle paste events
            input.addEventListener('paste', (e) => {
                setTimeout(() => {
                    const value = this.parseNumberInput(e.target.value);
                    if (!isNaN(value) && value > 0) {
                        e.target.value = value;
                    }
                }, 0);
            });
        });
    }

    loadDefaults() {
        // Initialize dropdown
        this.initVehicleDropdown();
        
        // Select default vehicle (Ford Ranger)
        this.selectVehicle('FDRA.json');
        
        // Load the default vehicle data
        this.loadSelectedVehicles();
        
        // Enable calculate button since we have defaults
        this.enableCalculateButton();
        
        // Update distance displays
        this.updateDistanceDisplays();
        
        // Auto-calculate with defaults
        setTimeout(() => {
            if (this.variants.length > 0) {
                this.calculateFuelCosts();
            }
        }, 500);
    }

    initVehicleDropdown() {
        const dropdown = document.getElementById('vehicle-dropdown');
        const searchInput = document.getElementById('vehicle-search-input');
        const wrapper = document.getElementById('vehicle-select-wrapper');
        
        // Populate dropdown with all vehicles
        dropdown.innerHTML = this.vehicleList.map(vehicle => `
            <div class="vehicle-dropdown-item" data-filename="${vehicle.filename}">
                <input type="checkbox" id="vehicle-${vehicle.filename}" value="${vehicle.filename}">
                <label for="vehicle-${vehicle.filename}" style="cursor: pointer; flex: 1;">${vehicle.name}</label>
            </div>
        `).join('');

        // Search functionality
        searchInput.addEventListener('input', (e) => {
            this.filterVehicleDropdown(e.target.value);
        });

        // Toggle dropdown on input focus/click
        searchInput.addEventListener('focus', () => {
            wrapper.classList.add('open');
        });

        searchInput.addEventListener('click', () => {
            wrapper.classList.add('open');
        });

        // Handle checkbox clicks in dropdown
        dropdown.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const filename = e.target.value;
                if (e.target.checked) {
                    this.selectVehicle(filename);
                } else {
                    this.deselectVehicle(filename);
                }
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('open');
            }
        });

        // Prevent closing when clicking inside dropdown
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    filterVehicleDropdown(searchText) {
        const filterText = searchText.toLowerCase().trim();
        const items = document.querySelectorAll('.vehicle-dropdown-item');
        
        items.forEach(item => {
            const vehicleName = item.textContent.toLowerCase();
            if (vehicleName.includes(filterText)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    }

    selectVehicle(filename) {
        this.selectedVehicles.add(filename);
        this.updateVehicleCheckbox(filename, true);
        this.updateVehicleTags();
        // Clear search input after selection
        const searchInput = document.getElementById('vehicle-search-input');
        if (searchInput) {
            searchInput.value = '';
            this.filterVehicleDropdown('');
        }
        this.loadSelectedVehicles();
    }

    deselectVehicle(filename) {
        this.selectedVehicles.delete(filename);
        this.updateVehicleCheckbox(filename, false);
        this.updateVehicleTags();
        this.loadSelectedVehicles();
    }

    updateVehicleCheckbox(filename, checked) {
        const checkbox = document.getElementById(`vehicle-${filename}`);
        if (checkbox) {
            checkbox.checked = checked;
            const item = checkbox.closest('.vehicle-dropdown-item');
            if (item) {
                if (checked) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            }
        }
    }

    updateVehicleTags() {
        const tagsContainer = document.getElementById('vehicle-selected-tags');
        tagsContainer.innerHTML = '';
        
        this.selectedVehicles.forEach(filename => {
            const vehicle = this.vehicleList.find(v => v.filename === filename);
            if (vehicle) {
                const tag = document.createElement('div');
                tag.className = 'vehicle-tag';
                tag.innerHTML = `
                    <span>${vehicle.name}</span>
                    <span class="vehicle-tag-remove" data-filename="${filename}">×</span>
                `;
                tag.querySelector('.vehicle-tag-remove').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deselectVehicle(filename);
                });
                tagsContainer.appendChild(tag);
            }
        });
    }

    setupEventListeners() {
        // Vehicle selection is handled in initVehicleDropdown()

        // Driving type selection - auto-calculate on change
        document.querySelectorAll('.driving-type-radio').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateDrivingTypeControls();
                this.updateDistanceDisplays();
                this.enableCalculateButton();
                if (this.canCalculate()) {
                    this.calculateFuelCosts();
                }
            });
        });

        // Country percentage slider - auto-calculate on change
        const countrySlider = document.getElementById('country-slider');
        countrySlider.addEventListener('input', (e) => {
            this.updateSliderValues(e.target.value);
            this.enableCalculateButton();
            if (this.canCalculate()) {
                this.calculateFuelCosts();
            }
        });
        
        // Initial distance display update will happen after defaults load

        // Calculation type selection
        document.querySelectorAll('input[name="calculation-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateCalculationTypeControls();
                this.updateDistanceDisplays();
                this.enableCalculateButton();
                if (this.canCalculate()) {
                    this.calculateFuelCosts();
                }
            });
        });

        // Input fields - auto-calculate on change
        document.getElementById('distance-input').addEventListener('input', () => {
            this.updateDistanceDisplays();
            this.enableCalculateButton();
            if (this.canCalculate()) {
                this.calculateFuelCosts();
            }
        });

        document.getElementById('weekly-distance-input').addEventListener('input', () => {
            this.updateAnnualDistanceDisplay();
            this.updateDistanceDisplays();
            this.enableCalculateButton();
            if (this.canCalculate()) {
                this.calculateFuelCosts();
            }
        });

        document.getElementById('unleaded-cost-input').addEventListener('input', () => {
            this.enableCalculateButton();
            if (this.canCalculate()) {
                this.calculateFuelCosts();
            }
        });

        document.getElementById('premium-unleaded-cost-input').addEventListener('input', () => {
            this.enableCalculateButton();
            if (this.canCalculate()) {
                this.calculateFuelCosts();
            }
        });

        document.getElementById('diesel-cost-input').addEventListener('input', () => {
            this.enableCalculateButton();
            if (this.canCalculate()) {
                this.calculateFuelCosts();
            }
        });

        document.getElementById('kwh-cost-input').addEventListener('input', () => {
            this.enableCalculateButton();
            if (this.canCalculate()) {
                this.calculateFuelCosts();
            }
        });

        // Calculate button
        document.getElementById('calculate-button').addEventListener('click', () => {
            this.calculateFuelCosts();
        });

        // Variant filter
        document.getElementById('variant-filter').addEventListener('input', (e) => {
            this.filterVariants(e.target.value);
        });
    }

    updateDrivingTypeControls() {
        const mixControls = document.getElementById('mix-controls');
        const drivingMix = document.getElementById('driving-mix').checked;
        
        if (drivingMix) {
            mixControls.classList.add('active');
        } else {
            mixControls.classList.remove('active');
        }
    }

    updateSliderValues(countryValue) {
        const countryPercentage = parseInt(countryValue);
        const urbanPercentage = 100 - countryPercentage;
        
        document.getElementById('urban-percentage').textContent = urbanPercentage;
        document.getElementById('country-percentage').textContent = countryPercentage;
        
        // Update distance displays
        this.updateDistanceDisplays();
    }

    updateDistanceDisplays() {
        // Only update if custom mix is selected
        const drivingMix = document.getElementById('driving-mix').checked;
        if (!drivingMix) {
            return;
        }
        
        const distance = this.getDistance();
        const countryPercentage = parseInt(document.getElementById('country-slider').value);
        const urbanPercentage = 100 - countryPercentage;
        
        const urbanDistance = Math.round(distance * urbanPercentage / 100);
        const countryDistance = Math.round(distance * countryPercentage / 100);
        
        document.getElementById('urban-distance').textContent = this.formatNumber(urbanDistance);
        document.getElementById('country-distance').textContent = this.formatNumber(countryDistance);
    }

    updateCalculationTypeControls() {
        const calcType = document.querySelector('input[name="calculation-type"]:checked').value;
        const singleTripGroup = document.getElementById('single-trip-group');
        const annualGroup = document.getElementById('annual-group');
        
        if (calcType === 'annual') {
            singleTripGroup.style.display = 'none';
            annualGroup.style.display = 'block';
        } else {
            singleTripGroup.style.display = 'block';
            annualGroup.style.display = 'none';
        }
    }

    updateAnnualDistanceDisplay() {
        const weeklyDistance = this.parseNumberInput(document.getElementById('weekly-distance-input').value) || 0;
        const annualDistance = weeklyDistance * 52;
        document.getElementById('annual-distance-display').textContent = this.formatNumber(annualDistance);
    }

    enableCalculateButton() {
        const distanceInput = document.getElementById('distance-input');
        const weeklyDistanceInput = document.getElementById('weekly-distance-input');
        const unleadedCostInput = document.getElementById('unleaded-cost-input');
        const premiumUnleadedCostInput = document.getElementById('premium-unleaded-cost-input');
        const dieselCostInput = document.getElementById('diesel-cost-input');
        const kwhCostInput = document.getElementById('kwh-cost-input');
        const calculateButton = document.getElementById('calculate-button');
        const calcType = document.querySelector('input[name="calculation-type"]:checked').value;

        // Check if at least one vehicle is selected
        const hasVehicle = this.selectedVehicles.size > 0;
        
        const hasDistance = calcType === 'single' 
            ? (distanceInput.value && this.parseNumberInput(distanceInput.value) > 0)
            : (weeklyDistanceInput.value && this.parseNumberInput(weeklyDistanceInput.value) > 0);
        const hasUnleadedCost = unleadedCostInput.value && this.parseNumberInput(unleadedCostInput.value) > 0;
        const hasPremiumUnleadedCost = premiumUnleadedCostInput.value && this.parseNumberInput(premiumUnleadedCostInput.value) > 0;
        const hasDieselCost = dieselCostInput.value && this.parseNumberInput(dieselCostInput.value) > 0;
        const hasKwhCost = kwhCostInput.value && this.parseNumberInput(kwhCostInput.value) > 0;
        const hasAtLeastOneCost = hasUnleadedCost || hasPremiumUnleadedCost || hasDieselCost || hasKwhCost;

        calculateButton.disabled = !(hasVehicle && hasDistance && hasAtLeastOneCost);
    }

    async loadSelectedVehicles() {
        const selectedFilenames = Array.from(this.selectedVehicles);
        
        if (selectedFilenames.length === 0) {
            this.variants = [];
            this.hideResults();
            this.enableCalculateButton();
            return;
        }

        try {
            this.showLoading(true);
            this.hideError();
            this.hideResults();

            // Load all selected vehicles
            const loadPromises = selectedFilenames.map(async (filename) => {
                // If already loaded, use cached data
                if (this.vehicleDataMap[filename]) {
                    return { filename, data: this.vehicleDataMap[filename] };
                }

                // Otherwise, fetch it
                const response = await fetch(`vehicleData/${filename}`);
                if (!response.ok) {
                    throw new Error(`Failed to load ${filename}`);
                }
                const data = await response.json();
                this.vehicleDataMap[filename] = data;
                return { filename, data };
            });

            const loadedVehicles = await Promise.all(loadPromises);
            
            // Extract variants from all selected vehicles
            this.variants = [];
            loadedVehicles.forEach(({ filename, data }) => {
                const vehicleName = this.getVehicleNameFromFilename(filename);
                const variants = (data.data || []).map(item => item.vehicle || item).filter(vehicle => {
                    return vehicle && vehicle.performance;
                });
                
                variants.forEach(variant => {
                    this.variants.push({
                        variant: variant,
                        vehicleName: vehicleName,
                        filename: filename
                    });
                });
            });

            // Filter variants to only include selected vehicles
            this.variants = this.variants.filter(v => selectedFilenames.includes(v.filename));

            if (this.variants.length === 0) {
                throw new Error('No vehicle variants with fuel consumption data found');
            }

            this.showLoading(false);
            this.enableCalculateButton();

            // Auto-calculate after loading vehicle data
            if (this.canCalculate()) {
                this.calculateFuelCosts();
            }

        } catch (error) {
            console.error('Error loading vehicle data:', error);
            this.showError(`Failed to load vehicle data: ${error.message}`);
            this.showLoading(false);
            this.variants = [];
        }
    }

    getVehicleNameFromFilename(filename) {
        const vehicle = this.vehicleList.find(v => v.filename === filename);
        return vehicle ? vehicle.name : filename.replace('.json', '');
    }

    canCalculate() {
        const distanceInput = document.getElementById('distance-input');
        const weeklyDistanceInput = document.getElementById('weekly-distance-input');
        const unleadedCostInput = document.getElementById('unleaded-cost-input');
        const premiumUnleadedCostInput = document.getElementById('premium-unleaded-cost-input');
        const dieselCostInput = document.getElementById('diesel-cost-input');
        const kwhCostInput = document.getElementById('kwh-cost-input');
        const calcType = document.querySelector('input[name="calculation-type"]:checked').value;

        const hasVehicle = this.selectedVehicles.size > 0;
        
        const hasDistance = calcType === 'single' 
            ? (distanceInput.value && this.parseNumberInput(distanceInput.value) > 0)
            : (weeklyDistanceInput.value && this.parseNumberInput(weeklyDistanceInput.value) > 0);
        const hasUnleadedCost = unleadedCostInput.value && this.parseNumberInput(unleadedCostInput.value) > 0;
        const hasPremiumUnleadedCost = premiumUnleadedCostInput.value && this.parseNumberInput(premiumUnleadedCostInput.value) > 0;
        const hasDieselCost = dieselCostInput.value && this.parseNumberInput(dieselCostInput.value) > 0;
        const hasKwhCost = kwhCostInput.value && this.parseNumberInput(kwhCostInput.value) > 0;
        const hasAtLeastOneCost = hasUnleadedCost || hasPremiumUnleadedCost || hasDieselCost || hasKwhCost;

        return hasVehicle && hasDistance && hasAtLeastOneCost && this.variants.length > 0;
    }

    getDistance() {
        const calcType = document.querySelector('input[name="calculation-type"]:checked').value;
        if (calcType === 'annual') {
            const weeklyDistance = this.parseNumberInput(document.getElementById('weekly-distance-input').value) || 0;
            return weeklyDistance * 52; // Annual distance
        } else {
            return this.parseNumberInput(document.getElementById('distance-input').value) || 0;
        }
    }

    getFuelConsumptionRate(variant) {
        const performance = variant.performance || {};
        const drivingType = document.querySelector('input[name="driving-type"]:checked').value;

        if (drivingType === 'standard') {
            // Use combined fuel consumption
            const combined = performance.fuelConsumptionAdr8102CombinedL100km;
            if (combined) {
                return parseFloat(combined);
            }
            // Fallback to general fuel economy if combined not available
            const general = performance.fuelEconomyAdr8102L100km;
            if (general) {
                return parseFloat(general);
            }
            return null;
        } else {
            // Custom mix: calculate weighted average
            const urban = performance.fuelConsumptionAdr8102UrbanL100km;
            const country = performance.fuelConsumptionAdr8102CountryHighwayL100km;
            
            if (!urban || !country) {
                // Fallback to combined if mix data not available
                const combined = performance.fuelConsumptionAdr8102CombinedL100km;
                if (combined) {
                    return parseFloat(combined);
                }
                return null;
            }

            const countryPercentage = parseInt(document.getElementById('country-slider').value) / 100;
            const urbanPercentage = 1 - countryPercentage;

            const urbanRate = parseFloat(urban);
            const countryRate = parseFloat(country);

            return (urbanRate * urbanPercentage) + (countryRate * countryPercentage);
        }
    }

    getElectricEnergyConsumptionRate(variant) {
        const performance = variant.performance || {};
        const hybridAndElectricSystems = variant.hybridAndElectricSystems || {};
        
        // Method 1: Check for direct electric energy consumption (Wh/km)
        // Convert to kWh/100km: Wh/km / 10 (since 1 kWh = 1000 Wh and we need per 100km)
        const electricConsumptionWhKm = performance.bevHevElectricEnergyConsumptionCombinedWhKm;
        if (electricConsumptionWhKm && electricConsumptionWhKm !== 'Not Available') {
            return parseFloat(electricConsumptionWhKm) / 10;
        }
        
        // Method 2: Check for powerConsumptionCombinedWhKm (used by some vehicles like BYD)
        const powerConsumptionWhKm = performance.powerConsumptionCombinedWhKm;
        if (powerConsumptionWhKm && powerConsumptionWhKm !== 'Not Available') {
            return parseFloat(powerConsumptionWhKm) / 10;
        }
        
        // Method 3: Calculate from battery capacity and electric range (for PHEVs)
        // Formula: (battery capacity kWh / range km) * 100 = kWh/100km
        const batteryCapacityKwh = hybridAndElectricSystems.electricPowerSourceUseableBatteryKilowattHour;
        const electricRangeKm = hybridAndElectricSystems.electricPowerSourceRangeKm;
        
        if (batteryCapacityKwh && electricRangeKm && 
            batteryCapacityKwh !== 'Not Available' && electricRangeKm !== 'Not Available') {
            const batteryKwh = parseFloat(batteryCapacityKwh);
            const rangeKm = parseFloat(electricRangeKm);
            
            if (batteryKwh > 0 && rangeKm > 0) {
                // Calculate kWh/100km
                return (batteryKwh / rangeKm) * 100;
            }
        }
        
        // Method 4: Check for powerConsumptionCombinedKwh100km (direct kWh/100km)
        const powerConsumptionKwh100km = performance.powerConsumptionCombinedKwh100km;
        if (powerConsumptionKwh100km && powerConsumptionKwh100km !== 'Not Available') {
            return parseFloat(powerConsumptionKwh100km);
        }
        
        return null;
    }

    getFuelTypeForCostCalculation(variant, hasFuelConsumptionData) {
        // If there's fuel consumption data, we need to determine the actual fuel type used
        // For PHEVs and hybrids, the primary fuelType might be "Electric" but they still use fuel
        if (hasFuelConsumptionData) {
            const fuel = variant.fuel || {};
            const vehicleGeneralInfo = variant.vehicleGeneralInfo || {};
            
            // Check for secondary/additional fuel types (for PHEVs)
            // Priority order:
            // 1. fuel.fuelOtherFuelType (most specific)
            // 2. fuel.fuelMinimumFuelType (minimum required)
            // 3. fuel.additionalFuelTypesUnleadedFuelType (additional fuel types)
            // 4. vehicleGeneralInfo.otherFuelType (fallback)
            
            const secondaryFuelType = fuel.fuelOtherFuelType || 
                                    fuel.fuelMinimumFuelType || 
                                    fuel.additionalFuelTypesUnleadedFuelType ||
                                    vehicleGeneralInfo.otherFuelType;
            
            // If primary fuel type is "Electric" but we have fuel consumption data and a secondary fuel type,
            // use the secondary fuel type for cost calculation
            const primaryFuelType = (variant.fuelType || '').toLowerCase();
            if (primaryFuelType.includes('electric') && secondaryFuelType) {
                return secondaryFuelType;
            }
        }
        
        // Default to primary fuel type
        return variant.fuelType || 'Unknown';
    }

    getCostForFuelType(fuelType) {
        const unleadedCostInput = document.getElementById('unleaded-cost-input');
        const premiumUnleadedCostInput = document.getElementById('premium-unleaded-cost-input');
        const dieselCostInput = document.getElementById('diesel-cost-input');
        
        const fuelTypeLower = (fuelType || '').toLowerCase();
        
        // Check if it's diesel
        if (fuelTypeLower.includes('diesel')) {
            const dieselCostCents = this.parseNumberInput(dieselCostInput.value);
            if (dieselCostCents && dieselCostCents > 0) {
                // Convert cents to dollars for calculation
                return dieselCostCents / 100;
            }
        }
        
        // Check if it's premium unleaded
        if (fuelTypeLower.includes('premium')) {
            const premiumUnleadedCostCents = this.parseNumberInput(premiumUnleadedCostInput.value);
            if (premiumUnleadedCostCents && premiumUnleadedCostCents > 0) {
                // Convert cents to dollars for calculation
                return premiumUnleadedCostCents / 100;
            }
            // Fallback to regular unleaded if premium not available
            const unleadedCostCents = this.parseNumberInput(unleadedCostInput.value);
            if (unleadedCostCents && unleadedCostCents > 0) {
                return unleadedCostCents / 100;
            }
        }
        
        // Default to regular unleaded for unleaded, petrol, or if diesel cost not available
        const unleadedCostCents = this.parseNumberInput(unleadedCostInput.value);
        if (unleadedCostCents && unleadedCostCents > 0) {
            // Convert cents to dollars for calculation
            return unleadedCostCents / 100;
        }
        
        // Fallback to premium unleaded if regular unleaded not available
        const premiumUnleadedCostCents = this.parseNumberInput(premiumUnleadedCostInput.value);
        if (premiumUnleadedCostCents && premiumUnleadedCostCents > 0) {
            return premiumUnleadedCostCents / 100;
        }
        
        // Fallback to diesel if no unleaded available (shouldn't happen due to validation)
        const dieselCostCents = this.parseNumberInput(dieselCostInput.value) || 0;
        return dieselCostCents / 100;
    }

    calculateFuelCosts() {
        const unleadedCostInput = document.getElementById('unleaded-cost-input');
        const premiumUnleadedCostInput = document.getElementById('premium-unleaded-cost-input');
        const dieselCostInput = document.getElementById('diesel-cost-input');
        const kwhCostInput = document.getElementById('kwh-cost-input');

        const distance = this.getDistance();
        const unleadedCost = this.parseNumberInput(unleadedCostInput.value);
        const premiumUnleadedCost = this.parseNumberInput(premiumUnleadedCostInput.value);
        const dieselCost = this.parseNumberInput(dieselCostInput.value);
        const kwhCost = this.parseNumberInput(kwhCostInput.value);

        if (!distance || distance <= 0) {
            this.showError('Please enter a valid distance greater than 0');
            return;
        }

        if ((!unleadedCost || unleadedCost <= 0) && (!premiumUnleadedCost || premiumUnleadedCost <= 0) && (!dieselCost || dieselCost <= 0) && (!kwhCost || kwhCost <= 0)) {
            this.showError('Please enter at least one valid fuel or electricity cost greater than 0');
            return;
        }

        if (this.variants.length === 0) {
            this.showError('No vehicle variants available');
            return;
        }

        // Calculate costs for all variants
        const calculations = this.variants.map(variantWrapper => {
            const variant = variantWrapper.variant;
            const vehicleName = variantWrapper.vehicleName;
            const fuelConsumptionRate = this.getFuelConsumptionRate(variant);
            const electricConsumptionRate = this.getElectricEnergyConsumptionRate(variant);
            
            // Check if we have at least one consumption type
            if (fuelConsumptionRate === null && electricConsumptionRate === null) {
                return {
                    variant: variant,
                    vehicleName: vehicleName,
                    hasData: false,
                    error: 'No fuel or electric consumption data available for this variant'
                };
            }

            let fuelCost = 0;
            let electricityCost = 0;
            let litresNeeded = 0;
            let kwhNeeded = 0;
            let costPerLitre = 0;
            let costPerKwh = 0;

            // Calculate fuel cost if fuel consumption data exists
            if (fuelConsumptionRate !== null) {
                // Get the appropriate fuel type for cost calculation (handles secondary fuel types for PHEVs)
                const fuelTypeForCost = this.getFuelTypeForCostCalculation(variant, true);
                costPerLitre = this.getCostForFuelType(fuelTypeForCost);
                
                if (!costPerLitre || costPerLitre <= 0) {
                    // If we have electric data, we can still calculate with just electricity
                    if (electricConsumptionRate === null) {
                        return {
                            variant: variant,
                            vehicleName: vehicleName,
                            hasData: false,
                            error: `No cost data available for ${fuelTypeForCost || 'this fuel type'}`
                        };
                    }
                } else {
                    litresNeeded = (distance / 100) * fuelConsumptionRate;
                    fuelCost = litresNeeded * costPerLitre;
                }
            }

            // Calculate electricity cost if electric consumption data exists
            if (electricConsumptionRate !== null) {
                if (!kwhCost || kwhCost <= 0) {
                    // If we have fuel data, we can still calculate with just fuel
                    if (fuelConsumptionRate === null) {
                        return {
                            variant: variant,
                            vehicleName: vehicleName,
                            hasData: false,
                            error: 'No electricity cost entered'
                        };
                    }
                } else {
                    kwhNeeded = (distance / 100) * electricConsumptionRate;
                    electricityCost = kwhNeeded * kwhCost;
                    costPerKwh = kwhCost;
                }
            }

            // Combined cost for hybrid vehicles, or single cost for pure ICE/EV
            const totalCost = fuelCost + electricityCost;

            return {
                variant: variant,
                vehicleName: vehicleName,
                hasData: true,
                fuelConsumptionRate: fuelConsumptionRate,
                electricConsumptionRate: electricConsumptionRate,
                litresNeeded: litresNeeded,
                kwhNeeded: kwhNeeded,
                fuelCost: fuelCost,
                electricityCost: electricityCost,
                totalCost: totalCost,
                distance: distance,
                costPerLitre: costPerLitre,
                costPerKwh: costPerKwh,
                costPerLitreCents: costPerLitre * 100, // Store in cents for display
                fuelType: fuelConsumptionRate !== null 
                    ? this.getFuelTypeForCostCalculation(variant, true) 
                    : (variant.fuelType || 'Unknown'),
                isHybrid: fuelConsumptionRate !== null && electricConsumptionRate !== null,
                isElectric: fuelConsumptionRate === null && electricConsumptionRate !== null,
                isICE: fuelConsumptionRate !== null && electricConsumptionRate === null
            };
        }).filter(calc => calc.hasData); // Only include variants with valid data

        if (calculations.length === 0) {
            this.showError('No variants with valid fuel or electric consumption data found');
            return;
        }

        // Sort by total cost
        calculations.sort((a, b) => a.totalCost - b.totalCost);

        // Display results
        const calcType = document.querySelector('input[name="calculation-type"]:checked').value;
        this.displayResults(calculations, distance, calcType);
    }

    displayResults(calculations, distance, calcType) {
        const resultsPanel = document.getElementById('results-panel');
        const resultsSummary = document.getElementById('results-summary');
        const resultsTablePanel = document.getElementById('results-table-panel');
        const resultsTableBody = document.getElementById('results-table-body');
        const variantFilter = document.getElementById('variant-filter');

        // Clear previous results and reset filter
        resultsTableBody.innerHTML = '';
        variantFilter.value = '';

        // Get selected vehicle names
        const selectedVehicleNames = Array.from(this.selectedVehicles)
            .map(filename => this.getVehicleNameFromFilename(filename));
        const vehicleNamesText = selectedVehicleNames.length === 1 
            ? selectedVehicleNames[0] 
            : `${selectedVehicleNames.length} Vehicles`;
        
        // Update results panel title
        const resultsTitle = document.getElementById('results-title');
        if (resultsTitle) {
            resultsTitle.textContent = `${vehicleNamesText} - Fuel Cost Results`;
        }

        // Helper function to build full vehicle details
        const buildVehicleDetails = (calc) => {
            const variant = calc.variant;
            const make = variant.make || '';
            const model = variant.model || '';
            const makeModel = `${make} ${model}`.trim() || calc.vehicleName;
            const variantName = variant.trim || variant.versionName || 'Unknown Variant';
            const configDetails = [
                variant.modelYear ? `${variant.modelYear}` : '',
                variant.transmissionType || '',
                variant.engineLiters ? `${variant.engineLiters}L` : '',
                variant.fuelType || ''
            ].filter(Boolean);
            
            return {
                makeModel: makeModel,
                variant: variantName,
                config: configDetails.join(' • ')
            };
        };

        // Create summary
        const cheapest = calculations[0];
        const mostExpensive = calculations[calculations.length - 1];

        const cheapestDetails = buildVehicleDetails(cheapest);
        const mostExpensiveDetails = buildVehicleDetails(mostExpensive);
        const costSuffix = calcType === 'annual' ? '/year' : '';
        const costDifference = mostExpensive.totalCost - cheapest.totalCost;

        resultsSummary.innerHTML = `
            <div class="summary-title">Results</div>
            <div class="summary-content">
                <div class="summary-rows">
                    <div class="summary-row cheapest-row">
                        <div class="summary-row-content">
                            <div class="summary-vehicle-details">
                                <div class="summary-vehicle-make-model">${cheapestDetails.makeModel} ${cheapestDetails.variant}</div>
                                ${cheapestDetails.config ? `<div class="summary-vehicle-config">${cheapestDetails.config}</div>` : ''}
                                <div class="summary-vehicle-badges">
                                    <span class="table-badge badge-cheapest">Cheapest</span>
                                </div>
                            </div>
                        </div>
                        <div class="summary-row-cost cheapest">${this.formatCurrency(cheapest.totalCost)}${costSuffix}</div>
                    </div>
                    <div class="summary-row expensive-row">
                        <div class="summary-row-content">
                            <div class="summary-vehicle-details">
                                <div class="summary-vehicle-make-model">${mostExpensiveDetails.makeModel} ${mostExpensiveDetails.variant}</div>
                                ${mostExpensiveDetails.config ? `<div class="summary-vehicle-config">${mostExpensiveDetails.config}</div>` : ''}
                                <div class="summary-vehicle-badges">
                                    <span class="table-badge badge-expensive">Most Expensive</span>
                                </div>
                            </div>
                        </div>
                        <div class="summary-row-cost expensive">${this.formatCurrency(mostExpensive.totalCost)}${costSuffix}</div>
                    </div>
                    <div class="summary-row difference-row">
                        <div class="summary-row-content">
                            <div class="summary-vehicle-details">
                                <div class="summary-vehicle-make-model">Cost Difference</div>
                            </div>
                        </div>
                        <div class="summary-row-cost highlight">${this.formatCurrency(costDifference)}${costSuffix}</div>
                    </div>
                </div>
            </div>
        `;

        // Create table rows
        calculations.forEach((calc, index) => {
            const isCheapest = index === 0;
            const isMostExpensive = index === calculations.length - 1 && calculations.length > 1;

            const row = document.createElement('tr');
            row.className = `${isCheapest ? 'cheapest' : ''} ${isMostExpensive ? 'most-expensive' : ''}`.trim();

            const variant = calc.variant;
            const variantName = variant.trim || variant.versionName || 'Unknown Variant';
            const makeModel = `${variant.make || ''} ${variant.model || ''}`.trim() || calc.vehicleName;
            const variantDetails = [
                variant.modelYear ? `${variant.modelYear}` : '',
                variant.transmissionType || '',
                variant.engineLiters ? `${variant.engineLiters}L` : '',
                variant.fuelType || ''
            ].filter(Boolean).join(' • ');
            
            const costSuffix = calcType === 'annual' ? '/year' : '';

            let badges = '';
            if (isCheapest) badges += '<span class="table-badge badge-cheapest">Cheapest</span>';
            if (isMostExpensive) badges += '<span class="table-badge badge-expensive">Most Expensive</span>';

            // Build consumption display
            let consumptionDisplay = '';
            if (calc.fuelConsumptionRate !== null) {
                consumptionDisplay += `${parseFloat(calc.fuelConsumptionRate.toFixed(2)).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L/100km`;
            }
            if (calc.electricConsumptionRate !== null) {
                if (consumptionDisplay) consumptionDisplay += '<br>';
                consumptionDisplay += `${parseFloat(calc.electricConsumptionRate.toFixed(2)).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh/100km`;
            }
            if (!consumptionDisplay) consumptionDisplay = 'N/A';

            // Build energy needed display
            let energyDisplay = '';
            if (calc.litresNeeded > 0) {
                energyDisplay += `${parseFloat(calc.litresNeeded.toFixed(2)).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
            }
            if (calc.kwhNeeded > 0) {
                if (energyDisplay) energyDisplay += '<br>';
                energyDisplay += `${parseFloat(calc.kwhNeeded.toFixed(2)).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh`;
            }
            if (!energyDisplay) energyDisplay = 'N/A';

            // Build cost per unit display
            let costPerUnitDisplay = '';
            if (calc.costPerLitre > 0) {
                costPerUnitDisplay += `${parseFloat(calc.costPerLitreCents.toFixed(1)).toLocaleString('en-AU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} c/L<br><span style="font-size: 0.85rem; color: var(--text-muted); font-weight: normal;">(${calc.fuelType})</span>`;
            }
            if (calc.costPerKwh > 0) {
                if (costPerUnitDisplay) costPerUnitDisplay += '<br>';
                costPerUnitDisplay += `${this.formatCurrency(calc.costPerKwh)}/kWh`;
            }
            if (!costPerUnitDisplay) costPerUnitDisplay = 'N/A';

            // Build total cost display with breakdown if hybrid
            let totalCostDisplay = '';
            if (calc.isHybrid) {
                totalCostDisplay = `${this.formatCurrency(calc.totalCost)}${costSuffix}<br>`;
                totalCostDisplay += `<span style="font-size: 0.85rem; color: var(--text-muted); font-weight: normal;">`;
                if (calc.fuelCost > 0) {
                    totalCostDisplay += `Fuel: ${this.formatCurrency(calc.fuelCost)}`;
                }
                if (calc.fuelCost > 0 && calc.electricityCost > 0) {
                    totalCostDisplay += ' + ';
                }
                if (calc.electricityCost > 0) {
                    totalCostDisplay += `Electric: ${this.formatCurrency(calc.electricityCost)}`;
                }
                totalCostDisplay += `</span>`;
            } else {
                totalCostDisplay = `${this.formatCurrency(calc.totalCost)}${costSuffix}`;
            }

            row.innerHTML = `
                <td>
                    <div class="table-value">${makeModel}</div>
                </td>
                <td>
                    <div class="table-variant-name">${variantName}${badges}</div>
                    <div class="table-variant-details">${variantDetails}</div>
                </td>
                <td class="table-value">${consumptionDisplay}</td>
                <td class="table-value">${energyDisplay}</td>
                <td class="table-value">${costPerUnitDisplay}</td>
                <td class="table-value total">${totalCostDisplay}</td>
            `;

            // Add data attributes for filtering
            row.setAttribute('data-variant-name', variantName.toLowerCase());
            row.setAttribute('data-vehicle-name', (calc.vehicleName || '').toLowerCase());
            row.setAttribute('data-make-model', makeModel.toLowerCase());
            row.setAttribute('data-fuel-type', (variant.fuelType || '').toLowerCase());
            row.setAttribute('data-transmission', (variant.transmissionType || '').toLowerCase());
            row.setAttribute('data-trim', (variant.trim || '').toLowerCase());
            row.setAttribute('data-year', (variant.modelYear || '').toString());

            resultsTableBody.appendChild(row);
        });

        // Store calculations for filtering
        this.currentCalculations = calculations;
        
        // Update filter count
        this.updateFilterCount();

        // Show results
        resultsPanel.classList.add('active');
        resultsTablePanel.style.display = 'block';
        this.hideError();
        this.updateFilterCount();
    }

    showLoading(show) {
        const loadingState = document.getElementById('loading-state');
        loadingState.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorMessage = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');
        errorText.textContent = message;
        errorMessage.style.display = 'block';
    }

    hideError() {
        const errorMessage = document.getElementById('error-message');
        errorMessage.style.display = 'none';
    }

    hideResults() {
        const resultsPanel = document.getElementById('results-panel');
        const resultsTablePanel = document.getElementById('results-table-panel');
        resultsPanel.classList.remove('active');
        resultsTablePanel.style.display = 'none';
    }

    filterVariants(searchText) {
        const filterText = searchText.toLowerCase().trim();
        const tableRows = document.querySelectorAll('#results-table-body tr');
        let visibleCount = 0;

        tableRows.forEach(row => {
            const variantName = row.getAttribute('data-variant-name') || '';
            const vehicleName = row.getAttribute('data-vehicle-name') || '';
            const makeModel = row.getAttribute('data-make-model') || '';
            const fuelType = row.getAttribute('data-fuel-type') || '';
            const transmission = row.getAttribute('data-transmission') || '';
            const trim = row.getAttribute('data-trim') || '';
            const year = row.getAttribute('data-year') || '';

            const searchableText = `${variantName} ${vehicleName} ${makeModel} ${fuelType} ${transmission} ${trim} ${year}`;

            if (!filterText || searchableText.includes(filterText)) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        // Update filter count
        const totalCount = tableRows.length;
        const filterCountElement = document.getElementById('filter-count');
        if (filterText) {
            filterCountElement.textContent = `Showing ${visibleCount} of ${totalCount} variants`;
        } else {
            filterCountElement.textContent = `${totalCount} variants`;
        }
    }

    updateFilterCount() {
        const tableRows = document.querySelectorAll('#results-table-body tr');
        const visibleRows = Array.from(tableRows).filter(row => row.style.display !== 'none');
        const totalCount = tableRows.length;
        const filterCountElement = document.getElementById('filter-count');
        filterCountElement.textContent = `${totalCount} variants`;
    }
}

// Initialize calculator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new FuelCostCalculator();
});

