// cards.js - Handles card page rendering and pagination

// Configuration
const ITEMS_PER_PAGE = 12;
let currentPage = 1;
let allRestaurants = [];
let filteredRestaurants = [];

// Filter and sort state
let currentFilters = {
    establishmentType: 'all',
    yelpOnly: true, // Default to show only restaurants with Yelp links
    sortBy: 'name' // name, healthScore, yelpRating
};

// Initialize cards page
function initCards() {
    // Get data from sessionStorage
    const restaurantsJSON = sessionStorage.getItem('selectedRestaurants');
    const neighbourhoodName = sessionStorage.getItem('selectedNeighbourhood');

    if (restaurantsJSON && neighbourhoodName) {
        allRestaurants = JSON.parse(restaurantsJSON);
        
        // Initialize filter controls
        initFilters();
        
        // Apply initial filters
        applyFiltersAndSort();
    } else {
        document.getElementById('page-title').textContent = 'No neighbourhood selected';
        document.getElementById('cards').innerHTML = 
            '<p class="no-results">Please select a neighbourhood from the map first.</p>';
    }
}

// Initialize filter controls
function initFilters() {
    // Get all unique restaurant types
    const types = [...new Set(allRestaurants.map(r => r["Establishment Type"]))].sort();
    
    // Populate restaurant type options
    const typeSelect = document.getElementById('type-filter');
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
    });
    
    // Bind events
    document.getElementById('type-filter').addEventListener('change', handleFilterChange);
    document.getElementById('sort-filter').addEventListener('change', handleFilterChange);
    document.getElementById('yelp-only-filter').addEventListener('change', handleFilterChange);
    
    // Set initial state
    document.getElementById('yelp-only-filter').checked = currentFilters.yelpOnly;
}

// Handle filter changes
function handleFilterChange() {
    currentFilters.establishmentType = document.getElementById('type-filter').value;
    currentFilters.sortBy = document.getElementById('sort-filter').value;
    currentFilters.yelpOnly = document.getElementById('yelp-only-filter').checked;
    
    currentPage = 1; // Reset to first page
    applyFiltersAndSort();
}

// Generate no results message
function getNoResultsMessage() {
    return `
        <div class="no-results-container">
            <h3>No restaurants found</h3>
            <p>Sorry, no restaurants match your current search criteria.</p>
        </div>
    `;
}

// Apply filters and sorting
function applyFiltersAndSort() {
    // Apply filters
    filteredRestaurants = allRestaurants.filter(restaurant => {
        // Type filter
        if (currentFilters.establishmentType !== 'all' && 
            restaurant["Establishment Type"] !== currentFilters.establishmentType) {
            return false;
        }
        
        // Yelp filter
        if (currentFilters.yelpOnly && !restaurant.yelpMatch) {
            return false;
        }
        
        return true;
    });
    
    // Apply sorting
    filteredRestaurants.sort((a, b) => {
        switch (currentFilters.sortBy) {
            case 'healthScore':
                return (b.healthScore || 0) - (a.healthScore || 0);
            case 'yelpRating':
                const aRating = a.yelpMatch ? parseFloat(a.yelpMatch.avg_rating) : 0;
                const bRating = b.yelpMatch ? parseFloat(b.yelpMatch.avg_rating) : 0;
                return bRating - aRating;
            case 'name':
            default:
                return a["Establishment Name"].localeCompare(b["Establishment Name"]);
        }
    });
    
    // Update title
    const neighbourhoodName = sessionStorage.getItem('selectedNeighbourhood');
    document.getElementById('page-title').textContent = 
        `${filteredRestaurants.length} of ${allRestaurants.length} Restaurant${filteredRestaurants.length !== 1 ? 's' : ''} in ${neighbourhoodName}`;
    
    // Render results
    if (filteredRestaurants.length === 0) {
        const noResultsMessage = getNoResultsMessage();
        document.getElementById('cards').innerHTML = noResultsMessage;
        document.getElementById('pagination').style.display = 'none';
    } else {
        renderPage(currentPage);
        renderPagination();
    }
}

