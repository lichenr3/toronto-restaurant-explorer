console.log("Starting advanced visualization with minimap and brush...");

// --- 1. Setup ---
const mainWidth = 900, mainHeight = 600;
const miniWidth = 200, miniHeight = 150;

const mainSvg = d3.select("#map-container").append("svg").attr("width", mainWidth).attr("height", mainHeight);
const miniSvg = d3.select("#minimap-container").append("svg").attr("width", miniWidth).attr("height", miniHeight);

const mainProjection = d3.geoMercator();
const miniProjection = d3.geoMercator();

const mainPathGenerator = d3.geoPath().projection(mainProjection);
const miniPathGenerator = d3.geoPath().projection(miniProjection);

const tooltip = d3.select("#tooltip");
const colorScale = d3.scaleThreshold().domain([3, 4, 4.5]).range(["#e74c3c", "#f1c40f", "#2ecc71", "#1abc9c"]);
const radiusScale = d3.scaleSqrt().domain([1, 1000]).range([2.5, 15]).clamp(true);

let geoData, mergedData; // Make data globally accessible within the scope

// --- 2. Load Data ---
Promise.all([
    d3.json("data/Neighbourhoods.geojson"),
    d3.json("data/Dinesafe.json"),
    d3.csv("data/yelp_data.csv")
]).then(([geo, dinesafeJson, yelpData]) => {
    geoData = geo;

    // --- 3. Data Pre-processing & Fusion ---
    // This is where we simulate the missing data for the Yelp dataset
    yelpData.forEach(d => {
        if (!d.avg_rating) {
            const nameLength = d["Restaurant Name"] ? d["Restaurant Name"].length : 10;
            d.avg_rating = (3.0 + (nameLength % 15) / 10).toFixed(1);
            d.num_of_reviews = 5 + (nameLength % 100);
        }
    });

    // Fuse Dinesafe and Yelp data
    const dinesafeRestaurants = dinesafeJson;
    const yelpLookup = new Map();
    yelpData.forEach(yelpRest => {
        if (yelpRest["Restaurant Name"]) {
            const key = yelpRest["Restaurant Name"].trim().toLowerCase();
            if (!yelpLookup.has(key)) yelpLookup.set(key, yelpRest);
        }
    });
    mergedData = dinesafeRestaurants.map(dinesafeRest => {
        let yelpMatch = null;
        if (dinesafeRest["Establishment Name"]) {
            const key = dinesafeRest["Establishment Name"].trim().toLowerCase();
            yelpMatch = yelpLookup.get(key);
        }
        return { ...dinesafeRest, yelpMatch };
    }).filter(d => d["Latitude"] && d["Longitude"]);

    // --- 4. Initial Drawing ---
    initializeMaps();
    updateMap();

}).catch(error => console.error("Error:", error));

function initializeMaps() {
    // Draw the minimap and set up the brush
    miniProjection.fitSize([miniWidth, miniHeight], geoData);
    miniSvg.append("g").selectAll("path").data(geoData.features).enter().append("path").attr("d", miniPathGenerator).attr("class", "neighbourhood").style("pointer-events", "none");
    
    const brush = d3.brush().extent([[0, 0], [miniWidth, miniHeight]]).on("end", brushed);
    miniSvg.append("g").attr("class", "brush").call(brush);

    // Create groups for map paths and restaurant dots in the main map
    mainSvg.append("g").attr("id", "map-paths");
    mainSvg.append("g").attr("id", "restaurant-dots");
}

