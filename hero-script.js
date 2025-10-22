// Tooltip management
let currentTooltip = null;

function showTooltip(event, text) {
    // Remove any existing tooltip
    hideTooltip();
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerHTML = `<div class="tooltip-content">${text}</div>`;
    document.body.appendChild(tooltip);
    
    // Position tooltip near the cursor
    positionTooltip(tooltip, event);
    
    // Show tooltip with animation
    requestAnimationFrame(() => {
        tooltip.classList.add('show');
    });
    
    currentTooltip = tooltip;
}

function hideTooltip() {
    if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
    }
}

function positionTooltip(tooltip, event) {
    const padding = 10;
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let x = event.clientX;
    let y = event.clientY + 20; // Position below cursor
    
    // Keep tooltip within viewport
    if (x + tooltipRect.width + padding > window.innerWidth) {
        x = window.innerWidth - tooltipRect.width - padding;
    }
    
    if (y + tooltipRect.height + padding > window.innerHeight) {
        y = event.clientY - tooltipRect.height - 10; // Position above cursor
    }
    
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
}

// Dropdown toggle - MUST be global for inline onclick
function toggleCarDropdown() {
    const dropdown = document.getElementById('car-dropdown');
    const toggle = document.querySelector('.car-dropdown-toggle');
    
    dropdown.classList.toggle('show');
    toggle.classList.toggle('open');
}

// Vehicle selection - MUST be global for inline onclick
async function selectVehicle(filename) {
    console.log('Selected vehicle:', filename);
    
    // Update dropdown UI
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const clickedItem = event.target;
    clickedItem.classList.add('selected');
    
    // Close dropdown
    toggleCarDropdown();
    
    // Load vehicle data
    await loadVehicleData(filename);
}

// Load and display vehicle data from JSON file
async function loadVehicleData(filename) {
    try {
        const response = await fetch(`vehicleData/${filename}`);
        if (!response.ok) {
            throw new Error(`Failed to load ${filename}`);
        }
        
        const data = await response.json();
        const vehicles = data.data || data.vehicles || data;
        
        if (!Array.isArray(vehicles) || vehicles.length === 0) {
            console.error('No vehicle data found');
            return;
        }
        
        // Update page with vehicle data
        updatePageContent(vehicles);
        
    } catch (error) {
        console.error('Error loading vehicle data:', error);
        alert('Failed to load vehicle data. Please try again.');
    }
}

// Update all page content with vehicle data
function updatePageContent(vehicles) {
    // Extract vehicle info from first variant
    const firstVehicle = vehicles[0].vehicle || vehicles[0];
    const displayNameFull = firstVehicle.modelDetails?.displayNameFull || `${firstVehicle.make} ${firstVehicle.model}`;
    const make = firstVehicle.make || 'Unknown';
    const model = firstVehicle.modelDetails?.displayNameShort || firstVehicle.model || 'Unknown';
    
    // Update title with displayNameFull
    document.getElementById('vehicle-title').textContent = displayNameFull;
    
    // Update breadcrumb
    const breadcrumbs = document.querySelectorAll('.breadcrumbs a');
    if (breadcrumbs.length >= 3) {
        breadcrumbs[2].textContent = make;
    }
    const currentPage = document.querySelector('.current-page');
    if (currentPage) {
        currentPage.textContent = model;
    }
    
    // Aggregate data across all variants
    const aggregatedData = aggregateVehicleData(vehicles);
    
    // Update specifications
    updateSpecifications(aggregatedData);
    
    // Update description (if available from standardText)
    updateDescription(firstVehicle);
    
    // Re-apply transmission tooltips after updating specs
    addTransmissionTooltips();
}

// Aggregate data across all vehicle variants
function aggregateVehicleData(vehicles) {
    const prices = [];
    const transmissions = new Set();
    const drivenWheels = new Set();
    const fuelTypes = new Set();
    const bodyTypes = new Set();
    const powertrainTypes = new Set();
    
    vehicles.forEach(vehicleData => {
        const vehicle = vehicleData.vehicle || vehicleData;
        
        // Collect prices
        if (vehicle.price && vehicle.price > 0) {
            prices.push(vehicle.price);
        }
        
        // Collect transmissions
        const transmission = formatTransmission(vehicle);
        if (transmission) {
            transmissions.add(transmission);
        }
        
        // Collect driven wheels
        if (vehicle.drivenWheels) {
            drivenWheels.add(vehicle.drivenWheels);
        }
        
        // Collect fuel types - use formatted powertrain for hybrids/EVs
        const fuelTypeDisplay = formatFuelType(vehicle);
        if (fuelTypeDisplay) {
            fuelTypes.add(fuelTypeDisplay);
        }
        
        // Collect body types
        if (vehicle.bodyType) {
            bodyTypes.add(vehicle.bodyType);
        }
        
        // Collect powertrain types
        const powertrainDisplay = formatPowertrain(vehicle);
        if (powertrainDisplay) {
            powertrainTypes.add(powertrainDisplay);
        }
    });
    
    return {
        priceRange: formatPriceRange(prices),
        transmissions: Array.from(transmissions).sort(),
        drivenWheels: Array.from(drivenWheels).sort(),
        fuelTypes: sortFuelTypes(Array.from(fuelTypes)),
        bodyTypes: Array.from(bodyTypes).sort(),
        powertrainTypes: Array.from(powertrainTypes).sort()
    };
}

