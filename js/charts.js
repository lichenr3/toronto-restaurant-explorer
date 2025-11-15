// charts.js - Chart management class

/**
 * Charts class - Handles chart rendering and updates
 */
class Charts {
    constructor() {
        // Chart-related configuration can be added here
    }

    /**
     * Draw line chart showing inspection count over time
     * @param {Array} restaurants - Restaurant data
     */
    drawStatusChart(restaurants) {
        const svg = d3.select("#status-chart");
        svg.selectAll("*").remove();
        
        if (restaurants.length === 0) {
            svg.append("text")
                .attr("x", 160).attr("y", 120)
                .attr("text-anchor", "middle")
                .attr("fill", "#999")
                .attr("font-size", "14px")
                .text("No data available");
            return;
        }
        
        // Group by month and count inspections
        const monthlyData = d3.rollup(
            restaurants,
            v => v.length,
            d => {
                // Try to parse date field
                const dateStr = d["Inspection Date"] || d.date || d["Date"];
                if (dateStr) {
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) {
                        return d3.timeMonth(date);
                    }
                }
                return null;
            }
        );
        
        // Remove data with invalid dates
        monthlyData.delete(null);
        
        if (monthlyData.size === 0) {
            svg.append("text")
                .attr("x", 160).attr("y", 120)
                .attr("text-anchor", "middle")
                .attr("fill", "#999")
                .attr("font-size", "14px")
                .text("No valid date data");
            return;
        }
        
        const data = Array.from(monthlyData, ([date, count]) => ({ date, count }))
            .sort((a, b) => a.date - b.date);
        
        // Chart configuration
        const margin = { top: 20, right: 20, bottom: 50, left: 50 };
        const width = 320 - margin.left - margin.right;
        const height = 240 - margin.top - margin.bottom;
        
