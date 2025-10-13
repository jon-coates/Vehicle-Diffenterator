# Vehicle Comparison Interface

A responsive web application for comparing vehicle specifications with dynamic difference detection and premium feature highlighting. Now includes API integration for real-time vehicle data fetching.

## Features

### Core Functionality
- **Vehicle Overview Section**: Displays aggregate information above variant cards including price range, transmission options, drivetrain, fuel types, body types, and powertrain types
- **Dynamic Data Processing**: Automatically identifies and displays only differentiating features between vehicle variants
- **API Integration**: Search vehicles using make and model codes via the CarExpert API
- **File Upload Support**: Load custom JSON vehicle data files
- **Responsive Design**: Mobile-first approach with CSS Grid supporting 1-6+ cards per row
- **Premium Feature Detection**: Intelligently highlights advantages and premium features
- **Interactive Filtering**: Filter by specification categories and sort by various criteria

### Visual Design
- **Modern UI**: Purple gradient background with glassmorphism card design
- **Vehicle Overview**: Prominent overview section with aggregate vehicle information and tooltips
- **Tabbed Interface**: Switch between file upload and API search modes
- **Compact Cards**: ~280px width, ~420px height with optimal information density
- **Visual Hierarchy**: Clear price/trim distinction with colour-coded year badges
- **Hover Effects**: Subtle animations and shadow enhancements
- **Accessibility**: Semantic HTML, keyboard navigation, and screen reader support

### Technical Specifications
- **Framework**: Vanilla HTML/CSS/JavaScript (no npm/pip dependencies)
- **Server Requirement**: Local web server required for CORS-compliant data loading
- **API Integration**: Real-time data fetching from CarExpert vehicle database
- **Performance**: Efficient DOM manipulation and lazy loading animations
- **Browser Support**: Modern browsers with CSS Grid and ES6+ support
- **Responsive Breakpoints**: Mobile (<768px), Tablet (768-1200px), Desktop (>1200px)

## Vehicle Overview Section

The application now includes a comprehensive vehicle overview section that appears above all variant cards, providing aggregate information about the entire model range:

### Overview Features
- **Price From**: Shows the lowest price among all variants
- **Transmission**: Displays all available transmission types with intelligent formatting
- **Driven Wheels**: Shows all drivetrain configurations (4x4, 4x2, etc.)
- **Fuel Type**: Lists all fuel types available across variants
- **Body Types**: Displays all body configurations with detailed formatting
- **Powertrain Type**: Shows all powertrain types (Combustion, Hybrid, Electric, etc.)

### Enhanced Display Logic

#### Transmission Display
- **Standard Auto/Manual**: "6 Speed Auto", "5 Speed Manual"
- **CVT**: "Auto (CVT)" with tooltip explanation
- **Dual-Clutch**: "6 Speed Auto (DCT)" with tooltip explanation
- **Electric**: "Single-Speed Auto" with tooltip explanation
- **Hi/Lo Range**: "10 Speed Auto (with Hi/Lo range)" for 4x4 vehicles

#### Body Type Display
- **Passenger Vehicles**: "SUV", "Sedan", "Hatchback"
- **Commercial with Cab Type**: "Single Cab Cab Chassis", "Double Cab Utility"
- **Commercial with Body Length**: "Single Cab Cab Chassis (Extended)"
- **Commercial without Cab Type**: "Bus", "Bus (Extended)"

### Tooltips
Specialized transmission types include helpful tooltips with detailed explanations:
- **CVT**: Explains continuously variable transmission benefits
- **DCT**: Describes dual-clutch transmission advantages
- **Electric**: Explains single-speed transmission in electric vehicles

## API Integration

The application now supports real-time vehicle data fetching from the CarExpert API:

### API Endpoint
```
https://vehicle-data.beta.dev-syd.carexpert.com.au/v2/vehicles
```

### Search Parameters
- **Make Code**: 2-letter manufacturer code (e.g., FO for Ford, TO for Toyota)
- **Model Code**: 2-letter model code (e.g., RA for Ranger, CA for Camry)
- **Results Limit**: Number of vehicles to fetch (10, 20, 50, or 100)
- **Current Models Only**: Filter to show only current model year vehicles