// Render cards for current page
function renderPage(page) {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageRestaurants = filteredRestaurants.slice(startIndex, endIndex);

    // Get container element
    const container = document.getElementById('cards');
    container.innerHTML = '';

    // Create and add cards for each restaurant
    pageRestaurants.forEach((resto, index) => {
        const card = createCard(resto);
        container.appendChild(card);
        
        // Add progressive loading animation
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Create individual card (using D3.js)
function createCard(resto) {
    // Create card container using D3
    const cardSelection = d3.create("div")
        .attr("class", "card")
        .style("opacity", 0)
        .style("transform", "translateY(10px)")
        .style("transition", "opacity 0.3s ease, transform 0.3s ease");

    // Add hover effects
    cardSelection
        .on("mouseenter", function() {
            d3.select(this)
                .transition()
                .duration(200)
                .style("transform", "translateY(-3px)")
                .style("box-shadow", "0 8px 16px rgba(0,0,0,0.12)");
        })
        .on("mouseleave", function() {
            d3.select(this)
                .transition()
                .duration(200)
                .style("transform", "translateY(0)")
                .style("box-shadow", "0 4px 12px rgba(0,0,0,0.08)");
        });

    // Card body
    const cardBody = cardSelection.append("div")
        .attr("class", "card-body");

    // Restaurant name
    cardBody.append("h3")
        .text(resto["Establishment Name"]);

    // Address
    cardBody.append("p")
        .attr("class", "address")
        .text(resto["Establishment Address"]);

    // Information grid
    const infoGrid = cardBody.append("div")
        .attr("class", "info-grid");

    // Status information
    const statusItem = infoGrid.append("div")
        .attr("class", "info-item");
    
    statusItem.append("div")
        .attr("class", "label")
        .text("Status");
    
    const statusValue = statusItem.append("div")
        .attr("class", "value");
    
    let statusClass = 'status-pass';
    if (resto["Establishment Status"] === "Conditional Pass") {
        statusClass = 'status-conditional';
    } else if (resto["Establishment Status"] === "Closed") {
        statusClass = 'status-closed';
    }
    
    statusValue.append("span")
        .attr("class", statusClass)
        .text(resto["Establishment Status"]);

    // Health score
    const healthItem = infoGrid.append("div")
        .attr("class", "info-item");
    
    healthItem.append("div")
        .attr("class", "label")
        .text("Health Score");
    
    const healthColor = resto.healthScore >= 90 ? '#27ae60' : 
                       resto.healthScore >= 70 ? '#f39c12' : '#e74c3c';
    
    healthItem.append("div")
        .attr("class", "value")
        .style("color", healthColor)
        .style("font-weight", "bold")
        .text(`${resto.healthScore}/100`);

    // Restaurant type
    const typeItem = infoGrid.append("div")
        .attr("class", "info-item");
    
    typeItem.append("div")
        .attr("class", "label")
        .text("Type");
    
    typeItem.append("div")
        .attr("class", "value")
        .style("font-size", "11px")
        .text(resto["Establishment Type"]);

    // Yelp rating
    const yelpItem = infoGrid.append("div")
        .attr("class", "info-item");
    
    yelpItem.append("div")
        .attr("class", "label")
        .text("Yelp Rating");
    
    const yelpValue = yelpItem.append("div")
        .attr("class", "value");
    
    if (resto.yelpMatch) {
        yelpValue.text(`⭐ ${resto.yelpMatch.avg_rating}`);
    } else {
        yelpValue.append("span")
            .style("color", "#999")
            .style("font-size", "12px")
            .text("N/A");
    }

    // Inspection details
    if (resto["Infraction Details"]) {
        const details = cardBody.append("details");
        
        details.append("summary")
            .text("Inspection Details");
        
        details.append("p")
            .style("margin", "8px 0 4px 0")
            .html(`<strong>Date:</strong> ${resto["Inspection Date"]}`);
        
        const severityColor = resto.worstSeverity === 'C' ? '#c0392b' : 
                             resto.worstSeverity === 'S' ? '#f39c12' : 
                             resto.worstSeverity === 'M' ? '#3498db' : '#27ae60';
        
        const severityText = resto.worstSeverity === 'C' ? 'Crucial' : 
                            resto.worstSeverity === 'S' ? 'Significant' : 
                            resto.worstSeverity === 'M' ? 'Minor' : 'Clean';
        
        details.append("p")
            .style("margin", "4px 0")
            .html(`<strong>Severity:</strong> <span style="color: ${severityColor};">${severityText}</span>`);
        
        details.append("p")
            .style("margin", "4px 0")
            .text(resto["Infraction Details"].substring(0, 120) + "...");
    } else {
        cardBody.append("p")
            .style("text-align", "center")
            .style("color", "#27ae60")
            .style("margin-top", "10px")
            .style("font-size", "12px")
            .style("font-weight", "500")
            .text("✓ No infractions");
    }

    // Yelp link
    if (resto.yelpMatch && resto.yelpMatch["Restaurant Yelp URL"]) {
        const cardFooter = cardSelection.append("div")
            .attr("class", "card-footer");
        
        cardFooter.append("a")
            .attr("href", resto.yelpMatch["Restaurant Yelp URL"])
            .attr("class", "yelp-button")
            .attr("target", "_blank")
            .text("View on Yelp");
    }

    // Set directly to visible, remove animations that might cause transparency
    cardSelection.style("opacity", 1);

    return cardSelection.node();
}

// Render pagination controls
function renderPagination() {
    const totalPages = Math.ceil(filteredRestaurants.length / ITEMS_PER_PAGE);
    
    if (totalPages <= 1) {
        document.getElementById('pagination').style.display = 'none';
        return;
    }

    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';
    paginationContainer.style.display = 'flex';

    // Previous page
    const prevButton = document.createElement('button');
    prevButton.textContent = '← Previous';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => goToPage(currentPage - 1);
    paginationContainer.appendChild(prevButton);

    // Page number information
    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    paginationContainer.appendChild(pageInfo);

    // Page number buttons (show maximum 5)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = i === currentPage ? 'active' : '';
        pageButton.onclick = () => goToPage(i);
        paginationContainer.appendChild(pageButton);
    }

    // Next page
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next →';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => goToPage(currentPage + 1);
    paginationContainer.appendChild(nextButton);
}

// Jump to specified page
function goToPage(page) {
    const totalPages = Math.ceil(allRestaurants.length / ITEMS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderPage(currentPage);
    renderPagination();
}

// Initialize when page loads
initCards();
