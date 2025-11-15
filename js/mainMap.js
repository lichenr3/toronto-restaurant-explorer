// mainMap.js - Main map management class

/**
 * MainMap class - Handles main map rendering, neighbourhood interaction and restaurant point display
 */
class MainMap {
    constructor(mapStateInstance, tooltipInstance, chartsInstance) {
        this.mapState = mapStateInstance;
        this.tooltip = tooltipInstance;
        this.charts = chartsInstance;
        
        // Debug information
        console.log("🔧 MainMap initialization");
        console.log("  - mapState:", !!this.mapState);
        console.log("  - tooltip:", !!this.tooltip, typeof this.tooltip);
        console.log("  - charts:", !!this.charts);
        
        // Cache neighbourhood statistics data
        this.neighbourhoodStatsCache = new Map();
        this.lastHoverTimeout = null;
    }

    /**
     * Set up main map
     */
    setup() {
        const config = this.mapState.getConfig();
        const geoData = this.mapState.getGeoData();
        const mainProjection = this.mapState.getMainProjection();
        const mainSvg = this.mapState.getMainSvg();
        
        // Initialize projection
        mainProjection.fitSize([config.mainWidth, config.mainHeight], geoData);
        
        // 创建地图图层
        mainSvg.append("g").attr("id", "map-paths");
        mainSvg.append("g").attr("id", "restaurant-dots");
        
        // 添加缩放和拖拽功能
        const mainZoom = d3.zoom()
            .scaleExtent([config.minZoom, config.maxZoom])
            .on("zoom", (event) => {
                this.mapState.setCurrentTransform(event.transform);
                this.mapState.setCurrentZoom(event.transform.k);
                
                // 应用变换到地图和餐厅点
                mainSvg.select("#map-paths").attr("transform", event.transform);
                mainSvg.select("#restaurant-dots").attr("transform", event.transform);
                
                // 更新 minimap（需要MiniMap实例）
                if (window.miniMapInstance) {
                    window.miniMapInstance.updateVisibility();
                    window.miniMapInstance.updateViewport();
                }
            });
        
        this.mapState.setMainZoom(mainZoom);
        mainSvg.call(mainZoom);
        
        // 双击重置缩放
        mainSvg.on("dblclick.zoom", function() {
            mainSvg.transition()
                .duration(750)
                .call(mainZoom.transform, d3.zoomIdentity);
        });
    }

    /**
     * 更新地图（应用筛选器并显示点）
     */
    updateWithFilters() {
        const geoData = this.mapState.getGeoData();
        const mainPathGenerator = this.mapState.getMainPathGenerator();
        const mainSvg = this.mapState.getMainSvg();
        
        // 绘制社区边界
        const paths = mainSvg.select("#map-paths").selectAll("path")
            .data(geoData.features, d => d.properties.AREA_NAME);
        
        paths.join("path")
            .attr("d", mainPathGenerator)
            .attr("class", "neighbourhood")
            .classed("selected", false)
            .on("click", (event, d) => this.handleNeighbourhoodClick(event, d))
            .on("mouseenter", (event, d) => this.handleNeighbourhoodMouseover(event, d))
            .on("mousemove", (event) => this.tooltip.move(event))
            .on("mouseleave", () => {
                // 当鼠标离开社区时，清除待处理的计算并隐藏tooltip
                if (this.lastHoverTimeout) {
                    clearTimeout(this.lastHoverTimeout);
                    this.lastHoverTimeout = null;
                }
                this.tooltip.hide();
            });
        
        // 获取筛选后的数据
        const filteredData = this.getFilteredData();
        
        // 根据复选框状态决定是否显示点
        const showDots = d3.select("#show-dots").property("checked");
        if (showDots) {
            this.drawAllRestaurants(filteredData);
        } else {
            mainSvg.select("#restaurant-dots").selectAll("*").remove();
        }
    }