### Common Make Codes
- **FO**: Ford
- **TO**: Toyota
- **HO**: Honda
- **NI**: Nissan
- **BM**: BMW
- **ME**: Mercedes-Benz
- **AU**: Audi
- **VO**: Volkswagen

### Usage
1. Switch to the "API Search" tab
2. Enter make and model codes
3. Select desired result limit and filters
4. Click "Search Vehicles" or press Enter
5. Results will be fetched and displayed automatically

## Data Structure

The application expects JSON data in the following format:

```json
{
  "data": [
    {
      "vehicle": {
        "make": "Nissan",
        "model": "Juke",
        "trim": "N-Sport",
        "modelYear": 2024,
        "price": 38665,
        "isCurrent": true,
        "audio": { "speakerBrandName": "Bose", "speakerNumberOfSpeakers": "10" },
        "engine": { "engineLiters": "1.0", "compressor": "Turbo" },
        "performance": { "powerMaximumPowerKw": "84" },
        "safety": { "numberOfAirbags": "6" }
      }
    }
  ]
}
```

### Supported Categories
- Audio & Entertainment
- Body & Exterior
- Brakes & Safety
- Convenience Features
- Dimensions & Space
- Engine & Performance
- Fuel & Economy
- Interior & Trim
- Lights & Visibility
- Seats & Comfort
- Steering & Handling
- Suspension & Wheels
- Transmission & Drivetrain
- Ventilation & Climate

## Usage

### Running Locally

**Important:** This application requires a local web server to run properly. You cannot simply open `index.html` directly in a browser (using the `file://` protocol) because the application uses `fetch()` to load JSON data files, which is blocked by browsers' CORS security policies.

#### Starting a Local Server

Choose one of the following methods:

**Option 1: Python (Recommended)**
```bash
# Navigate to the project directory
cd "Vehicle Diffenterator"

# Python 3
python3 -m http.server 8080

# Or Python 2
python -m SimpleHTTPServer 8080
```
Then open: `http://localhost:8080`

**Option 2: Node.js/npx**
```bash
npx http-server -p 8080
```
Then open: `http://localhost:8080`

**Option 3: PHP**
```bash
php -S localhost:8080
```
Then open: `http://localhost:8080`

**Option 4: VS Code Live Server Extension**
- Install the "Live Server" extension in VS Code
- Right-click `index.html` → "Open with Live Server"

**Note:** If you get an "Address already in use" error, try a different port number (e.g., 3000, 8000, 8888, 9000).

### Basic Setup
1. Start a local web server using one of the methods above
2. Open your browser and navigate to `http://localhost:8080` (or whichever port you chose)
3. The application will automatically load the default sample data
4. Use either the preloaded data selector, file upload, or API search functionality

### Using the Application

**Preloaded Data**
1. Select a dataset from the "Preloaded Data" dropdown
2. The application will automatically load and display the comparison

**File Upload**
1. Click "Upload File" tab
2. Click "Browse" to select a JSON file
3. Ensure the file follows the expected data structure
4. The application will process and display the comparison

**API Search** (if available)
1. Click "API Search" tab
2. Enter make and model codes (e.g., FO for Ford, RA for Ranger)
3. Select result limit and filters
4. Click "Search Vehicles" or press Enter
5. Results will be fetched from the API and displayed

### Filtering & Sorting
- **Category Filter**: Show only differences from specific specification categories
- **Sort Options**:
  - Price (Low to High / High to Low)
  - Year (Newest First / Oldest First)
  - Trim Level (Alphabetical)

### Card Features
- **Header**: Brand, model, trim badge, year badge, and price
- **Differences Grid**: Key differentiating specifications in compact 2-column layout
- **Premium Highlighting**: Green background for advantageous features
- **Feature Tags**: Key selling points as small badges

## Adding New Vehicle Data

To add a new vehicle dataset to the project:

### Step 1: Add the Data File
1. Place your JSON file in the `vehicleData/` directory
2. Use a descriptive filename (e.g., `fordTransit.json`, `toyotaCamry.json`)
3. Ensure the file follows the expected data structure (see "Data Structure" section)

### Step 2: Update HTML Files
Add a new `<option>` element to the preloaded data dropdown in **all three** HTML files:

**Files to update:**
- `index.html` (line ~37-47)
- `vehicle-overview.html` (line ~300-310)
- `comparison.html` (line ~38-48)