// Format transmission for a single vehicle
function formatTransmission(vehicle) {
    const { transmissionType, transmissionNumberOfSpeeds, transmissionDescription, powertrainType, fuelType } = vehicle;
    
    // Electric vehicles
    if ((powertrainType === "Battery Electric Vehicle" || fuelType === "Electric") && transmissionNumberOfSpeeds === "1") {
        return "Single-Speed Auto";
    }
    
    // CVT
    if (transmissionNumberOfSpeeds === "Variable") {
        return "Auto (CVT)";
    }
    
    // DCT
    if (transmissionDescription && (transmissionDescription.toLowerCase().includes("dual clutch") || transmissionDescription.toLowerCase().includes("dct"))) {
        return `${transmissionNumberOfSpeeds}-speed Auto (DCT)`;
    }
    
    // Standard transmission
    if (transmissionNumberOfSpeeds && transmissionType) {
        const type = transmissionType === "Automatic" ? "auto" : "manual";
        return `${transmissionNumberOfSpeeds}-speed ${type}`;
    }
    
    // Fallback
    if (transmissionType) {
        return transmissionType === "Automatic" ? "Auto" : transmissionType;
    }
    
    return null;
}

// Format fuel type for display - prioritizes powertrain type for hybrids/EVs
function formatFuelType(vehicle) {
    const { powertrainType, fuelType } = vehicle;
    
    // For hybrid and electric vehicles, show the powertrain type instead
    if (powertrainType) {
        switch (powertrainType) {
            case "Battery Electric Vehicle":
                return "Electric";
            case "Hybrid Electric Vehicle":
                return "Hybrid";
            case "Plug-in Hybrid Electric Vehicle":
                return "Plug-in Hybrid";
            case "Combustion":
                // For combustion, use the actual fuel type
                if (fuelType) {
                    return fuelType;
                }
                return "Petrol"; // Default
            default:
                // Unknown powertrain, use fuel type if available
                return fuelType || powertrainType;
        }
    }
    
    // Fallback to fuel type if no powertrain type
    return fuelType || null;
}

// Format powertrain type
function formatPowertrain(vehicle) {
    const { powertrainType, fuelType } = vehicle;
    
    if (!powertrainType) return null;
    
    switch (powertrainType) {
        case "Battery Electric Vehicle":
            return "Electric";
        case "Hybrid Electric Vehicle":
            return "Hybrid";
        case "Plug-in Hybrid Electric Vehicle":
            return "PHEV";
        case "Combustion":
            return "Combustion";
        default:
            return powertrainType;
    }
}

// Sort fuel types in a logical order
function sortFuelTypes(types) {
    const order = ['Petrol', 'Unleaded', 'Diesel', 'LPG', 'Hybrid', 'Plug-in Hybrid', 'Electric'];
    return types.sort((a, b) => {
        const aIndex = order.indexOf(a);
        const bIndex = order.indexOf(b);
        
        // If both are in the order, sort by order
        if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
        }
        
        // If only one is in the order, prioritize it
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        // If neither is in the order, sort alphabetically
        return a.localeCompare(b);
    });
}

// Format price range
function formatPriceRange(prices) {
    if (prices.length === 0) return 'Price TBA';
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-AU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    };
    
    if (min === max) {
        return `$${formatPrice(min)}`;
    }
    
    return `$${formatPrice(min)} - $${formatPrice(max)}`;
}

// Update specifications on the page
function updateSpecifications(data) {
    // Update price
    const priceElement = document.getElementById('price-value');
    if (priceElement) {
        priceElement.textContent = data.priceRange;
    }
    
    // Update transmission
    const transmissionElement = document.getElementById('transmission-value');
    if (transmissionElement) {
        transmissionElement.textContent = formatValueList(data.transmissions);
    }
    
    // Update driven wheels
    const drivenWheelsElement = document.getElementById('driven-wheels-value');
    if (drivenWheelsElement) {
        drivenWheelsElement.textContent = formatValueList(data.drivenWheels);
    }
    
    // Update fuel type
    const fuelTypeElement = document.getElementById('fuel-type-value');
    if (fuelTypeElement) {
        fuelTypeElement.textContent = formatValueList(data.fuelTypes);
    }
    
    // Update body types
    const bodyTypesElement = document.getElementById('body-types-value');
    if (bodyTypesElement) {
        bodyTypesElement.textContent = formatValueList(data.bodyTypes);
    }
    
    // Update powertrain
    const powertrainElement = document.getElementById('powertrain-value');
    if (powertrainElement) {
        powertrainElement.textContent = formatValueList(data.powertrainTypes);
    }
}