        const g = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);
        
        // Scales
        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.date))
            .range([0, width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count)])
            .nice()
            .range([height, 0]);
        
        // Grid lines
        g.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(5).tickSize(-height).tickFormat(''))
            .selectAll("line")
            .attr("stroke", "#eee")
            .attr("stroke-width", 0.5);
        
        g.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(''))
            .selectAll("line")
            .attr("stroke", "#eee")
            .attr("stroke-width", 0.5);
        
        // X axis
        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b %Y")))
            .selectAll("text")
            .attr("font-size", "10px")
            .attr("fill", "#666")
            .style("text-anchor", "end")
            .attr("transform", "rotate(-45)");
        
        // Y axis
        g.append("g")
            .call(d3.axisLeft(y).ticks(5))
            .selectAll("text")
            .attr("font-size", "10px")
            .attr("fill", "#666");
        
        // Create line generator
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.count))
            .curve(d3.curveMonotoneX);
        
        // Create area generator (for gradient fill)
        const area = d3.area()
            .x(d => x(d.date))
            .y0(height)
            .y1(d => y(d.count))
            .curve(d3.curveMonotoneX);
        
        // Gradient definition
        const gradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "area-gradient")
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", 0).attr("y1", height)
            .attr("x2", 0).attr("y2", 0);
        
        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#4f46e5")
            .attr("stop-opacity", 0.1);
        
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#4f46e5")
            .attr("stop-opacity", 0.3);
        
        // Draw area
        g.append("path")
            .datum(data)
            .attr("fill", "url(#area-gradient)")
            .attr("d", area);
        
        // Draw line
        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#4f46e5")
            .attr("stroke-width", 2.5)
            .attr("d", line);
        
        // Draw data points
        g.selectAll(".dot")
            .data(data)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.count))
            .attr("r", 4)
            .attr("fill", "#4f46e5")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                d3.select(this).attr("r", 6);
                const tooltip = d3.select("#tooltip");
                if (!tooltip.empty()) {
                    tooltip.classed("hidden", false)
                        .html(`<strong>${d3.timeFormat("%B %Y")(d.date)}</strong><br/>Inspections: ${d.count}`)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 10) + "px");
                }
            })
            .on("mousemove", function(event) {
                const tooltip = d3.select("#tooltip");
                if (!tooltip.empty()) {
                    tooltip.style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 10) + "px");
                }
            })
            .on("mouseout", function() {
                d3.select(this).attr("r", 4);
                const tooltip = d3.select("#tooltip");
                if (!tooltip.empty()) {
                    tooltip.classed("hidden", true);
                }
            });
        
        // Axis labels
        svg.append("text")
            .attr("x", margin.left + width / 2)
            .attr("y", margin.top + height + 40)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("fill", "#666")
            .text("Time");
        
        svg.append("text")
            .attr("transform", `translate(${15}, ${margin.top + height / 2}) rotate(-90)`)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("fill", "#666")
            .text("Inspection Count");
    }

    /**
     * Draw health grade distribution bar chart
     * @param {Array} restaurants - Restaurant data
     */
    drawRatingChart(restaurants) {
        const svg = d3.select("#health-grade-chart");
        svg.selectAll("*").remove();
        
        if (restaurants.length === 0) {
            svg.append("text")
                .attr("x", 160).attr("y", 120)
                .attr("text-anchor", "middle")
                .attr("fill", "#999")
                .attr("font-size", "14px")
                .text("No data available");
            return;
        }
        
        // Count health grade distribution
        const gradeGroups = d3.rollup(
            restaurants,
            v => v.length,
            d => d.healthGrade || "N/A"
        );
        
        // Ensure all grades have data (sorted by priority)
        const allGrades = ["A", "B", "C", "D", "N/A"];
        const gradeData = allGrades.map(grade => ({
            grade: grade,
            count: gradeGroups.get(grade) || 0,
            percentage: ((gradeGroups.get(grade) || 0) / restaurants.length * 100).toFixed(1)
        })).filter(d => d.count > 0); // Only show grades with data
        
        // Color mapping (A best=green, D worst=red)
        const colorMap = {
            "A": "#10b981", // Green - Excellent
            "B": "#3b82f6", // Blue - Good
            "C": "#f59e0b", // Orange - Fair
            "D": "#ef4444", // Red - Poor
            "N/A": "#94a3b8" // Gray - No data
        };
        
        // Bar chart configuration
        const margin = { top: 20, right: 20, bottom: 35, left: 35 };
        const width = 320 - margin.left - margin.right;
        const height = 240 - margin.top - margin.bottom;
        
        const g = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);
        
        const x = d3.scaleBand()
            .domain(gradeData.map(d => d.grade))
            .range([0, width])
            .padding(0.3);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(gradeData, d => d.count) || 1])
            .nice()
            .range([height, 0]);
        
        // X axis
        g.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("font-size", "12px")
            .attr("font-weight", "600")
            .attr("fill", "#333");
        
        // Y axis
        g.append("g")
            .call(d3.axisLeft(y).ticks(5))
            .selectAll("text")
            .attr("font-size", "10px")
            .attr("fill", "#666");
        
        // Grid lines
        g.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(''))
            .selectAll("line")
            .attr("stroke", "#eee")
            .attr("stroke-width", 0.5);
        
        // Bars
        g.selectAll(".bar")
            .data(gradeData)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.grade))
            .attr("width", x.bandwidth())
            .attr("y", height)
            .attr("height", 0)
            .attr("fill", d => colorMap[d.grade])
            .attr("rx", 4)
            .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))")
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.3))")
                    .attr("opacity", 0.8);
                
                const tooltip = d3.select("#tooltip");
                if (!tooltip.empty()) {
                    tooltip.classed("hidden", false)
                        .html(`<strong>Grade ${d.grade}</strong><br/>Count: ${d.count}<br/>Percentage: ${d.percentage}%`)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 10) + "px");
                }
            })
            .on("mousemove", function(event) {
                const tooltip = d3.select("#tooltip");
                if (!tooltip.empty()) {
                    tooltip.style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 10) + "px");
                }
            })
            .on("mouseout", function() {
                d3.select(this)
                    .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))")
                    .attr("opacity", 1);
                
                const tooltip = d3.select("#tooltip");
                if (!tooltip.empty()) {
                    tooltip.classed("hidden", true);
                }
            })
            .transition()
            .duration(800)
            .delay((d, i) => i * 100)
            .attr("y", d => y(d.count))
            .attr("height", d => height - y(d.count));
        
        // Value labels
        g.selectAll(".label")
            .data(gradeData)
            .enter().append("text")
            .attr("class", "label")
            .attr("x", d => x(d.grade) + x.bandwidth() / 2)
            .attr("y", d => y(d.count) - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .attr("fill", "#333")
            .style("opacity", 0)
            .text(d => `${d.count} (${d.percentage}%)`)
            .transition()
            .duration(600)
            .delay((d, i) => 800 + i * 100)
            .style("opacity", 1);
    }

    /**
     * Draw Cuisine type pie chart
     * @param {Array} restaurants - Restaurant data
     */
    drawCuisineChart(restaurants) {
        const svg = d3.select("#cuisine-chart");
        svg.selectAll("*").remove();
        
        if (restaurants.length === 0) {
            svg.append("text")
                .attr("x", 120).attr("y", 90)
                .attr("text-anchor", "middle")
                .attr("fill", "#999")
                .attr("font-size", "14px")
                .text("No data available");
            return;
        }
        
        // Count Cuisine types
        const cuisineCounts = d3.rollup(
            restaurants,
            v => v.length,
            d => d["Establishment Type"]
        );
        
        // Get top 5 most common types
        const topCuisines = Array.from(cuisineCounts, ([key, value]) => ({
            type: key,
            count: value,
            percentage: ((value / restaurants.length) * 100).toFixed(1)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
        
        // Color scale
        const colorScale = d3.scaleOrdinal()
            .domain(topCuisines.map(d => d.type))
            .range(["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"]);
        
        // Pie chart configuration
        const width = 280, height = 160;
        const radius = Math.min(width, height) / 2 - 20;
        
        const g = svg.append("g")
            .attr("transform", `translate(${width/2}, ${height/2})`);
        
        const pie = d3.pie()
            .value(d => d.count)
            .sort(null);
        
        const arc = d3.arc()
            .innerRadius(radius * 0.6)
            .outerRadius(radius);
        
        const arcHover = d3.arc()
            .innerRadius(radius * 0.6)
            .outerRadius(radius * 1.1);
        
        // Draw pie chart
        const arcs = g.selectAll("path")
            .data(pie(topCuisines))
            .enter().append("path")
            .attr("fill", d => colorScale(d.data.type))
            .attr("stroke", "white")
            .attr("stroke-width", 3)
            .style("cursor", "pointer")
            .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition().duration(200)
                    .attr("d", arcHover)
                    .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.2))");
                
                // Show tooltip
                const tooltipContent = `${d.data.type}<br/>${d.data.count} (${d.data.percentage}%)`;
                const tooltip = d3.select("#tooltip");
                if (!tooltip.empty()) {
                    tooltip.classed("hidden", false)
                        .html(tooltipContent)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 10) + "px");
                }
            })
            .on("mousemove", function(event) {
                const tooltip = d3.select("#tooltip");
                if (!tooltip.empty()) {
                    tooltip.style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 10) + "px");
                }
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition().duration(200)
                    .attr("d", arc)
                    .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");
                
                const tooltip = d3.select("#tooltip");
                if (!tooltip.empty()) {
                    tooltip.classed("hidden", true);
                }
            });
        
        // Animation
        arcs.transition()
            .duration(800)
            .attrTween("d", function(d) {
                const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
                return function(t) { return arc(interpolate(t)); };
            });
        
        // Center text
        g.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "-0.3em")
            .attr("font-size", "24px")
            .attr("font-weight", "bold")
            .attr("fill", "#333")
            .text(topCuisines.reduce((sum, d) => sum + d.count, 0));
        
        g.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "1.2em")
            .attr("font-size", "12px")
            .attr("fill", "#666")
            .text("Top 5");
        
        // Legend - using HTML structure
        const legendContainer = d3.select("#cuisine-legend");
        legendContainer.selectAll("*").remove();
        
        topCuisines.forEach((d, i) => {
            const legendItem = legendContainer.append("div")
                .attr("class", "legend-item");
            
            legendItem.append("div")
                .attr("class", "legend-dot")
                .style("background-color", colorScale(d.type));
            
            legendItem.append("span")
                .text(`${d.type.length > 12 ? d.type.substring(0, 12) + "..." : d.type}: ${d.count}`);
        });
    }
}

// For backward compatibility, create global instance and functions
const charts = new Charts();

// Backward compatible global functions
function drawStatusChart(restaurants) {
    charts.drawStatusChart(restaurants);
}

function drawRatingChart(restaurants) {
    charts.drawRatingChart(restaurants);
}

function drawCuisineChart(restaurants) {
    charts.drawCuisineChart(restaurants);
}