    /**
     * 获取筛选后的数据
     * @returns {Array} 筛选后的餐厅数据
     */
    getFilteredData() {
        const mergedData = this.mapState.getMergedData();
        const statusFilter = d3.select("#status-filter").property("value");
        const healthGradeFilter = d3.select("#health-grade-filter").property("value");
        const cuisineFilter = d3.select("#cuisine-filter").property("value");
        const severityFilter = d3.select("#severity-filter").property("value");
        
        const mainCuisineTypes = [
            "Restaurant", "Food Take Out", "Food Store (Convenience/Variety)",
            "Food Court Vendor", "Supermarket", "Bakery", "Food Caterer",
            "Banquet Facility", "Butcher Shop"
        ];
        
        return mergedData.filter(d => {
            const statusMatch = statusFilter === 'all' || d["Establishment Status"] === statusFilter;
            const healthGradeMatch = healthGradeFilter === 'all' || d.healthGrade === healthGradeFilter;
            
            let cuisineMatch = cuisineFilter === 'all';
            if (!cuisineMatch) {
                if (cuisineFilter === 'other') {
                    cuisineMatch = !mainCuisineTypes.includes(d["Establishment Type"]);
                } else {
                    cuisineMatch = d["Establishment Type"] === cuisineFilter;
                }
            }
            
            let severityMatch = true;
            if (severityFilter !== 'all') {
                const severityOrder = { 'clean': 0, 'M': 1, 'S': 2, 'C': 3 };
                const filterLevel = severityOrder[severityFilter];
                const restaurantLevel = severityOrder[d.worstSeverity];
                severityMatch = restaurantLevel <= filterLevel;
            }
            
            return statusMatch && healthGradeMatch && cuisineMatch && severityMatch;
        });
    }

    /**
     * 绘制所有餐厅点
     * @param {Array} restaurants - 餐厅数据
     */
    drawAllRestaurants(restaurants) {
        const config = this.mapState.getConfig();
        const mainProjection = this.mapState.getMainProjection();
        const mainSvg = this.mapState.getMainSvg();
        const radiusScale = this.mapState.getRadiusScale();
        
        const circles = mainSvg.select("#restaurant-dots").selectAll("circle")
            .data(restaurants, d => d["unique_id"]);
        
        circles.join("circle")
            .attr("class", "restaurant")
            .attr("cx", d => mainProjection([+d.Longitude, +d.Latitude])[0])
            .attr("cy", d => mainProjection([+d.Longitude, +d.Latitude])[1])
            .attr("r", d => d.yelpMatch ? radiusScale(+d.yelpMatch.num_of_reviews) : 3)
            .attr("fill", d => config.healthGradeColors[d.healthGrade || 'D'])
            .attr("stroke", d => {
                if (d["Establishment Status"] === "Closed") return "#c62828";
                if (d["Establishment Status"] === "Conditional Pass") return "#e65100";
                return "rgba(0,0,0,0.3)";
            })
            .on("mouseenter", (event, d) => {
                // 当鼠标进入餐厅点时，立即清除任何待处理的社区悬停计算
                if (this.lastHoverTimeout) {
                    clearTimeout(this.lastHoverTimeout);
                    this.lastHoverTimeout = null;
                }
                // 立即隐藏任何可能存在的社区tooltip，然后显示餐厅的tooltip
                this.tooltip.hide(); 
                
                // 添加悬停效果
                d3.select(event.target).classed("hovered", true);
                
                this.tooltip.show(event, d);
            })
            .on("mousemove", (event) => this.tooltip.move(event))
            .on("mouseleave", (event) => {
                // 移除悬停效果
                d3.select(event.target).classed("hovered", false);
                this.tooltip.hide();
            });
    }

    /**
     * 处理社区悬停事件（优化性能）
     * @param {Event} event - 鼠标事件
     * @param {Object} feature - GeoJSON feature
     */
    handleNeighbourhoodMouseover(event, feature) {
        const neighbourhoodName = feature.properties.AREA_NAME;
        
        // 清除之前的计算
        if (this.lastHoverTimeout) {
            clearTimeout(this.lastHoverTimeout);
        }
        
        // 立即隐藏任何餐厅的tooltip
        this.tooltip.hide();
        
        // 检查缓存
        if (this.neighbourhoodStatsCache.has(neighbourhoodName)) {
            const avgHealthScore = this.neighbourhoodStatsCache.get(neighbourhoodName);
            this.showNeighbourhoodTooltip(event, neighbourhoodName, avgHealthScore);
            return;
        }
        
        // 先显示名称，异步计算分数
        this.showNeighbourhoodTooltip(event, neighbourhoodName, '');
        
        // 延迟计算，避免快速移动时频繁计算
        this.lastHoverTimeout = setTimeout(() => {
            const mergedData = this.mapState.getMergedData();
            
            // 实时计算该社区内的餐厅
            const restaurantsInArea = mergedData.filter(resto => {
                const point = [+resto.Longitude, +resto.Latitude];
                return d3.geoContains(feature, point);
            });
            
            // 计算平均健康分
            const avgHealthScore = restaurantsInArea.length > 0 
                ? d3.mean(restaurantsInArea, d => d.healthScore).toFixed(1)
                : 'N/A';
            
            // 缓存结果
            this.neighbourhoodStatsCache.set(neighbourhoodName, avgHealthScore);
            
            // 更新显示
            this.showNeighbourhoodTooltip(event, neighbourhoodName, avgHealthScore);
        }, 150); // 150ms 延迟
    }

