// miniMap.js - Mini map management class

/**
 * MiniMap 类 - 处理小地图渲染、brush 交互和与主地图同步
 */
class MiniMap {
    constructor(mapStateInstance) {
        this.mapState = mapStateInstance;
        this.brush = null;
    }

    /**
     * 设置小地图
     */
    setup() {
        const config = this.mapState.getConfig();
        const geoData = this.mapState.getGeoData();
        const miniProjection = this.mapState.getMiniProjection();
        const miniPathGenerator = this.mapState.getMiniPathGenerator();
        const miniSvg = this.mapState.getMiniSvg();
        
        // 适配投影
        miniProjection.fitSize([config.miniWidth, config.miniHeight], geoData);
        
        // 绘制社区边界
        miniSvg.append("g").attr("id", "mini-paths").selectAll("path")
            .data(geoData.features)
            .enter().append("path")
            .attr("d", miniPathGenerator)
            .attr("class", "neighbourhood")
            .style("pointer-events", "none")
            .style("fill", "#e9e9e9")
            .style("stroke", "#999")
            .style("stroke-width", "0.5px");
        
        // 添加可交互的 brush 功能
        this.brush = d3.brush()
            .extent([[0, 0], [config.miniWidth, config.miniHeight]])
            .on("end", (event) => this.handleBrush(event));
        
        miniSvg.append("g").attr("class", "brush").call(this.brush);
        
        // 将brush实例存储到全局以供其他模块使用
        window.minimapBrush = this.brush;
        window.miniMapInstance = this;
    }

    /**
     * 更新小地图可见性（基于缩放级别）
     */
    updateVisibility() {
        const config = this.mapState.getConfig();
        const currentZoom = this.mapState.getCurrentZoom();
        const minimapContainer = d3.select("#minimap-container");
        
        if (currentZoom >= config.zoomThreshold) {
            minimapContainer.classed("visible", true);
        } else {
            minimapContainer.classed("visible", false);
        }
    }

    /**
     * 更新小地图的 brush 框位置（跟随主地图缩放/平移）
     */
    updateViewport() {
        const currentTransform = this.mapState.getCurrentTransform();
        if (!currentTransform || !this.brush) return;
        
        const config = this.mapState.getConfig();
        const mainProjection = this.mapState.getMainProjection();
        const miniProjection = this.mapState.getMiniProjection();
        const miniSvg = this.mapState.getMiniSvg();
        
        // 设置标志，表示这是程序化更新
        this.mapState.setUpdatingBrush(true);
        
        // 获取主地图四个角的屏幕坐标
        const corners = [
            [0, 0],
            [config.mainWidth, 0],
            [config.mainWidth, config.mainHeight],
            [0, config.mainHeight]
        ];
        
        // 转换为地理坐标
        const geoCorners = corners.map(([x, y]) => {
            const [origX, origY] = currentTransform.invert([x, y]);
            return mainProjection.invert([origX, origY]);
        });
        
        // 计算地理坐标边界框
        const lons = geoCorners.map(c => c[0]);
        const lats = geoCorners.map(c => c[1]);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        
        // 转换为 minimap 坐标
        const [minX, maxY] = miniProjection([minLon, minLat]);
        const [maxX, minY] = miniProjection([maxLon, maxLat]);
        
        // 更新 brush 选择范围
        const brushSelection = [[minX, minY], [maxX, maxY]];
        miniSvg.select(".brush").call(this.brush.move, brushSelection);
        
        // 重置标志
        setTimeout(() => {
            this.mapState.setUpdatingBrush(false);
        }, 0);
    }

    /**
     * 处理 brush 选择（拖动结束后更新主地图）
     * @param {Object} event - brush 事件
     */
    handleBrush(event) {
        const { selection } = event;
        
        // 如果是程序化更新，不触发地图更新
        if (this.mapState.isUpdatingBrush()) return;
        
        if (selection) {
            const [[x0, y0], [x1, y1]] = selection;
            const config = this.mapState.getConfig();
            const miniProjection = this.mapState.getMiniProjection();
            const mainProjection = this.mapState.getMainProjection();
            const mainSvg = this.mapState.getMainSvg();
            const tooltip = this.mapState.getTooltip();
            
            // 转换为地理坐标
            const [minLon, maxLat] = miniProjection.invert([x0, y0]);
            const [maxLon, minLat] = miniProjection.invert([x1, y1]);
            
            // 计算中心点
            const centerLon = (minLon + maxLon) / 2;
            const centerLat = (minLat + maxLat) / 2;
            
            // 转换为主地图 SVG 坐标
            const [centerX, centerY] = mainProjection([centerLon, centerLat]);
            
            // 获取当前 transform
            let current = this.mapState.getCurrentTransform() || d3.zoomTransform(mainSvg.node());
            
            // 保持缩放不变，只修改平移量
            const k = current.k;
            const newX = config.mainWidth / 2 - k * centerX;
            const newY = config.mainHeight / 2 - k * centerY;
            
            // 创建新 transform
            const newTransform = d3.zoomIdentity.translate(newX, newY).scale(k);
            
            // 更新状态
            this.mapState.setCurrentTransform(newTransform);
            this.mapState.setCurrentZoom(k);
            this.mapState.setAnimating(true);
            
            // 隐藏 tooltip
            tooltip.classed("hidden", true);
            
            // 应用 transform 到地图元素
            mainSvg.select("#map-paths")
                .transition()
                .duration(config.transitionDuration)
                .attr("transform", newTransform);
            
            mainSvg.select("#restaurant-dots")
                .transition()
                .duration(config.transitionDuration)
                .attr("transform", newTransform);
            
            // 动画结束后更新
            setTimeout(() => {
                this.updateViewport();
                this.mapState.setAnimating(false);
            }, config.transitionDuration);
        }
    }
}

// 为了保持向后兼容性，创建全局函数
let miniMapInstance = null;

function setupMinimap() {
    if (miniMapInstance) {
        miniMapInstance.setup();
    }
}

function updateMinimapVisibility() {
    if (miniMapInstance) {
        miniMapInstance.updateVisibility();
    }
}

function updateMinimapViewport() {
    if (miniMapInstance) {
        miniMapInstance.updateViewport();
    }
}

function handleBrush(event) {
    if (miniMapInstance) {
        miniMapInstance.handleBrush(event);
    }
}