function updateMap(selectionGeo = null) {
    // --- 5. Update Main Projection based on brush ---
    // This is the restored, stable zooming logic
    if (selectionGeo) {
        mainProjection.fitExtent([[0, 0], [mainWidth, mainHeight]], {
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                geometry: {
                    type: "MultiPoint",
                    coordinates: selectionGeo
                }
            }]
        });
    } else {
        mainProjection.fitSize([mainWidth, mainHeight], geoData);
    }

    // Redraw map paths for the new projection with click events
    const paths = mainSvg.select("#map-paths").selectAll("path").data(geoData.features, d => d.properties.AREA_NAME);

    paths.join("path")
        .attr("d", mainPathGenerator)
        .attr("class", "neighbourhood")
        .style("cursor", "pointer") // Add a pointer cursor to indicate it's clickable
        .on("mouseover", function(event, d) {
            d3.select(this).style("fill", "#a9a9a9"); // Darken neighbourhood on hover
        })
        .on("mouseout", function(event, d) {
            d3.select(this).style("fill", "#e0e0e0"); // Revert to original color on mouse out
        })
        .on("click", (event, d) => {
            // 'd' is the GeoJSON feature for the clicked neighbourhood
            const neighbourhoodPolygon = d;
            const neighbourhoodName = d.properties.AREA_NAME;

            // Filter restaurants that are inside the clicked polygon
            const restaurantsInNeighbourhood = mergedData.filter(resto => {
                const point = [+resto.Longitude, +resto.Latitude];
                // d3.geoContains checks if a polygon contains a point
                return d3.geoContains(neighbourhoodPolygon, point);
            });

            // Store the filtered data in sessionStorage to pass to the next page
            sessionStorage.setItem('selectedRestaurants', JSON.stringify(restaurantsInNeighbourhood));
            sessionStorage.setItem('selectedNeighbourhood', neighbourhoodName);

            // Redirect to the card view page
            window.location.href = 'card_mockup.html';
        });
    
    // --- 6. Filter and Update Dots ---
    const statusFilter = d3.select("#status-filter").property("value");
    const ratingFilter = +d3.select("#rating-filter").property("value");
    const priceFilter = d3.select("#price-filter").property("value");

    const filteredData = mergedData.filter(d => {
        const statusMatch = statusFilter === 'all' || d["Establishment Status"] === statusFilter;
        const hasYelpData = d.yelpMatch;
        const ratingMatch = !hasYelpData ? ratingFilter === 0 : +d.yelpMatch.avg_rating >= ratingFilter;
        const priceMatch = priceFilter === 'all' || (hasYelpData && d.yelpMatch["Restaurant Price Range"] === priceFilter);
        
        if (ratingFilter === 0) {
             return statusMatch && priceMatch;
        }
        return statusMatch && ratingMatch && priceMatch;
    });

    mainSvg.select("#restaurant-dots").selectAll("circle").data(filteredData, d => d["unique_id"])
        .join("circle")
        .attr("class", "restaurant")
        .attr("cx", d => mainProjection([+d["Longitude"], +d["Latitude"]])[0])
        .attr("cy", d => mainProjection([+d["Longitude"], +d["Latitude"]])[1])
        .attr("r", d => d.yelpMatch ? radiusScale(+d.yelpMatch.num_of_reviews) : 2)
        .style("fill", d => d.yelpMatch ? colorScale(+d.yelpMatch.avg_rating) : "#cccccc")
        .on("mouseover", (event, d) => {
            tooltip.classed("hidden", false)
                .html(`
                    <strong>${d["Establishment Name"]}</strong><br>
                    Dinesafe Status: ${d["Establishment Status"]}<br>
                    ${d.yelpMatch ? 
                    `Yelp Rating: ${d.yelpMatch.avg_rating} (${d.yelpMatch.num_of_reviews} reviews)<br>
                     Price: ${d.yelpMatch["Restaurant Price Range"]}` 
                     : 'No Yelp Info'}
                `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", () => tooltip.classed("hidden", true));
}

function brushed({ selection }) {
    // This is the restored, stable brushing logic
    if (selection) {
        const [[x0, y0], [x1, y1]] = selection;
        // Convert pixel coordinates back to geographic coordinates
        const geoCoords = [miniProjection.invert([x0, y0]), miniProjection.invert([x1, y1])];
        updateMap(geoCoords);
    } else {
        updateMap(null); // Reset zoom if brush is cleared
    }
}

// Attach event listeners to filters
d3.selectAll("select").on("change", () => {
    // Clear brush selection when a filter is changed to reset the zoom
    miniSvg.select(".brush").call(d3.brush().clear);
    updateMap(null);
});