    /**
     * 显示社区工具提示
     * @param {Event} event - 鼠标事件
     * @param {string} neighbourhoodName - 社区名称
     * @param {string} avgHealthScore - 平均健康分数
     */
    showNeighbourhoodTooltip(event, neighbourhoodName, avgHealthScore) {
        const content = `
            <div style="min-width: 200px;">
                <h3 style="margin: 0 0 10px 0; border-bottom: 2px solid #007bff; padding-bottom: 5px;">
                    ${neighbourhoodName}
                </h3>
                <div style="font-size: 14px;">
                    <strong>Avg. Health Score:</strong> 
                    <span style="font-weight: bold; font-size: 18px; color: #2c3e50;">
                        ${avgHealthScore}
                    </span>
                </div>
            </div>
        `;
        
        this.tooltip.showCustom(event, content);
    }

    /**
     * 处理社区点击事件
     * @param {Event} event - 鼠标事件
     * @param {Object} feature - GeoJSON feature
     */
    handleNeighbourhoodClick(event, feature) {
        const neighbourhoodName = feature.properties.AREA_NAME;
        const mainSvg = this.mapState.getMainSvg();
        
        // 更新选中状态
        mainSvg.select("#map-paths").selectAll("path")
            .classed("selected", d => d.properties.AREA_NAME === neighbourhoodName);
        
        this.mapState.setSelectedNeighbourhood(feature);
        
        // 获取筛选后的数据
        const filteredData = this.getFilteredData();
        
        // 筛选该社区内的餐厅
        const restaurantsInArea = filteredData.filter(resto => {
            const point = [+resto.Longitude, +resto.Latitude];
            return d3.geoContains(feature, point);
        });
        
        console.log(`📍 ${neighbourhoodName}: ${restaurantsInArea.length} restaurants`);
        
        // 根据复选框状态决定是否显示点
        const showDots = d3.select("#show-dots").property("checked");
        if (showDots) {
            this.drawRestaurantsInNeighbourhood(restaurantsInArea);
        }
        
        // 显示统计面板
        this.showStatsPanel(neighbourhoodName, restaurantsInArea);
    }

    /**
     * 绘制特定社区的餐厅点
     * @param {Array} restaurants - 餐厅数据
     */
    drawRestaurantsInNeighbourhood(restaurants) {
        const config = this.mapState.getConfig();
        const mainProjection = this.mapState.getMainProjection();
        const mainSvg = this.mapState.getMainSvg();
        const radiusScale = this.mapState.getRadiusScale();
        
        const circles = mainSvg.select("#restaurant-dots").selectAll("circle")
            .data(restaurants, d => d["unique_id"]);
        
        circles.join("circle")
            .attr("class", "restaurant")
            .attr("cx", d => mainProjection([+d.Longitude, +d.Latitude])[0])
            .attr("cy", d => mainProjection([+d.Longitude, +d.Latitude])[1])
            .attr("r", d => d.yelpMatch ? radiusScale(+d.yelpMatch.num_of_reviews) : 3)
            .attr("fill", d => config.healthGradeColors[d.healthGrade || 'D'])
            .attr("stroke", d => {
                if (d["Establishment Status"] === "Closed") return "#c62828";
                if (d["Establishment Status"] === "Conditional Pass") return "#e65100";
                return "rgba(0,0,0,0.3)";
            })
            .on("mouseenter", (event, d) => {
                // 当鼠标进入餐厅点时，立即清除任何待处理的社区悬停计算
                if (this.lastHoverTimeout) {
                    clearTimeout(this.lastHoverTimeout);
                    this.lastHoverTimeout = null;
                }
                // 立即隐藏任何可能存在的社区tooltip，然后显示餐厅的tooltip
                this.tooltip.hide(); 
                
                // 添加悬停效果
                d3.select(event.target).classed("hovered", true);
                
                this.tooltip.show(event, d);
            })
            .on("mousemove", (event) => this.tooltip.move(event))
            .on("mouseleave", (event) => {
                // 移除悬停效果
                d3.select(event.target).classed("hovered", false);
                this.tooltip.hide();
            });
    }