// Format a list of values with "or" separator
function formatValueList(values) {
    if (values.length === 0) return 'N/A';
    if (values.length === 1) return values[0];
    if (values.length === 2) return values.join(' or ');
    
    const lastItem = values[values.length - 1];
    const otherItems = values.slice(0, -1);
    return `${otherItems.join(', ')}, or ${lastItem}`;
}

// Update description if available
function updateDescription(vehicle) {
    // For now, keep the default description as the data doesn't include descriptions
    // You could add custom descriptions per vehicle later
    console.log('Vehicle loaded:', vehicle.make, vehicle.model);
}

// Image navigation - MUST be global for inline onclick
let currentImageIndex = 0;
const images = [
    'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&h=600&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&h=600&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop&crop=center'
];

function navigateImage(direction) {
    currentImageIndex = (currentImageIndex + direction + images.length) % images.length;
    document.getElementById('hero-image').src = images[currentImageIndex];
}

// Description toggle - MUST be global for inline onclick
function toggleDescription() {
    const description = document.querySelector('.description-text');
    const button = document.querySelector('.read-more-button');
    const specsGrid = document.querySelector('.specifications-grid');
    
    description.classList.toggle('expanded');
    button.classList.toggle('expanded');
    
    // Hide specifications when description is expanded
    if (description.classList.contains('expanded')) {
        specsGrid.classList.add('hidden');
        button.querySelector('.read-more-text').textContent = 'Read Less';
    } else {
        specsGrid.classList.remove('hidden');
        button.querySelector('.read-more-text').textContent = 'Read More';
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
    const dropdown = document.getElementById('car-dropdown');
    const toggle = document.querySelector('.car-dropdown-toggle');
    
    if (!event.target.closest('.car-selector')) {
        if (dropdown) dropdown.classList.remove('show');
        if (toggle) toggle.classList.remove('open');
    }
});

// Add transmission tooltips to the transmission value
function addTransmissionTooltips() {
    const transmissionValue = document.getElementById('transmission-value');
    if (!transmissionValue) return;
    
    const transmissionText = transmissionValue.textContent.trim();
    const parts = transmissionText.split(/,\s*or\s*|\s+or\s+|,\s*/);
    
    // Define tooltip texts for special transmission types
    const tooltips = {
        'CVT': 'Continuously Variable Transmission - uses a belt-and-pulley system instead of traditional gears for seamless acceleration. Optimised for fuel efficiency and smooth power delivery.',
        'DCT': 'Dual-Clutch Transmission - combines the efficiency of a manual gearbox with the convenience of an automatic. Delivers faster, smoother gear changes, particularly noticeable in sportier driving.',
        'Single-Speed Auto': 'Electric vehicles use a single-speed transmission as the electric motor delivers power efficiently across all speeds without needing multiple gears.'
    };
    
    // Clear existing content
    transmissionValue.innerHTML = '';
    
    // Build HTML with tooltips
    parts.forEach((part, index) => {
        if (index > 0) {
            // Add comma or "or" separator
            if (index === parts.length - 1 && parts.length === 2) {
                transmissionValue.appendChild(document.createTextNode(' or '));
            } else if (index === parts.length - 1) {
                transmissionValue.appendChild(document.createTextNode(', or '));
            } else {
                transmissionValue.appendChild(document.createTextNode(', '));
            }
        }
        
        const trimmedPart = part.trim();
        let hasTooltip = false;
        let tooltipText = '';
        
        // Check if this part contains a special transmission type
        for (const [key, tooltip] of Object.entries(tooltips)) {
            if (trimmedPart.includes(key)) {
                hasTooltip = true;
                tooltipText = tooltip;
                break;
            }
        }
        
        if (hasTooltip) {
            const span = document.createElement('span');
            span.className = 'transmission-info';
            span.textContent = trimmedPart;
            span.dataset.tooltip = tooltipText;
            
            // Add event listeners for tooltip
            span.addEventListener('mouseenter', (e) => showTooltip(e, tooltipText));
            span.addEventListener('mouseleave', hideTooltip);
            span.addEventListener('mousemove', (e) => {
                if (currentTooltip) {
                    positionTooltip(currentTooltip, e);
                }
            });
            
            transmissionValue.appendChild(span);
        } else {
            transmissionValue.appendChild(document.createTextNode(trimmedPart));
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Load default vehicle (Ford Ranger)
    const defaultVehicle = 'FDRA.json';
    await loadVehicleData(defaultVehicle);
    
    // Mark the current vehicle as selected in dropdown
    document.querySelectorAll('.dropdown-item').forEach(item => {
        if (item.dataset.file === defaultVehicle) {
            item.classList.add('selected');
        }
    });
});
