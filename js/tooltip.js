// tooltip.js - Tooltip management class

/**
 * Tooltip class - Manages tooltip display, positioning and timing control
 */
class Tooltip {
    constructor(mapStateInstance) {
        this.mapState = mapStateInstance;
        this.tooltipShowTimeout = null;
        this.tooltipHideTimeout = null;
    }

    /**
     * Show tooltip
     * @param {Event} event - Mouse event
     * @param {Object} d - Restaurant data
     */
    show(event, d) {
        console.log("🔧 Tooltip.show called", !!d, !!event);
        
        if (this.mapState.getIsAnimating()) {
            console.log("🔧 Tooltip.show: Animation in progress, skipping");
            return;
        }

        // Clear any pending hide operations
        if (this.tooltipHideTimeout) {
            clearTimeout(this.tooltipHideTimeout);
            this.tooltipHideTimeout = null;
        }
        // Clear any pending show operations to handle rapid movement
        if (this.tooltipShowTimeout) {
            clearTimeout(this.tooltipShowTimeout);
        }

        // Delayed display to prevent flickering when moving rapidly over multiple points
        this.tooltipShowTimeout = setTimeout(() => {
            const tooltip = this.mapState.getTooltip();
            const config = this.mapState.getConfig();

            tooltip.classed("hidden", false)
                .html(`
                    <div style="min-width: 250px;">
                        <h3 style="margin: 0 0 10px 0; border-bottom: 2px solid #007bff; padding-bottom: 5px;">
                            ${d["Establishment Name"]}
                        </h3>
                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 5px 10px; font-size: 13px;">
                            <strong>Type:</strong> <span>${d["Establishment Type"]}</span>
                            <strong>Status:</strong> 
                            <span style="color: ${d["Establishment Status"] === "Pass" ? "#27ae60" : 
                                                   d["Establishment Status"] === "Conditional Pass" ? "#f39c12" : "#c0392b"}; font-weight: bold;">
                                ${d["Establishment Status"]}
                            </span>
                            <strong>Health Score:</strong>
                            <span style="font-weight: bold; color: ${d.healthScore >= 90 ? "#27ae60" : 
                                                                      d.healthScore >= 70 ? "#f39c12" : "#e74c3c"};">
                                ${d.healthScore}/100
                            </span>
                            <strong>Health Grade:</strong>
                            <span style="font-weight: bold; font-size: 16px; color: ${config.healthGradeColors[d.healthGrade]};">
                                ${d.healthGrade}
                            </span>
                            ${d.yelpMatch ? `
                                <strong>Yelp Rating:</strong> 
                                <span>${"⭐".repeat(Math.round(+d.yelpMatch.avg_rating))} ${d.yelpMatch.avg_rating}</span>
                                <strong>Reviews:</strong> 
                                <span>${d.yelpMatch.num_of_reviews}</span>
                            ` : '<strong>Yelp Data:</strong> <span style="color: #95a5a6;">Not Available</span>'}
                        </div>
                    </div>
                `);
            
            this.move(event);
        }, 50); // 50ms延迟，足够过滤掉快速划过的事件
    }

    /**
     * 显示自定义内容的 tooltip
     * @param {Event} event - 鼠标事件
     * @param {string} content - HTML 内容
     */
    showCustom(event, content) {
        if (this.mapState.getIsAnimating()) return;
        
        // 清除任何待执行的隐藏操作
        if (this.tooltipHideTimeout) {
            clearTimeout(this.tooltipHideTimeout);
            this.tooltipHideTimeout = null;
        }
        // 清除任何待执行的显示操作
        if (this.tooltipShowTimeout) {
            clearTimeout(this.tooltipShowTimeout);
            this.tooltipShowTimeout = null;
        }
        
        const tooltip = this.mapState.getTooltip();
        tooltip.classed("hidden", false).html(content);
        
        this.move(event);
    }

    /**
     * 移动 tooltip 位置（智能定位，避免遮挡）
     * @param {Event} event - 鼠标事件
     */
    move(event) {
        const tooltip = this.mapState.getTooltip();
        const tooltipNode = tooltip.node();
        if (!tooltipNode) return;

        const tooltipWidth = tooltipNode.offsetWidth;
        const tooltipHeight = tooltipNode.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        let offsetX = 20;
        let offsetY = 20;
        
        let left = event.pageX + offsetX;
        let top = event.pageY + offsetY;

        // 如果右侧空间不够，放在左侧
        if (left + tooltipWidth > windowWidth - 10) {
            left = event.pageX - tooltipWidth - offsetX;
        }
        
        // 如果下方空间不够，放在上方
        if (top + tooltipHeight > windowHeight - 10) {
            top = event.pageY - tooltipHeight - offsetY;
        }
        
        // 确保不超出左边界和上边界
        left = Math.max(10, left);
        top = Math.max(10, top);
        
        tooltip.style("left", left + "px")
               .style("top", top + "px");
    }

    /**
     * 隐藏 tooltip（带延迟）
     */
    hide() {
        const config = this.mapState.getConfig();

        // 清除任何待执行的显示操作
        if (this.tooltipShowTimeout) {
            clearTimeout(this.tooltipShowTimeout);
            this.tooltipShowTimeout = null;
        }
        // 如果已经有隐藏操作在等待，则不重复设置
        if (this.tooltipHideTimeout) {
            return;
        }
        
        // 延迟隐藏，避免快速移动时闪烁
        this.tooltipHideTimeout = setTimeout(() => {
            this.mapState.getTooltip().classed("hidden", true);
            this.tooltipHideTimeout = null; // 清除ID
        }, config.tooltipDelay);
    }

    /**
     * 立即隐藏 tooltip（无延迟）
     */
    hideImmediate() {
        // 清除所有定时器
        if (this.tooltipShowTimeout) {
            clearTimeout(this.tooltipShowTimeout);
            this.tooltipShowTimeout = null;
        }
        if (this.tooltipHideTimeout) {
            clearTimeout(this.tooltipHideTimeout);
            this.tooltipHideTimeout = null;
        }
        
        this.mapState.getTooltip().classed("hidden", true);
    }
}

// 为了保持向后兼容性，创建全局实例和函数
let tooltipInstance = null;

// 初始化函数，需要在MapState创建后调用
function initTooltip(mapStateInstance) {
    console.log("🔧 初始化 Tooltip，mapState:", !!mapStateInstance);
    tooltipInstance = new Tooltip(mapStateInstance);
    console.log("🔧 Tooltip 实例创建成功:", !!tooltipInstance);
    return tooltipInstance;
}

// 向后兼容的全局函数
function showTooltip(event, d) {
    if (tooltipInstance) {
        tooltipInstance.show(event, d);
    }
}

function showCustomTooltip(event, content) {
    if (tooltipInstance) {
        tooltipInstance.showCustom(event, content);
    }
}

function moveTooltip(event) {
    if (tooltipInstance) {
        tooltipInstance.move(event);
    }
}

function hideTooltip() {
    if (tooltipInstance) {
        tooltipInstance.hide();
    }
}