    /**
     * 显示统计面板
     * @param {string} neighbourhoodName - 社区名称
     * @param {Array} restaurants - 餐厅数据
     */
    showStatsPanel(neighbourhoodName, restaurants) {
        const panel = d3.select("#stats-panel");
        panel.classed("hidden", false);
        
        d3.select("#stats-neighbourhood-name").text(`${neighbourhoodName} - Neighbourhood Statistics`);
        
        // 计算统计数据
        const totalRestaurants = restaurants.length;
        const avgHealthScore = totalRestaurants > 0 
            ? (d3.mean(restaurants, d => d.healthScore) || 0).toFixed(1)
            : 0;
        const avgRating = restaurants.filter(d => d.yelpMatch).length > 0
            ? (d3.mean(restaurants.filter(d => d.yelpMatch), d => +d.yelpMatch.avg_rating) || 0).toFixed(2)
            : "N/A";
        
        // 更新指标卡片
        d3.select("#stats-total").text(totalRestaurants);
        d3.select("#stats-health").text(avgHealthScore);
        d3.select("#stats-rating").text(avgRating);
        
        // 绘制图表
        this.charts.drawCuisineChart(restaurants);
        this.charts.drawStatusChart(restaurants);
        this.charts.drawRatingChart(restaurants);
        
        // 显示"查看详情"按钮
        d3.select("#view-details-btn")
            .style("display", "inline-block")
            .on("click", () => {
                this.saveFilters();
                sessionStorage.setItem('selectedRestaurants', JSON.stringify(restaurants));
                sessionStorage.setItem('selectedNeighbourhood', neighbourhoodName);
                window.location.href = 'cards.html';
            });
    }

    /**
     * 关闭统计面板
     */
    closeStatsPanel() {
        const mainSvg = this.mapState.getMainSvg();
        d3.select("#stats-panel").classed("hidden", true);
        mainSvg.select("#map-paths").selectAll("path").classed("selected", false);
        mainSvg.select("#restaurant-dots").selectAll("*").remove();
        this.mapState.setSelectedNeighbourhood(null);
    }

    /**
     * 显示全局统计预览
     */
    showGlobalStats() {
        const mergedData = this.mapState.getMergedData();
        const panel = d3.select("#stats-panel");
        panel.classed("hidden", false);
        
        d3.select("#stats-neighbourhood-name").text("Toronto Overview - All Restaurants");
        
        // 获取筛选条件
        const statusFilter = d3.select("#status-filter").property("value");
        const healthGradeFilter = d3.select("#health-grade-filter").property("value");
        const cuisineFilter = d3.select("#cuisine-filter").property("value");
        const severityFilter = d3.select("#severity-filter").property("value");
        
        // 应用筛选
        const filteredRestaurants = mergedData.filter(d => {
            const statusMatch = statusFilter === 'all' || d["Establishment Status"] === statusFilter;
            const healthGradeMatch = healthGradeFilter === 'all' || d.healthGrade === healthGradeFilter;
            const cuisineMatch = cuisineFilter === 'all' || d["Establishment Type"] === cuisineFilter;
            
            let severityMatch = true;
            if (severityFilter !== 'all') {
                const severityOrder = { 'clean': 0, 'M': 1, 'S': 2, 'C': 3 };
                const filterLevel = severityOrder[severityFilter];
                const restaurantLevel = severityOrder[d.worstSeverity];
                severityMatch = restaurantLevel <= filterLevel;
            }
            
            return statusMatch && healthGradeMatch && cuisineMatch && severityMatch;
        });
        
        // 计算统计数据
        const totalRestaurants = filteredRestaurants.length;
        const avgHealthScore = totalRestaurants > 0 
            ? (d3.mean(filteredRestaurants, d => d.healthScore) || 0).toFixed(1)
            : 0;
        const avgRating = filteredRestaurants.filter(d => d.yelpMatch).length > 0
            ? (d3.mean(filteredRestaurants.filter(d => d.yelpMatch), d => +d.yelpMatch.avg_rating) || 0).toFixed(2)
            : "N/A";
        
        // 更新指标卡片
        d3.select("#stats-total").text(totalRestaurants);
        d3.select("#stats-health").text(avgHealthScore);
        d3.select("#stats-rating").text(avgRating);
        
        // 绘制图表
        this.charts.drawCuisineChart(filteredRestaurants);
        this.charts.drawStatusChart(filteredRestaurants);
        this.charts.drawRatingChart(filteredRestaurants);
        
        // 隐藏"查看详情"按钮
        d3.select("#view-details-btn").style("display", "none");
    }

