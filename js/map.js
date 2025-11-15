
class MapManager {
    constructor() {
        this.mapState = null;
        this.dataLoader = null;
        this.tooltip = null;
        this.charts = null;
        this.mainMap = null;
        this.miniMap = null;
    }

    init(geo, data) {
        const config = MapState.getInstance().getConfig();
        
        // Initialize MapState singleton
        this.mapState = MapState.getInstance();
        this.mapState.setGeoData(geo);
        this.mapState.setMergedData(data);
        
        // Create SVG elements
        const mainSvg = d3.select("#map-container").append("svg")
            .attr("width", config.mainWidth)
            .attr("height", config.mainHeight);
        this.mapState.setMainSvg(mainSvg);
        
        const miniSvg = d3.select("#minimap-container").append("svg")
            .attr("width", config.miniWidth)
            .attr("height", config.miniHeight);
        this.mapState.setMiniSvg(miniSvg);
        
        // Create projections
        const mainProjection = d3.geoMercator();
        const miniProjection = d3.geoMercator();
        this.mapState.setMainProjection(mainProjection);
        this.mapState.setMiniProjection(miniProjection);
        
        // Create path generators
        const mainPathGenerator = d3.geoPath().projection(mainProjection);
        const miniPathGenerator = d3.geoPath().projection(miniProjection);
        this.mapState.setMainPathGenerator(mainPathGenerator);
        this.mapState.setMiniPathGenerator(miniPathGenerator);
        
        // Create tooltip
        const tooltip = d3.select("#tooltip");
        this.mapState.setTooltip(tooltip);
        
        // Create radius scale
        const radiusScale = d3.scaleSqrt()
            .domain([1, 1000])
            .range([2.5, 15])
            .clamp(true);
        this.mapState.setRadiusScale(radiusScale);

        // Initialize module instances
        this.dataLoader = new DataLoader();
        this.tooltip = initTooltip(this.mapState);
        this.charts = new Charts();
        this.mainMap = new MainMap(this.mapState, this.tooltip, this.charts);
        this.miniMap = new MiniMap(this.mapState);
        
        // Set global instance variables for backward compatibility
        mainMapInstance = this.mainMap;
        miniMapInstance = this.miniMap;
        tooltipInstance = this.tooltip;
        
        // Initialize modules
        this.miniMap.setup();
        this.mainMap.setup();
        
        // Restore filter state
        this.mainMap.restoreFilters();
        
        // Initial render
        this.mainMap.updateWithFilters();
        this.mainMap.showGlobalStats();
        
        // Bind filter events
        this.bindFilterEvents();
    }

    /**
     * Bind filter events
     */
    bindFilterEvents() {
        d3.selectAll("select, #show-dots").on("change", () => {
            const selectedNeighbourhood = this.mapState.getSelectedNeighbourhood();
            
            if (!selectedNeighbourhood) {
                // Global view
                this.mainMap.updateWithFilters();
                this.mainMap.showGlobalStats();
            } else {
                // Neighbourhood view
                const showDots = d3.select("#show-dots").property("checked");
                if (showDots) {
                    this.mainMap.handleNeighbourhoodClick(null, selectedNeighbourhood);
                } else {
                    this.mapState.getMainSvg().select("#restaurant-dots").selectAll("*").remove();
                }
            }
        });
    }

    /**
     * Get MapState instance
     * @returns {MapState} MapState instance
     */
    getMapState() {
        return this.mapState;
    }

    /**
     * Get DataLoader instance
     * @returns {DataLoader} DataLoader instance
     */
    getDataLoader() {
        return this.dataLoader;
    }

    /**
     * Get Tooltip instance
     * @returns {Tooltip} Tooltip instance
     */
    getTooltip() {
        return this.tooltip;
    }

    /**
     * Get Charts instance
     * @returns {Charts} Charts instance
     */
    getCharts() {
        return this.charts;
    }

    /**
     * Get MainMap instance
     * @returns {MainMap} MainMap instance
     */
    getMainMap() {
        return this.mainMap;
    }

    /**
     * Get MiniMap instance
     * @returns {MiniMap} MiniMap instance
     */
    getMiniMap() {
        return this.miniMap;
    }

    /**
     * Reset all state
     */
    reset() {
        if (this.mapState) {
            this.mapState.reset();
        }
        if (this.mainMap) {
            this.mainMap.resetToAllData();
        }
    }
}

// For backward compatibility, create global instance and functions
let mapInstance = null;

function initMap(geo, data) {
    mapInstance = new MapManager();
    mapInstance.init(geo, data);
    return mapInstance;
}