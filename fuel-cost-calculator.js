// Fuel Cost Calculator JavaScript

class FuelCostCalculator {
    static GRID_EMISSION_FACTORS = {
        'average': { label: 'Australian Average', factor: 0.68 },
        'nsw_act': { label: 'NSW/ACT', factor: 0.73 },
        'vic':     { label: 'VIC', factor: 0.85 },
        'qld':     { label: 'QLD', factor: 0.73 },
        'sa':      { label: 'SA', factor: 0.27 },
        'wa':      { label: 'WA', factor: 0.59 },
        'tas':     { label: 'TAS', factor: 0.13 },
        'nt':      { label: 'NT', factor: 0.54 }
    };

    constructor() {
        this.vehicleDataMap = {}; // Map of filename -> vehicle data
        this.variants = []; // Array of {variant, vehicleName, filename}
        this.currentCalculations = [];
        this.selectedVehicles = new Set(); // Set of selected vehicle filenames
        this.allVehiclesEfficiencyCache = null; // Cache for all vehicles' efficiency data
        this.currentView = 'columns'; // Current view: 'table' or 'columns'
        this.currentSort = 'cheapestFuel'; // Current sort: 'cheapestFuel', 'vehiclePrice', 'cleanest'
        this.fuelPriceData = null; // Store full fuel price data (latest, averages, history)
        this.priceChart = null; // Chart.js instance for price trend chart
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

    async loadDefaults() {
        // Initialize dropdown
        this.initVehicleDropdown();

        // Fetch real fuel prices from NSW API (cached)
        await this.fetchRealFuelPrices();

        // Select default vehicle (Ford Ranger)
        this.selectVehicle('FDRA.json');

        // Load the default vehicle data
        this.loadSelectedVehicles();

        // Update distance displays
        this.updateDistanceDisplays();

        // Auto-calculate with defaults
        setTimeout(() => {
            if (this.variants.length > 0) {
                this.calculateFuelCosts();
            }
        }, 500);
    }

    async fetchRealFuelPrices() {
        try {
            console.log('🔍 Fetching real fuel prices...');

            const response = await fetch('/api/fuel-prices');

            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            let priceData = await response.json();

            console.log('✅ Received fuel price data:', priceData);

            // Handle backwards compatibility: convert old format to new format
            if (priceData.unleaded && !priceData.latest) {
                console.log('⚠️ Converting old data format to new format');
                priceData = {
                    latest: {
                        unleaded: priceData.unleaded,
                        premium: priceData.premium,
                        diesel: priceData.diesel,
                        dataPoints: priceData.dataPoints
                    },
                    averages: {
                        last30Days: {
                            unleaded: priceData.unleaded,
                            premium: priceData.premium,
                            diesel: priceData.diesel
                        }
                    },
                    history: [],
                    lastUpdated: priceData.lastUpdated
                };
            }

            // Store the full price data
            this.fuelPriceData = priceData;

            // Get the selected price period (default to latest)
            const selectedPeriod = document.querySelector('input[name="price-period"]:checked')?.value || 'latest';

            // Update input fields based on selected period
            this.updateFuelPricesFromPeriod(selectedPeriod);

            // Show data source info
            if (priceData.fallback) {
                console.log('⚠️ Using fallback prices');
            } else if (priceData.lastUpdated) {
                const lastUpdated = new Date(priceData.lastUpdated);
                const timeString = lastUpdated.toLocaleString('en-AU', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                console.log(`   Last updated: ${timeString}`);
                console.log(`   History: ${priceData.history?.length || 0} days`);

                // Show info message and trends
                this.showFuelPriceInfo(lastUpdated, priceData);

                // Show price trend chart
                if (priceData.history && priceData.history.length > 1) {
                    this.displayPriceTrendChart(priceData.history);
                }
            }

        } catch (error) {
            console.warn('⚠️ Failed to fetch real fuel prices, using defaults:', error.message);
            // Fallback to hardcoded defaults (current values in HTML)
        }
    }

    updateFuelPricesFromPeriod(period) {
        if (!this.fuelPriceData) return;

        let prices;
        let periodLabel;

        switch (period) {
            case '30day':
                prices = this.fuelPriceData.averages?.last30Days || this.fuelPriceData.latest;
                periodLabel = '30-Day Average';
                break;
            case 'latest':
            default:
                prices = this.fuelPriceData.latest;
                periodLabel = 'Latest';
                break;
        }

        console.log(`📊 Updating prices using ${periodLabel}:`, prices);

        // Update input fields with selected prices (only if valid)
        if (prices.unleaded && prices.unleaded > 0) {
            const input = document.getElementById('unleaded-cost-input');
            input.value = prices.unleaded.toFixed(1);
        }

        if (prices.premium && prices.premium > 0) {
            const input = document.getElementById('premium-unleaded-cost-input');
            input.value = prices.premium.toFixed(1);
        }

        if (prices.diesel && prices.diesel > 0) {
            const input = document.getElementById('diesel-cost-input');
            input.value = prices.diesel.toFixed(1);
        }

        // Update the info text to show which period is selected
        if (this.fuelPriceData.lastUpdated) {
            this.showFuelPriceInfo(new Date(this.fuelPriceData.lastUpdated), this.fuelPriceData, periodLabel);
        }
    }

    showFuelPriceInfo(lastUpdated, priceData, periodLabel = null) {
        const infoDiv = document.getElementById('fuel-price-info');
        const infoText = document.getElementById('fuel-price-info-text');
        const trendsDiv = document.getElementById('fuel-price-trends');

        if (!infoDiv || !infoText) return;

        // Format the timestamp
        const timeString = lastUpdated.toLocaleString('en-AU', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Build the message
        let message = '⛽ Fuel prices based on real NSW FuelCheck data';
        if (periodLabel) {
            message += ` (${periodLabel})`;
        }
        if (priceData.latest?.dataPoints) {
            const totalStations =
                (priceData.latest.dataPoints.unleaded || 0) +
                (priceData.latest.dataPoints.premium || 0) +
                (priceData.latest.dataPoints.diesel || 0);
            if (totalStations > 0) {
                message += ` • ${totalStations.toLocaleString()} stations`;
            }
        }
        message += ` • Updated: ${timeString}`;

        if (priceData.history?.length) {
            message += ` • ${priceData.history.length} days history`;
        }

        infoText.textContent = message;

        // Display trends
        if (trendsDiv && priceData.history && priceData.history.length >= 2) {
            this.displayPriceTrends(trendsDiv, priceData);
        }

        infoDiv.classList.remove('is-hidden');
    }

    displayPriceTrends(trendsDiv, priceData) {
        if (!priceData.history || priceData.history.length < 2) {
            trendsDiv.innerHTML = '';
            return;
        }

        // Get latest and 7-day-old prices for trend calculation
        const latest = priceData.latest;
        const weekAgo = priceData.history.length >= 7 ? priceData.history[6] : priceData.history[priceData.history.length - 1];

        const createTrendIndicator = (label, latestPrice, oldPrice) => {
            if (!latestPrice || !oldPrice) return '';

            const change = latestPrice - oldPrice;
            const percentChange = (change / oldPrice) * 100;
            const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
            const trendClass = change > 0 ? 'trend-up' : change < 0 ? 'trend-down' : 'trend-flat';
            const sign = change > 0 ? '+' : '';

            return `
                <div class="trend-indicator">
                    <span class="trend-label">${label}:</span>
                    <span class="trend-value ${trendClass}">
                        ${arrow} ${sign}${change.toFixed(1)}¢ (${sign}${percentChange.toFixed(1)}%)
                    </span>
                </div>
            `;
        };

        trendsDiv.innerHTML = `
            ${createTrendIndicator('Unleaded', latest.unleaded, weekAgo.unleaded)}
            ${createTrendIndicator('Premium', latest.premium, weekAgo.premium)}
            ${createTrendIndicator('Diesel', latest.diesel, weekAgo.diesel)}
        `;
    }

    initVehicleDropdown() {
        const dropdown = document.getElementById('vehicle-dropdown');
        const searchInput = document.getElementById('vehicle-search-input');
        const wrapper = document.getElementById('vehicle-select-wrapper');
        
        // Populate dropdown with all vehicles
        dropdown.innerHTML = this.vehicleList.map(vehicle => `
            <div class="vehicle-dropdown-item" data-filename="${vehicle.filename}">
                <input type="checkbox" id="vehicle-${vehicle.filename}" value="${vehicle.filename}">
                <label for="vehicle-${vehicle.filename}" class="vehicle-dropdown-label">${vehicle.name}</label>
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

        // Price period selection - update prices when changed
        document.querySelectorAll('input[name="price-period"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateFuelPricesFromPeriod(e.target.value);
                if (this.canCalculate()) {
                    this.calculateFuelCosts();
                }
            });
        });

        // Driving type selection - auto-calculate on change
        document.querySelectorAll('.driving-type-radio').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateDrivingTypeControls();
                this.updateDistanceDisplays();
                if (this.canCalculate()) {
                    this.calculateFuelCosts();
                }
            });
        });

        // Country percentage slider - auto-calculate on change
        const countrySlider = document.getElementById('country-slider');
        countrySlider.addEventListener('input', (e) => {
            this.updateSliderValues(e.target.value);
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
                if (this.canCalculate()) {
                    this.calculateFuelCosts();
                }
            });
        });

        // Input fields - auto-calculate on change
        document.getElementById('distance-input').addEventListener('input', () => {
            this.updateDistanceDisplays();
            if (this.canCalculate()) {
                this.calculateFuelCosts();
            }
        });

        document.getElementById('weekly-distance-input').addEventListener('input', () => {
            this.updateAnnualDistanceDisplay();
            this.updateDistanceDisplays();
            if (this.canCalculate()) {
                this.calculateFuelCosts();
            }
        });

        document.getElementById('unleaded-cost-input').addEventListener('input', () => {
            if (this.canCalculate()) {
                this.calculateFuelCosts();
            }
        });

        document.getElementById('premium-unleaded-cost-input').addEventListener('input', () => {
            if (this.canCalculate()) {
                this.calculateFuelCosts();
            }
        });

        document.getElementById('diesel-cost-input').addEventListener('input', () => {
            if (this.canCalculate()) {
                this.calculateFuelCosts();
            }
        });

        document.getElementById('kwh-cost-input').addEventListener('input', () => {
            if (this.canCalculate()) {
                this.calculateFuelCosts();
            }
        });

        // Grid region selector - recalculate EV emissions when changed
        document.getElementById('grid-region-select').addEventListener('change', () => {
            if (this.canCalculate()) {
                this.calculateFuelCosts();
            }
        });

        // Variant filter
        document.getElementById('variant-filter').addEventListener('input', (e) => {
            this.filterVariants(e.target.value);
        });

        // View switcher buttons
        document.getElementById('view-table-btn').addEventListener('click', () => {
            this.switchView('table');
        });

        document.getElementById('view-columns-btn').addEventListener('click', () => {
            this.switchView('columns');
        });

        // Sort buttons
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sortKey = btn.dataset.sort;
                this.sortColumns(sortKey);
            });
        });
    }

    sortCalculations(calculations) {
        switch (this.currentSort) {
            case 'vehiclePrice':
                calculations.sort((a, b) => {
                    if (!a.price && !b.price) return 0;
                    if (!a.price) return 1;
                    if (!b.price) return -1;
                    return a.price - b.price;
                });
                break;
            case 'cleanest':
                calculations.sort((a, b) => {
                    if (a.co2TotalKg === null && b.co2TotalKg === null) return 0;
                    if (a.co2TotalKg === null) return 1;
                    if (b.co2TotalKg === null) return -1;
                    return a.co2TotalKg - b.co2TotalKg;
                });
                break;
            case 'cheapestFuel':
            default:
                calculations.sort((a, b) => a.totalCost - b.totalCost);
                break;
        }
    }

    sortColumns(sortKey) {
        this.currentSort = sortKey;

        // Update button states
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sort === sortKey);
        });

        // Re-sort and re-render
        if (this.currentCalculations.length > 0) {
            this.sortCalculations(this.currentCalculations);
            const calcType = document.querySelector('input[name="calculation-type"]:checked').value;
            const distance = this.getDistance();
            this.displayResults(this.currentCalculations, distance, calcType);
        }
    }

    switchView(view) {
        this.currentView = view;
        
        // Update button states
        document.getElementById('view-table-btn').classList.toggle('active', view === 'table');
        document.getElementById('view-columns-btn').classList.toggle('active', view === 'columns');
        
        // Toggle visibility of containers
        const tableContainer = document.getElementById('results-table-container');
        const columnContainer = document.getElementById('results-column-container');
        
        if (view === 'table') {
            if (tableContainer) tableContainer.classList.remove('is-hidden');
            if (columnContainer) columnContainer.classList.add('is-hidden');
        } else {
            if (tableContainer) tableContainer.classList.add('is-hidden');
            if (columnContainer) columnContainer.classList.remove('is-hidden');
        }
        
        // Re-render current results in the selected view
        if (this.currentCalculations.length > 0) {
            const calcType = document.querySelector('input[name="calculation-type"]:checked').value;
            const distance = this.getDistance();
            this.displayResults(this.currentCalculations, distance, calcType);
        }
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
            singleTripGroup.classList.add('is-hidden');
            annualGroup.classList.remove('is-hidden');
        } else {
            singleTripGroup.classList.remove('is-hidden');
            annualGroup.classList.add('is-hidden');
        }
    }

    updateAnnualDistanceDisplay() {
        const weeklyDistance = this.parseNumberInput(document.getElementById('weekly-distance-input').value) || 0;
        const annualDistance = weeklyDistance * 52;
        document.getElementById('annual-distance-display').textContent = this.formatNumber(annualDistance);
    }

    async loadSelectedVehicles() {
        const selectedFilenames = Array.from(this.selectedVehicles);
        
        if (selectedFilenames.length === 0) {
            this.variants = [];
            this.hideResults();
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

    getSelectedGridFactor() {
        const select = document.getElementById('grid-region-select');
        const region = select ? select.value : 'average';
        return FuelCostCalculator.GRID_EMISSION_FACTORS[region]?.factor || 0.68;
    }

    getCO2EmissionsRate(variant) {
        const engine = variant.engine || {};
        const drivingType = document.querySelector('input[name="driving-type"]:checked').value;

        let tailpipeRate = null;
        if (drivingType === 'standard') {
            const combined = engine.emissionControlLevelCo2LevelCombined;
            if (combined && combined !== 'Not Available') {
                tailpipeRate = parseFloat(combined);
            }
        } else {
            // Custom mix: blend urban/highway CO2 rates using slider percentages
            const urban = engine.emissionControlLevelCo2LevelUrban;
            const highway = engine.emissionControlLevelCo2LevelCntryHighway;

            if (!urban || !highway || urban === 'Not Available' || highway === 'Not Available') {
                // Fallback to combined if urban/highway not available
                const combined = engine.emissionControlLevelCo2LevelCombined;
                if (combined && combined !== 'Not Available') {
                    tailpipeRate = parseFloat(combined);
                }
            } else {
                const countryPercentage = parseInt(document.getElementById('country-slider').value) / 100;
                const urbanPercentage = 1 - countryPercentage;
                tailpipeRate = (parseFloat(urban) * urbanPercentage) + (parseFloat(highway) * countryPercentage);
            }
        }

        // For pure EVs (tailpipe CO2 is 0 or null), estimate grid emissions
        if (tailpipeRate === null || tailpipeRate === 0) {
            const electricConsumptionRate = this.getElectricEnergyConsumptionRate(variant);
            if (electricConsumptionRate !== null && electricConsumptionRate > 0) {
                // electricConsumptionRate is kWh/100km
                // gridFactor is kg CO2/kWh
                // Result: g CO2/km = (kWh/100km / 100) * kg CO2/kWh * 1000
                const gridFactor = this.getSelectedGridFactor();
                return (electricConsumptionRate / 100) * gridFactor * 1000;
            }
        }

        return tailpipeRate;
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

            // Calculate CO2 emissions
            const co2RateGPerKm = this.getCO2EmissionsRate(variant);
            const co2TotalKg = co2RateGPerKm !== null ? (distance * co2RateGPerKm) / 1000 : null;

            // Determine if CO2 is a grid estimate (pure EV with zero tailpipe emissions)
            const tailpipeCO2 = variant.engine?.emissionControlLevelCo2LevelCombined;
            const isGridEstimated = co2RateGPerKm !== null && co2RateGPerKm > 0 &&
                (tailpipeCO2 === null || tailpipeCO2 === undefined || tailpipeCO2 === 'Not Available' || parseFloat(tailpipeCO2) === 0) &&
                electricConsumptionRate !== null && electricConsumptionRate > 0;

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
                isICE: fuelConsumptionRate !== null && electricConsumptionRate === null,
                price: variant.price || null, // Include vehicle price
                co2RateGPerKm: co2RateGPerKm,
                co2TotalKg: co2TotalKg,
                isGridEstimated: isGridEstimated
            };
        }).filter(calc => calc.hasData); // Only include variants with valid data

        if (calculations.length === 0) {
            this.showError('No variants with valid fuel or electric consumption data found');
            return;
        }

        // Sort by current sort mode
        this.currentCalculations = calculations;
        this.sortCalculations(calculations);

        // Display results
        const calcType = document.querySelector('input[name="calculation-type"]:checked').value;
        this.displayResults(calculations, distance, calcType);
    }

    displayResults(calculations, distance, calcType) {
        // Store calculations for filtering
        this.currentCalculations = calculations;
        
        // Create summary (shared between both views)
        this.createResultsSummary(calculations, calcType);
        
        // Display in the current view
        if (this.currentView === 'columns') {
            this.displayColumnView(calculations, distance, calcType);
        } else {
            this.displayTableView(calculations, distance, calcType);
        }
    }

    createResultsSummary(calculations, calcType) {
        const resultsSummary = document.getElementById('results-summary');
        const resultsPanel = document.getElementById('results-panel');

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
                config: configDetails.join(' \u00b7 ')
            };
        };

        // Sort by cost
        const sortedByCost = [...calculations].sort((a, b) => a.totalCost - b.totalCost);
        const cheapest = sortedByCost[0];
        const mostExpensive = sortedByCost[sortedByCost.length - 1];
        const costSuffix = calcType === 'annual' ? '/yr' : '';
        const costDifference = mostExpensive.totalCost - cheapest.totalCost;

        // Sort by CO2
        const calcsWithCO2 = calculations.filter(c => c.co2TotalKg !== null);
        const sortedByCO2 = [...calcsWithCO2].sort((a, b) => a.co2TotalKg - b.co2TotalKg);
        const hasCO2 = sortedByCO2.length > 1;

        // Vehicle details for cost extremes
        const cheapestDetails = buildVehicleDetails(cheapest);
        const expensiveDetails = buildVehicleDetails(mostExpensive);

        // CO2 extremes (may differ from cost extremes)
        const cleanest = hasCO2 ? sortedByCO2[0] : null;
        const dirtiest = hasCO2 ? sortedByCO2[sortedByCO2.length - 1] : null;
        const cleanestDetails = cleanest ? buildVehicleDetails(cleanest) : null;
        const dirtiestDetails = dirtiest ? buildVehicleDetails(dirtiest) : null;

        const buildRow = (label, makeModel, variant, cost, co2, extraClass = '') => {
            const co2Cell = hasCO2 && co2 !== null
                ? `<div class="summary-table-value">${parseFloat(co2.toFixed(0)).toLocaleString('en-AU')} kg</div>`
                : hasCO2 ? '<div class="summary-table-value">&mdash;</div>' : '';
            const nameHtml = makeModel
                ? `<span class="summary-table-label">${label}</span>${makeModel} ${variant}`
                : label;
            return `<div class="summary-table-row${extraClass ? ' ' + extraClass : ''}">
                <div class="summary-table-vehicle">
                    <div class="summary-table-name">${nameHtml}</div>
                </div>
                <div class="summary-table-value">${cost}</div>
                ${co2Cell}
            </div>`;
        };

        // Cost difference
        const co2Diff = hasCO2 ? dirtiest.co2TotalKg - cleanest.co2TotalKg : null;

        // Build cost section rows
        let costRows = buildRow('Cheapest', cheapestDetails.makeModel, cheapestDetails.variant, this.formatCurrency(cheapest.totalCost) + costSuffix, cheapest.co2TotalKg);
        costRows += buildRow('Most Expensive', expensiveDetails.makeModel, expensiveDetails.variant, this.formatCurrency(mostExpensive.totalCost) + costSuffix, mostExpensive.co2TotalKg);
        costRows += buildRow('', null, null, this.formatCurrency(costDifference) + costSuffix, co2Diff, 'summary-diff-row');

        // Build emissions section rows (only if cleanest/dirtiest differ from cost extremes)
        let emissionsRows = '';
        if (hasCO2) {
            const cleanestIsSameAsCheapest = cleanest === cheapest;
            const dirtiestIsSameAsExpensive = dirtiest === mostExpensive;
            if (!cleanestIsSameAsCheapest || !dirtiestIsSameAsExpensive) {
                emissionsRows = `<div class="summary-table-section-label">Emissions</div>`;
                emissionsRows += buildRow('Cleanest', cleanestDetails.makeModel, cleanestDetails.variant, this.formatCurrency(cleanest.totalCost) + costSuffix, cleanest.co2TotalKg);
                emissionsRows += buildRow('Most Emissions', dirtiestDetails.makeModel, dirtiestDetails.variant, this.formatCurrency(dirtiest.totalCost) + costSuffix, dirtiest.co2TotalKg);
                emissionsRows += buildRow('', null, null, this.formatCurrency(Math.abs(dirtiest.totalCost - cleanest.totalCost)) + costSuffix, co2Diff, 'summary-diff-row');
            }
        }

        const co2Header = hasCO2 ? '<span>CO2</span>' : '';

        resultsSummary.innerHTML = `
            <div class="summary-table">
                <div class="summary-table-header">
                    <span>Vehicle</span>
                    <span>Fuel Cost</span>
                    ${co2Header}
                </div>
                ${costRows}
                ${emissionsRows}
            </div>
        `;

        // Show results panel
        resultsPanel.classList.add('active');
        this.hideError();
    }

    displayTableView(calculations, distance, calcType) {
        const resultsTablePanel = document.getElementById('results-table-panel');
        const resultsTableBody = document.getElementById('results-table-body');
        const variantFilter = document.getElementById('variant-filter');

        // Clear previous results and reset filter
        resultsTableBody.innerHTML = '';
        variantFilter.value = '';

        // Determine cheapest/expensive by cost and cleanest/dirtiest by CO2
        const tblSortedByCost = [...calculations].sort((a, b) => a.totalCost - b.totalCost);
        const tblCheapestCalc = tblSortedByCost[0];
        const tblExpensiveCalc = tblSortedByCost.length > 1 ? tblSortedByCost[tblSortedByCost.length - 1] : null;
        const calcsWithCO2 = calculations.filter(c => c.co2TotalKg !== null);
        const sortedByCO2 = [...calcsWithCO2].sort((a, b) => a.co2TotalKg - b.co2TotalKg);
        const cleanestCalc = sortedByCO2.length > 0 ? sortedByCO2[0] : null;
        const dirtiestCalc = sortedByCO2.length > 1 ? sortedByCO2[sortedByCO2.length - 1] : null;

        // Create table rows
        calculations.forEach((calc, index) => {
            const isCheapest = calc === tblCheapestCalc;
            const isMostExpensive = tblExpensiveCalc && calc === tblExpensiveCalc;
            const isCleanest = cleanestCalc && calc === cleanestCalc;
            const isDirtiest = dirtiestCalc && calc === dirtiestCalc;

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
            if (isCleanest) badges += '<span class="table-badge badge-cleanest">Cleanest</span>';
            if (isDirtiest) badges += '<span class="table-badge badge-dirtiest">Most Emissions</span>';

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
                costPerUnitDisplay += `${parseFloat(calc.costPerLitreCents.toFixed(1)).toLocaleString('en-AU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} c/L<br><span class="detail-secondary-text">(${calc.fuelType})</span>`;
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
                totalCostDisplay += `<span class="cost-breakdown">`;
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

            // Build CO2 rate display
            const gridEstLabel = calc.isGridEstimated ? ' <span class="detail-secondary-text">(grid est.)</span>' : '';
            const co2RateDisplay = calc.co2RateGPerKm !== null
                ? `${parseFloat(calc.co2RateGPerKm.toFixed(0)).toLocaleString('en-AU')} g/km${gridEstLabel}`
                : 'N/A';

            // Build total CO2 display
            const co2TotalDisplay = calc.co2TotalKg !== null
                ? `${parseFloat(calc.co2TotalKg.toFixed(1)).toLocaleString('en-AU')} kg${costSuffix}${gridEstLabel}`
                : 'N/A';

            row.innerHTML = `
                <td>
                    <div class="table-variant-name">${makeModel} ${variantName}${badges}</div>
                    <div class="table-variant-details">${variantDetails}</div>
                </td>
                <td class="table-value">${consumptionDisplay}</td>
                <td class="table-value">${co2RateDisplay}</td>
                <td class="table-value">${energyDisplay}</td>
                <td class="table-value">${costPerUnitDisplay}</td>
                <td class="table-value total">${totalCostDisplay}</td>
                <td class="table-value">${co2TotalDisplay}</td>
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

        // Update filter count
        this.updateFilterCount();

        // Show results
        resultsTablePanel.classList.remove('is-hidden');
        this.updateFilterCount();

        // Display efficiency graph
        this.displayEfficiencyGraph(calculations);
    }

    displayColumnView(calculations, distance, calcType) {
        const resultsTablePanel = document.getElementById('results-table-panel');
        const columnContainer = document.getElementById('results-column-container');
        const columnGrid = document.getElementById('column-view-grid');

        // Clear previous column view
        columnGrid.innerHTML = '';
        
        // Set grid columns: 1 label column + number of vehicle columns
        const numVehicles = calculations.length;
        columnGrid.style.gridTemplateColumns = `auto repeat(${numVehicles}, minmax(200px, 1fr))`;
        
        // Define cost suffix based on calculation type
        const costSuffix = calcType === 'annual' ? '/year' : '';

        // Color palette for vehicle columns
        const columnColors = [
            '#06b6d4', // cyan
            '#10b981', // green
            '#f59e0b', // amber
            '#8b5cf6', // purple
            '#ec4899', // pink
            '#3b82f6', // blue
            '#84cc16', // lime
            '#f97316', // orange
            '#6366f1', // indigo
            '#14b8a6', // teal
            '#a855f7', // violet
            '#ef4444'  // red
        ];

        // Determine cheapest and most expensive by total cost (regardless of current sort)
        const sortedByCost = [...calculations].sort((a, b) => a.totalCost - b.totalCost);
        const cheapestCalc = sortedByCost[0];
        const mostExpensiveCalc = sortedByCost.length > 1 ? sortedByCost[sortedByCost.length - 1] : null;

        // Determine cleanest and dirtiest by CO2
        const colCalcsWithCO2 = calculations.filter(c => c.co2TotalKg !== null);
        const colSortedByCO2 = [...colCalcsWithCO2].sort((a, b) => a.co2TotalKg - b.co2TotalKg);
        const colCleanestCalc = colSortedByCO2.length > 0 ? colSortedByCO2[0] : null;
        const colDirtiestCalc = colSortedByCO2.length > 1 ? colSortedByCO2[colSortedByCO2.length - 1] : null;

        // Create header row - empty label cell + vehicle headers
        // In CSS Grid, all cells must be direct children, so we add them directly to the grid

        // Empty label cell (first column, row 1)
        const emptyLabelCell = document.createElement('div');
        emptyLabelCell.className = 'column-view-label-cell';
        columnGrid.appendChild(emptyLabelCell);

        // Create header cell for each vehicle (columns 2+, row 1)
        calculations.forEach((calc, index) => {
            const variant = calc.variant;
            const variantName = variant.trim || variant.versionName || 'Unknown Variant';
            const makeModel = `${variant.make || ''} ${variant.model || ''}`.trim() || calc.vehicleName;
            const year = variant.modelYear || '';

            const headerCell = document.createElement('div');
            headerCell.className = 'column-view-header-cell';

            const color = columnColors[index % columnColors.length];
            const isCheapest = calc === cheapestCalc;
            const isMostExpensive = mostExpensiveCalc && calc === mostExpensiveCalc;
            const isCleanest = colCleanestCalc && calc === colCleanestCalc;
            const isDirtiest = colDirtiestCalc && calc === colDirtiestCalc;

            let badges = '';
            if (isCheapest) badges += '<span class="column-view-badge cheapest">Cheapest</span>';
            if (isMostExpensive && calculations.length > 1) badges += '<span class="column-view-badge expensive">Most Expensive</span>';
            if (isCleanest) badges += '<span class="column-view-badge cleanest">Cleanest</span>';
            if (isDirtiest) badges += '<span class="column-view-badge dirtiest">Most Emissions</span>';
            
            headerCell.innerHTML = `
                <div class="column-view-header-content">
                    <div class="column-view-header-name">${variantName}</div>
                    <div class="column-view-header-year">${year} ${makeModel}</div>
                    <div class="column-view-header-accent" style="background-color: ${color};"></div>
                    ${badges}
                </div>
            `;
            
            columnGrid.appendChild(headerCell);
        });

        // Create data rows: MSRP, Consumption, Energy Required, Cost per Unit, Total Cost
        // Each row has: label cell (column 1) + data cells for each vehicle (columns 2+)
        const rowLabels = [
            { label: 'Retail price', key: 'price' },
            { label: 'Consumption', key: 'consumption' },
            { label: 'CO2 Rate', key: 'co2Rate' },
            { label: 'Energy Required', key: 'energy' },
            { label: 'Cost per Unit', key: 'costPerUnit' },
            { label: 'Total Cost', key: 'totalCost' },
            { label: 'Total CO2', key: 'co2Total' }
        ];

        rowLabels.forEach((rowLabel, rowIndex) => {
            // Determine if this row should have special styling
            const isTotalCostRow = rowLabel.key === 'totalCost';

            // Label cell (column 1 - leftmost)
            const labelCell = document.createElement('div');
            labelCell.className = 'column-view-label-cell';
            labelCell.textContent = rowLabel.label;
            if (isTotalCostRow) {
                // Apply special styling classes to label cell for total cost row
                if (cheapestCalc) labelCell.classList.add('cheapest-label');
                if (mostExpensiveCalc) labelCell.classList.add('expensive-label');
            }
            columnGrid.appendChild(labelCell);

            // Data cells for each vehicle (columns 2+)
            calculations.forEach((calc, vehicleIndex) => {
                const dataCell = document.createElement('div');
                dataCell.className = 'column-view-data-cell';
                
                // Apply row-level classes for styling
                if (isTotalCostRow) {
                    if (calc === cheapestCalc) {
                        dataCell.classList.add('cheapest-cell');
                    } else if (calc === mostExpensiveCalc) {
                        dataCell.classList.add('expensive-cell');
                    }
                }

                const isCheapest = calc === cheapestCalc;
                const isMostExpensive = mostExpensiveCalc && calc === mostExpensiveCalc;

                switch (rowLabel.key) {
                    case 'price':
                        if (calc.price) {
                            dataCell.innerHTML = `<div class="column-view-price">${this.formatCurrency(calc.price)}</div>`;
                        } else {
                            dataCell.textContent = 'N/A';
                        }
                        break;
                    
                    case 'consumption':
                        let consumptionDisplay = '';
                        if (calc.fuelConsumptionRate !== null) {
                            consumptionDisplay += `${parseFloat(calc.fuelConsumptionRate.toFixed(2)).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L/100km`;
                        }
                        if (calc.electricConsumptionRate !== null) {
                            if (consumptionDisplay) consumptionDisplay += '<br>';
                            consumptionDisplay += `${parseFloat(calc.electricConsumptionRate.toFixed(2)).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh/100km`;
                        }
                        if (!consumptionDisplay) consumptionDisplay = 'N/A';
                        dataCell.innerHTML = consumptionDisplay;
                        break;
                    
                    case 'energy':
                        let energyDisplay = '';
                        if (calc.litresNeeded > 0) {
                            energyDisplay += `${parseFloat(calc.litresNeeded.toFixed(2)).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
                        }
                        if (calc.kwhNeeded > 0) {
                            if (energyDisplay) energyDisplay += '<br>';
                            energyDisplay += `${parseFloat(calc.kwhNeeded.toFixed(2)).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh`;
                        }
                        if (!energyDisplay) energyDisplay = 'N/A';
                        dataCell.innerHTML = energyDisplay;
                        break;
                    
                    case 'costPerUnit':
                        let costPerUnitDisplay = '';
                        if (calc.costPerLitre > 0) {
                            costPerUnitDisplay += `${parseFloat(calc.costPerLitreCents.toFixed(1)).toLocaleString('en-AU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} c/L<br><span class="detail-secondary-text">(${calc.fuelType})</span>`;
                        }
                        if (calc.costPerKwh > 0) {
                            if (costPerUnitDisplay) costPerUnitDisplay += '<br>';
                            costPerUnitDisplay += `${this.formatCurrency(calc.costPerKwh)}/kWh`;
                        }
                        if (!costPerUnitDisplay) costPerUnitDisplay = 'N/A';
                        dataCell.innerHTML = costPerUnitDisplay;
                        break;
                    
                    case 'co2Rate':
                        if (calc.co2RateGPerKm !== null) {
                            const colGridEst = calc.isGridEstimated ? '<br><span class="detail-secondary-text">(grid est.)</span>' : '';
                            dataCell.innerHTML = `${parseFloat(calc.co2RateGPerKm.toFixed(0)).toLocaleString('en-AU')} g/km${colGridEst}`;
                        } else {
                            dataCell.textContent = 'N/A';
                        }
                        break;

                    case 'totalCost':
                        let totalCostDisplay = '';
                        let costClass = '';
                        if (isCheapest) costClass = 'cheapest';
                        else if (isMostExpensive && calculations.length > 1) costClass = 'expensive';

                        if (calc.isHybrid) {
                            totalCostDisplay = `<div class="column-view-total-cost ${costClass}">${this.formatCurrency(calc.totalCost)}${costSuffix}</div>`;
                            totalCostDisplay += `<div class="cost-breakdown">`;
                            if (calc.fuelCost > 0) {
                                totalCostDisplay += `Fuel: ${this.formatCurrency(calc.fuelCost)}`;
                            }
                            if (calc.fuelCost > 0 && calc.electricityCost > 0) {
                                totalCostDisplay += ' + ';
                            }
                            if (calc.electricityCost > 0) {
                                totalCostDisplay += `Electric: ${this.formatCurrency(calc.electricityCost)}`;
                            }
                            totalCostDisplay += `</div>`;
                        } else {
                            totalCostDisplay = `<div class="column-view-total-cost ${costClass}">${this.formatCurrency(calc.totalCost)}${costSuffix}</div>`;
                        }
                        dataCell.innerHTML = totalCostDisplay;
                        break;

                    case 'co2Total':
                        if (calc.co2TotalKg !== null) {
                            const colTotalGridEst = calc.isGridEstimated ? '<br><span class="detail-secondary-text">(grid est.)</span>' : '';
                            dataCell.innerHTML = `${parseFloat(calc.co2TotalKg.toFixed(1)).toLocaleString('en-AU')} kg${costSuffix}${colTotalGridEst}`;
                        } else {
                            dataCell.textContent = 'N/A';
                        }
                        break;
                }
                
                columnGrid.appendChild(dataCell);
            });
        });

        // Show results
        resultsTablePanel.classList.remove('is-hidden');
        columnContainer.classList.remove('is-hidden');

        // Display efficiency graph
        this.displayEfficiencyGraph(calculations);
    }

    async getAllVehiclesEfficiencyData() {
        // Return cached data if available
        if (this.allVehiclesEfficiencyCache !== null) {
            return this.allVehiclesEfficiencyCache;
        }

        try {
            // Load all vehicles in parallel
            const loadPromises = this.vehicleList.map(async (vehicle) => {
                // Use cached data if available
                if (this.vehicleDataMap[vehicle.filename]) {
                    return { filename: vehicle.filename, data: this.vehicleDataMap[vehicle.filename] };
                }

                // Otherwise, fetch it
                try {
                    const response = await fetch(`vehicleData/${vehicle.filename}`);
                    if (!response.ok) {
                        console.warn(`Failed to load ${vehicle.filename}`);
                        return null;
                    }
                    const data = await response.json();
                    this.vehicleDataMap[vehicle.filename] = data;
                    return { filename: vehicle.filename, data };
                } catch (error) {
                    console.warn(`Error loading ${vehicle.filename}:`, error);
                    return null;
                }
            });

            const loadedVehicles = await Promise.all(loadPromises);
            
            // Extract efficiency data from all vehicles
            const efficiencyData = [];
            
            loadedVehicles.forEach((result) => {
                if (!result || !result.data) return;
                
                const vehicleName = this.getVehicleNameFromFilename(result.filename);
                const variants = (result.data.data || []).map(item => item.vehicle || item).filter(vehicle => {
                    return vehicle && vehicle.performance;
                });
                
                variants.forEach(variant => {
                    const fuelConsumptionRate = this.getFuelConsumptionRate(variant);
                    const electricConsumptionRate = this.getElectricEnergyConsumptionRate(variant);
                    
                    // Calculate efficiency value using same logic as displayEfficiencyGraph
                    let efficiencyValue = null;
                    
                    if (fuelConsumptionRate !== null && electricConsumptionRate !== null) {
                        // Hybrid: use fuel consumption as primary metric
                        efficiencyValue = fuelConsumptionRate;
                    } else if (fuelConsumptionRate !== null) {
                        efficiencyValue = fuelConsumptionRate;
                    } else if (electricConsumptionRate !== null) {
                        // Scale electric consumption for positioning
                        efficiencyValue = electricConsumptionRate * 0.1;
                    }
                    
                    if (efficiencyValue !== null) {
                        efficiencyData.push({
                            efficiencyValue: efficiencyValue,
                            fuelConsumptionRate: fuelConsumptionRate,
                            electricConsumptionRate: electricConsumptionRate,
                            makeModel: `${variant.make || ''} ${variant.model || ''}`.trim() || vehicleName,
                            variantName: variant.trim || variant.versionName || 'Unknown Variant',
                            filename: result.filename,
                            vehicleName: vehicleName
                        });
                    }
                });
            });

            // Cache the results
            this.allVehiclesEfficiencyCache = efficiencyData;
            return efficiencyData;
        } catch (error) {
            console.error('Error loading all vehicles efficiency data:', error);
            return [];
        }
    }

    createHistogramBins(efficiencyData, numBins = 25) {
        if (!efficiencyData || efficiencyData.length === 0) {
            return [];
        }

        // Extract efficiency values
        const efficiencyValues = efficiencyData.map(item => item.efficiencyValue).filter(val => val !== null);
        
        if (efficiencyValues.length === 0) {
            return [];
        }

        // Find min and max across all vehicles
        const minEfficiency = Math.min(...efficiencyValues);
        const maxEfficiency = Math.max(...efficiencyValues);
        const range = maxEfficiency - minEfficiency;

        // Handle edge case where all values are the same
        if (range === 0) {
            return [{
                position: 50, // Center position
                count: efficiencyValues.length,
                minValue: minEfficiency,
                maxValue: maxEfficiency
            }];
        }

        // Create bins
        const binWidth = range / numBins;
        const bins = Array(numBins).fill(0).map((_, i) => ({
            minValue: minEfficiency + (i * binWidth),
            maxValue: minEfficiency + ((i + 1) * binWidth),
            count: 0,
            index: i
        }));

        // Count vehicles in each bin
        efficiencyValues.forEach(value => {
            // Find which bin this value belongs to
            let binIndex = Math.floor((value - minEfficiency) / binWidth);
            // Handle edge case where value equals max (should go in last bin)
            if (binIndex >= numBins) {
                binIndex = numBins - 1;
            }
            bins[binIndex].count++;
        });

        // Calculate position for each bin (0-100%, reversed so most efficient is on right)
        const binsWithPosition = bins.map(bin => {
            // Calculate center value of bin
            const centerValue = (bin.minValue + bin.maxValue) / 2;
            // Calculate position (0 = least efficient, 100 = most efficient)
            const rawPosition = ((centerValue - minEfficiency) / range) * 100;
            // Reverse: most efficient on right
            const position = 100 - rawPosition;
            
            return {
                ...bin,
                position: position
            };
        });

        return {
            bins: binsWithPosition,
            minEfficiency: minEfficiency,
            maxEfficiency: maxEfficiency,
            range: range
        };
    }

    async displayEfficiencyGraph(calculations) {
        const graphContainer = document.getElementById('efficiency-graph-container');
        const graphLine = document.getElementById('efficiency-graph-line');
        const graphLineContainer = graphLine?.parentElement;

        if (!graphContainer || !graphLine || !graphLineContainer) return;

        // Clear previous graph
        graphLine.innerHTML = '';
        
        // Remove any existing histogram bars
        const existingHistogramBars = graphLineContainer.querySelectorAll('.efficiency-histogram-bar');
        existingHistogramBars.forEach(bar => bar.remove());
        
        // Remove any existing tooltips
        const existingTooltips = graphLineContainer.querySelectorAll('.efficiency-graph-tooltip');
        existingTooltips.forEach(tooltip => tooltip.remove());

        if (calculations.length === 0) {
            graphContainer.classList.add('is-hidden');
            return;
        }

        // Load all vehicles efficiency data for histogram
        const allVehiclesEfficiencyData = await this.getAllVehiclesEfficiencyData();
        
        // Create histogram bins using all vehicles data
        const histogramData = this.createHistogramBins(allVehiclesEfficiencyData);
        
        // Use full range from all vehicles for scaling, with fallback to selected vehicles range
        let globalMinEfficiency, globalMaxEfficiency, globalRange;
        if (histogramData.bins && histogramData.bins.length > 0 && histogramData.range > 0) {
            globalMinEfficiency = histogramData.minEfficiency;
            globalMaxEfficiency = histogramData.maxEfficiency;
            globalRange = histogramData.range;
        } else {
            // Fallback: use selected vehicles range if histogram data is not available
            globalMinEfficiency = null;
            globalMaxEfficiency = null;
            globalRange = null;
        }

        // Calculate efficiency values
        // For fuel: use L/100km (lower is better)
        // For electric: use kWh/100km (lower is better)
        // For hybrids: use fuel consumption as primary metric
        // We'll normalize all values to a common scale for positioning
        const efficiencyData = calculations.map((calc, index) => {
            let efficiencyValue = null;
            let efficiencyLabel = '';
            let isHybrid = calc.isHybrid;
            let displayValue = null;
            
            if (calc.fuelConsumptionRate !== null && calc.electricConsumptionRate !== null) {
                // Hybrid: use fuel consumption as primary metric for positioning
                efficiencyValue = calc.fuelConsumptionRate;
                displayValue = calc.fuelConsumptionRate;
                efficiencyLabel = `${calc.fuelConsumptionRate.toFixed(2)} L/100km + ${calc.electricConsumptionRate.toFixed(2)} kWh/100km`;
            } else if (calc.fuelConsumptionRate !== null) {
                efficiencyValue = calc.fuelConsumptionRate;
                displayValue = calc.fuelConsumptionRate;
                efficiencyLabel = `${calc.fuelConsumptionRate.toFixed(2)} L/100km`;
            } else if (calc.electricConsumptionRate !== null) {
                // For electric vehicles, convert kWh/100km to equivalent L/100km for positioning
                // Rough energy equivalence: 1 kWh ≈ 0.1 L of petrol energy content
                // But for efficiency comparison, we'll use a factor that makes sense visually
                // Typical EV: 15-20 kWh/100km ≈ 1.5-2.0 L/100km equivalent
                // So we'll use a factor of 0.1 to make them comparable on the same scale
                efficiencyValue = calc.electricConsumptionRate * 0.1; // Scale for positioning
                displayValue = calc.electricConsumptionRate;
                efficiencyLabel = `${calc.electricConsumptionRate.toFixed(2)} kWh/100km`;
            }

            const variant = calc.variant;
            const makeModel = `${variant.make || ''} ${variant.model || ''}`.trim() || calc.vehicleName;
            const variantName = variant.trim || variant.versionName || 'Unknown Variant';

            return {
                index: index,
                efficiencyValue: efficiencyValue,
                efficiencyLabel: efficiencyLabel,
                makeModel: makeModel,
                variantName: variantName,
                calc: calc,
                isHybrid: isHybrid
            };
        }).filter(item => item.efficiencyValue !== null);

        if (efficiencyData.length === 0) {
            graphContainer.classList.add('is-hidden');
            return;
        }

        // Sort by efficiency (lowest to highest = most efficient to least efficient)
        efficiencyData.sort((a, b) => a.efficiencyValue - b.efficiencyValue);

        // Use global range for scaling (from all vehicles), with fallback to selected vehicles
        const minEfficiency = globalMinEfficiency !== null ? globalMinEfficiency : (efficiencyData.length > 0 ? efficiencyData[0].efficiencyValue : 0);
        const maxEfficiency = globalMaxEfficiency !== null ? globalMaxEfficiency : (efficiencyData.length > 0 ? efficiencyData[efficiencyData.length - 1].efficiencyValue : 0);
        const range = globalRange !== null && globalRange > 0 ? globalRange : (efficiencyData.length > 0 ? efficiencyData[efficiencyData.length - 1].efficiencyValue - efficiencyData[0].efficiencyValue : 1);

        // Color palette
        const colors = [
            '#3b82f6', // blue
            '#10b981', // green
            '#f59e0b', // amber
            '#ef4444', // red
            '#8b5cf6', // purple
            '#ec4899', // pink
            '#06b6d4', // cyan
            '#84cc16', // lime
            '#f97316', // orange
            '#6366f1', // indigo
            '#14b8a6', // teal
            '#a855f7'  // violet
        ];

        // Group vehicles by position (handle overlapping)
        const positionGroups = [];
        const positionTolerance = 2; // percentage points

        efficiencyData.forEach((item, idx) => {
            // Calculate position (0 = least efficient, 100 = most efficient)
            // Then reverse it so most efficient is on the right
            const rawPosition = range > 0 
                ? ((item.efficiencyValue - minEfficiency) / range) * 100 
                : 50; // center if all same value
            const position = 100 - rawPosition; // Reverse: most efficient on right

            // Check if this position is close to an existing group
            let addedToGroup = false;
            for (let group of positionGroups) {
                if (Math.abs(group.position - position) < positionTolerance) {
                    group.items.push({...item, position: position, colorIndex: idx});
                    addedToGroup = true;
                    break;
                }
            }

            if (!addedToGroup) {
                positionGroups.push({
                    position: position,
                    items: [{...item, position: position, colorIndex: idx}]
                });
            }
        });

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'efficiency-graph-tooltip';
        graphLineContainer.appendChild(tooltip);

        let hideTooltipTimeout = null;

        // Helper function to show tooltip
        const showTooltip = (element, items) => {
            // Clear any pending hide timeout
            if (hideTooltipTimeout) {
                clearTimeout(hideTooltipTimeout);
                hideTooltipTimeout = null;
            }
            // All items at this position have the same efficiency (or very close)
            const efficiencyLabel = items[0].efficiencyLabel;
            
            // Group items by make/model + trim combination
            const vehicleGroups = {};
            items.forEach(item => {
                const key = `${item.makeModel} ${item.variantName}`;
                if (!vehicleGroups[key]) {
                    vehicleGroups[key] = 0;
                }
                vehicleGroups[key]++;
            });
            
            // Build vehicle list - group identical trims with count, sorted alphabetically
            const vehicleList = Object.entries(vehicleGroups)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([vehicleName, count]) => {
                    if (count === 1) {
                        return `<div class="efficiency-graph-tooltip-vehicle">${vehicleName}</div>`;
                    } else {
                        return `<div class="efficiency-graph-tooltip-vehicle">${vehicleName} (${count})</div>`;
                    }
                }).join('');
            
            tooltip.innerHTML = `
                <div class="efficiency-graph-tooltip-value">${efficiencyLabel}</div>
                ${vehicleList}
            `;

            // Position tooltip first (hidden) to measure it
            tooltip.style.visibility = 'hidden';
            tooltip.style.opacity = '0';
            tooltip.classList.remove('visible');
            
            const tooltipRect = tooltip.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const containerRect = graphLineContainer.getBoundingClientRect();
            
            // Calculate position relative to container
            let left = elementRect.left - containerRect.left + (elementRect.width / 2) - (tooltipRect.width / 2);
            let top = elementRect.top - containerRect.top - tooltipRect.height - 12;

            // Adjust if tooltip goes off screen horizontally
            if (left < 10) left = 10;
            if (left + tooltipRect.width > containerRect.width - 10) {
                left = containerRect.width - tooltipRect.width - 10;
            }
            
            // Adjust if tooltip goes off screen vertically (show below instead)
            if (top < 10) {
                top = elementRect.bottom - containerRect.top + 12;
            }

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
            
            // Now show it using CSS class - clear inline styles so CSS takes over
            tooltip.style.opacity = '';
            tooltip.style.visibility = '';
            tooltip.classList.add('visible');
        };

        const hideTooltip = () => {
            // Clear any pending timeout
            if (hideTooltipTimeout) {
                clearTimeout(hideTooltipTimeout);
                hideTooltipTimeout = null;
            }
            // Immediately hide the tooltip
            tooltip.classList.remove('visible');
            // Reset inline styles that might interfere
            tooltip.style.opacity = '';
            tooltip.style.visibility = '';
        };

        // Hide tooltip when leaving the graph container
        graphLineContainer.addEventListener('mouseleave', () => {
            hideTooltip();
        });

        // Render histogram bars (ghost background)
        if (histogramData.bins && histogramData.bins.length > 0) {
            const maxCount = Math.max(...histogramData.bins.map(bin => bin.count));
            const maxBarHeight = 25; // Maximum height in pixels (extending upward from line)
            const barWidthPercent = Math.max(0.8, 100 / histogramData.bins.length * 0.8); // Bar width as percentage, slightly narrower than bin spacing
            
            histogramData.bins.forEach(bin => {
                if (bin.count === 0) return; // Skip empty bins
                
                const normalizedHeight = maxCount > 0 ? (bin.count / maxCount) * maxBarHeight : 0;
                
                const bar = document.createElement('div');
                bar.className = 'efficiency-histogram-bar';
                bar.style.left = `${bin.position}%`;
                bar.style.width = `${barWidthPercent}%`;
                bar.style.height = `${normalizedHeight}px`;
                bar.style.transform = 'translateX(-50%)'; // Center the bar on its position
                
                graphLineContainer.appendChild(bar);
            });
        }

        // Create dots on the line
        positionGroups.forEach((group, groupIdx) => {
            if (group.items.length === 1) {
                // Single dot
                const item = group.items[0];
                const color = colors[item.colorIndex % colors.length];
                const dot = document.createElement('div');
                dot.className = 'efficiency-graph-dot';
                dot.style.left = `${group.position}%`;
                dot.style.backgroundColor = color;
                
                dot.addEventListener('mouseenter', () => showTooltip(dot, group.items));
                dot.addEventListener('mouseleave', hideTooltip);
                
                graphLine.appendChild(dot);
            } else {
                // Multiple dots at same position - create grouped dot
                const groupDot = document.createElement('div');
                groupDot.className = 'efficiency-graph-dot-group';
                groupDot.style.left = `${group.position}%`;
                
                // Create segments for each item in the group
                group.items.forEach((item, itemIdx) => {
                    const color = colors[item.colorIndex % colors.length];
                    const segment = document.createElement('div');
                    segment.className = 'efficiency-graph-dot-segment';
                    segment.style.backgroundColor = color;
                    groupDot.appendChild(segment);
                });

                groupDot.addEventListener('mouseenter', () => showTooltip(groupDot, group.items));
                groupDot.addEventListener('mouseleave', hideTooltip);
                
                graphLine.appendChild(groupDot);
            }
        });

        // Show graph container
        graphContainer.classList.remove('is-hidden');
    }

    showLoading(show) {
        const loadingState = document.getElementById('loading-state');
        if (show) {
            loadingState.classList.remove('is-hidden');
        } else {
            loadingState.classList.add('is-hidden');
        }
    }

    showError(message) {
        const errorMessage = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');
        errorText.textContent = message;
        errorMessage.classList.remove('is-hidden');
    }

    hideError() {
        const errorMessage = document.getElementById('error-message');
        errorMessage.classList.add('is-hidden');
    }

    hideResults() {
        const resultsPanel = document.getElementById('results-panel');
        const resultsTablePanel = document.getElementById('results-table-panel');
        const columnContainer = document.getElementById('results-column-container');
        const graphContainer = document.getElementById('efficiency-graph-container');
        resultsPanel.classList.remove('active');
        resultsTablePanel.classList.add('is-hidden');
        if (columnContainer) {
            columnContainer.classList.add('is-hidden');
        }
        if (graphContainer) {
            graphContainer.classList.add('is-hidden');
        }
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
                row.classList.remove('is-hidden');
                visibleCount++;
            } else {
                row.classList.add('is-hidden');
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
        const visibleRows = Array.from(tableRows).filter(row => !row.classList.contains('is-hidden'));
        const totalCount = tableRows.length;
        const filterCountElement = document.getElementById('filter-count');
        filterCountElement.textContent = `${totalCount} variants`;
    }

    displayPriceTrendChart(history) {
        const container = document.getElementById('price-trend-chart-container');
        const canvas = document.getElementById('price-trend-chart');

        if (!container || !canvas || !history || history.length < 2) {
            if (container) container.classList.add('is-hidden');
            return;
        }

        // Show last 30 days (already in chronological order)
        const chartData = history.slice(0, 30);

        // Extract dates and data for each fuel type
        const labels = chartData.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
        });

        const datasets = [];

        // Add Unleaded dataset if available
        const unleadedData = chartData.map(d => d.unleaded);
        if (unleadedData.some(v => v != null)) {
            datasets.push({
                label: 'Unleaded',
                data: unleadedData,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 2,
                pointHoverRadius: 5
            });
        }

        // Add Premium dataset if available
        const premiumData = chartData.map(d => d.premium);
        if (premiumData.some(v => v != null)) {
            datasets.push({
                label: 'Premium',
                data: premiumData,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 2,
                pointHoverRadius: 5
            });
        }

        // Add Diesel dataset if available
        const dieselData = chartData.map(d => d.diesel);
        if (dieselData.some(v => v != null)) {
            datasets.push({
                label: 'Diesel',
                data: dieselData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 2,
                pointHoverRadius: 5
            });
        }

        if (datasets.length === 0) {
            container.classList.add('is-hidden');
            return;
        }

        // Destroy existing chart if it exists
        if (this.priceChart) {
            this.priceChart.destroy();
        }

        // Create new Chart.js chart
        const ctx = canvas.getContext('2d');
        this.priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1f2937',
                        bodyColor: '#1f2937',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(1) + '¢/L';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 10
                            }
                        }
                    },
                    y: {
                        display: true,
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(0) + '¢';
                            },
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });

        // Show container
        container.classList.remove('is-hidden');
    }
}

// Initialize calculator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new FuelCostCalculator();
});