    /**
     * 保存筛选器状态
     */
    saveFilters() {
        const filters = {
            status: d3.select("#status-filter").property("value"),
            healthGrade: d3.select("#health-grade-filter").property("value"),
            cuisine: d3.select("#cuisine-filter").property("value"),
            severity: d3.select("#severity-filter").property("value")
        };
        sessionStorage.setItem('mapFilters', JSON.stringify(filters));
    }

    /**
     * 恢复筛选器状态
     */
    restoreFilters() {
        const savedFilters = sessionStorage.getItem('mapFilters');
        if (savedFilters) {
            const filters = JSON.parse(savedFilters);
            d3.select("#status-filter").property("value", filters.status || 'all');
            d3.select("#health-grade-filter").property("value", filters.healthGrade || 'all');
            d3.select("#cuisine-filter").property("value", filters.cuisine || 'all');
            d3.select("#severity-filter").property("value", filters.severity || 'all');
        }
    }

    /**
     * 重置到全部数据视图
     */
    resetToAllData() {
        const mainSvg = this.mapState.getMainSvg();
        
        // 清除社区选择状态
        mainSvg.select("#map-paths").selectAll("path").classed("selected", false);
        this.mapState.setSelectedNeighbourhood(null);
        
        // 清除餐厅点显示
        mainSvg.select("#restaurant-dots").selectAll("*").remove();
        
        // 重新绘制所有餐厅点（如果复选框被选中）
        const showDots = d3.select("#show-dots").property("checked");
        if (showDots) {
            const filteredData = this.getFilteredData();
            this.drawAllRestaurants(filteredData);
        }
        
        // 显示全局统计
        this.showGlobalStats();
    }
}

// 为了保持向后兼容性，创建全局函数
let mainMapInstance = null;

function setupMainMap() {
    if (mainMapInstance) {
        mainMapInstance.setup();
    }
}

function updateMapWithFilters() {
    if (mainMapInstance) {
        mainMapInstance.updateWithFilters();
    }
}

function getFilteredData() {
    return mainMapInstance ? mainMapInstance.getFilteredData() : [];
}

function drawAllRestaurants(restaurants) {
    if (mainMapInstance) {
        mainMapInstance.drawAllRestaurants(restaurants);
    }
}

function handleNeighbourhoodClick(event, feature) {
    if (mainMapInstance) {
        mainMapInstance.handleNeighbourhoodClick(event, feature);
    }
}

function showStatsPanel(neighbourhoodName, restaurants) {
    if (mainMapInstance) {
        mainMapInstance.showStatsPanel(neighbourhoodName, restaurants);
    }
}

function closeStatsPanel() {
    if (mainMapInstance) {
        mainMapInstance.closeStatsPanel();
    }
}

function showGlobalStats() {
    if (mainMapInstance) {
        mainMapInstance.showGlobalStats();
    }
}

function saveFilters() {
    if (mainMapInstance) {
        mainMapInstance.saveFilters();
    }
}

function restoreFilters() {
    if (mainMapInstance) {
        mainMapInstance.restoreFilters();
    }
}

function resetToAllData() {
    if (mainMapInstance) {
        mainMapInstance.resetToAllData();
    }
}