// mapState.js - Global state management class

/**
 * MapState singleton class - Manages global application state
 */
class MapState {
    constructor() {
        // Prevent duplicate instantiation
        if (MapState.instance) {
            return MapState.instance;
        }
        
        // State variable initialization
        this.geoData = null;
        this.mergedData = null;
        this.mainSvg = null;
        this.miniSvg = null;
        this.mainProjection = null;
        this.miniProjection = null;
        this.mainPathGenerator = null;
        this.miniPathGenerator = null;
        this.tooltip = null;
        this.radiusScale = null;
        this.selectedNeighbourhood = null;  // Currently selected neighbourhood
        this.currentFilteredData = [];      // Currently filtered data
        this.currentZoom = 1;               // Current zoom level
        this.currentTransform = null;       // Current transform state
        this.updatingBrush = false;       // Flag: whether programmatically updating brush (avoid circular triggers)
        this.mainZoom = null;               // Main map zoom behavior object
        this.isAnimating = false;           // Flag: whether executing animation (to disable tooltip)

        // Configuration constants
        this.MAP_CONFIG = {
            // Map dimensions
            mainWidth: 1200,
            mainHeight: 700,
            miniWidth: 220,
            miniHeight: 165,
            
            // Zoom configuration
            zoomThreshold: 1.5,    // Zoom threshold for showing minimap
            minZoom: 1,
            maxZoom: 8,
            
            // Animation configuration
            transitionDuration: 500,
            tooltipDelay: 200,  // Increased to 200ms to prevent flickering
            
            // Health grade color mapping
            healthGradeColors: {
                'A': '#2ecc71',  // Green - Excellent
                'B': '#f1c40f',  // Yellow - Good
                'C': '#e67e22',  // Orange - Fair
                'D': '#e74c3c'   // Red - Poor
            },
            
            // Main restaurant types list
            mainTypes: [
                "Restaurant",
                "Take Out Restaurant",
                "Mobile Food Vendor",
                "Catering Establishment",
                "Banquet Hall/Convention Centre"
            ]
        };
        
        MapState.instance = this;
    }

    // Get singleton instance
    static getInstance() {
        if (!MapState.instance) {
            MapState.instance = new MapState();
        }
        return MapState.instance;
    }

    // Getters
    getGeoData() { return this.geoData; }
    getMergedData() { return this.mergedData; }
    getMainSvg() { return this.mainSvg; }
    getMiniSvg() { return this.miniSvg; }
    getMainProjection() { return this.mainProjection; }
    getMiniProjection() { return this.miniProjection; }
    getMainPathGenerator() { return this.mainPathGenerator; }
    getMiniPathGenerator() { return this.miniPathGenerator; }
    getTooltip() { return this.tooltip; }
    getRadiusScale() { return this.radiusScale; }
    getSelectedNeighbourhood() { return this.selectedNeighbourhood; }
    getCurrentFilteredData() { return this.currentFilteredData; }
    getCurrentZoom() { return this.currentZoom; }
    getCurrentTransform() { return this.currentTransform; }
    isUpdatingBrush() { return this.updatingBrush; }
    getMainZoom() { return this.mainZoom; }
    getIsAnimating() { return this.isAnimating; }
    getConfig() { return this.MAP_CONFIG; }

    // Setters
    setGeoData(data) { this.geoData = data; }
    setMergedData(data) { this.mergedData = data; }
    setMainSvg(svg) { this.mainSvg = svg; }
    setMiniSvg(svg) { this.miniSvg = svg; }
    setMainProjection(proj) { this.mainProjection = proj; }
    setMiniProjection(proj) { this.miniProjection = proj; }
    setMainPathGenerator(gen) { this.mainPathGenerator = gen; }
    setMiniPathGenerator(gen) { this.miniPathGenerator = gen; }
    setTooltip(t) { this.tooltip = t; }
    setRadiusScale(scale) { this.radiusScale = scale; }
    setSelectedNeighbourhood(n) { this.selectedNeighbourhood = n; }
    setCurrentFilteredData(data) { this.currentFilteredData = data; }
    setCurrentZoom(zoom) { this.currentZoom = zoom; }
    setCurrentTransform(transform) { this.currentTransform = transform; }
    setUpdatingBrush(value) { this.updatingBrush = value; }
    setMainZoom(zoom) { this.mainZoom = zoom; }
    setAnimating(value) { this.isAnimating = value; }

    // Reset all state
    reset() {
        this.selectedNeighbourhood = null;
        this.currentFilteredData = [];
        this.currentZoom = 1;
        this.currentTransform = null;
        this.updatingBrush = false;
        this.isAnimating = false;
    }
}

// For backward compatibility, create global instance and functions
const mapState = MapState.getInstance();