**Add this line:**
```html
<option value="yourFileName.json">Your Vehicle Display Name</option>
```

**Example:**
```html
<option value="fordTransit.json">Ford Transit Vehicle Data</option>
```

**Tip:** Keep the list alphabetically organised by make, then model.

### Step 3: Test
1. Start your local web server
2. Open each page (main, overview, and columnar comparison)
3. Verify the new dataset appears in the dropdown
4. Select it and confirm the data loads correctly

## File Structure

```
Vehicle Diffenterator/
├── index.html              # Main HTML structure with tabbed interface
├── styles.css              # Responsive CSS with glassmorphism design
├── script.js               # Core JavaScript functionality with API integration
├── vehicleData/
│   └── juke.json          # Sample vehicle data
└── README.md              # This documentation
```

## Browser Compatibility

- **Chrome**: 60+
- **Firefox**: 55+
- **Safari**: 12+
- **Edge**: 79+

### Required Features
- CSS Grid
- ES6+ JavaScript
- Fetch API
- Intersection Observer API

## Performance Considerations

- **Efficient Rendering**: Only processes and displays differentiating features
- **API Caching**: Results are processed and cached for smooth interaction
- **Lazy Loading**: Cards animate in as they enter the viewport
- **Optimized DOM**: Minimal DOM manipulation for smooth performance
- **Memory Management**: Proper cleanup of event listeners and observers

## Accessibility Features

- **Semantic HTML**: Proper heading hierarchy and landmark elements
- **Keyboard Navigation**: Full keyboard accessibility for all interactive elements
- **Screen Reader Support**: ARIA labels and descriptive text
- **Colour Contrast**: WCAG AA compliant contrast ratios
- **Reduced Motion**: Respects user's motion preferences
- **Tab Navigation**: Accessible tab switching between data sources

## Error Handling

The application includes comprehensive error handling for:
- Invalid JSON files
- Missing or malformed data structures
- Network errors when loading sample data or API requests
- Empty or insufficient vehicle datasets
- Invalid make/model codes
- API rate limiting and server errors

## API Error Handling

The application gracefully handles various API scenarios:
- **No Results**: Clear messaging when no vehicles match the search criteria
- **Network Errors**: User-friendly error messages for connection issues
- **Invalid Codes**: Guidance on correct make/model code format
- **Rate Limiting**: Appropriate feedback for API usage limits

## Troubleshooting

### "Failed to load data" or "Error loading data"
**Problem**: The application cannot load JSON files.

**Solution**: 
- Ensure you're running a local web server (see "Running Locally" section above)
- Do not open `index.html` directly via `file://` protocol
- Check that the vehicleData directory exists and contains JSON files

### "Address already in use" when starting server
**Problem**: The port is already being used by another process.

**Solution**: 
- Try a different port number: `python3 -m http.server 3000` (or 8888, 9000, etc.)
- Or stop the existing process using that port

### Application loads but no vehicle cards appear
**Problem**: Data may be loading but not displaying correctly.

**Solution**:
- Check the browser console (F12) for error messages
- Verify the JSON file structure matches the expected format
- Try selecting a different preloaded dataset from the dropdown

## Customisation

### Styling
Modify CSS custom properties in `styles.css`:

```css
:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --accent-green: #48bb78;
  --accent-blue: #4299e1;
  --card-bg: rgba(255, 255, 255, 0.95);
}
```

### API Configuration
Modify the API endpoint in `script.js`:

```javascript
this.apiBaseUrl = 'https://your-api-endpoint.com/v2/vehicles';
```

### Data Processing
Extend the `extractSpecifications()` method in `script.js` to handle additional data categories or custom field mappings.

### Premium Feature Detection
Modify the `isPremiumValue()` method to customise how premium features are identified based on your specific requirements.

## Future Enhancements

Potential improvements for future versions:
- Export comparison results to PDF/CSV
- Advanced filtering with multiple criteria
- Vehicle image integration
- Side-by-side detailed comparison view
- Save/load comparison configurations
- Integration with additional vehicle APIs
- Offline data caching
- Real-time price updates

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing style conventions
- New features include appropriate tests
- Documentation is updated for new functionality
- Accessibility standards are maintained
- API integration follows best practices for error handling

## API Credits

Vehicle data provided by [CarExpert](https://carexpert.com.au) via their public API endpoint.
