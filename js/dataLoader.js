// dataLoader.js - Data loading and processing class

/**
 * DataLoader class - Responsible for loading and processing data
 */
class DataLoader {
    constructor() {
        // Configuration: sample size (set to null to use all data)
        this.SAMPLE_SIZE = 15000;  // After filtering there are ~100k records, can increase sampling appropriately
        
        // Define actual restaurant types (excluding supermarkets, convenience stores, etc.)
        this.RESTAURANT_TYPES = new Set([
            'Restaurant',                           // Restaurant (main type)
            'Food Take Out',                        // Takeout restaurant
            'Food Court Vendor',                    // Food court vendor
            'Cocktail Bar / Beverage Room',        // Bar/cocktail lounge
            'Banquet Facility',                     // Banquet hall
            'Cafeteria - Public Access',            // Public cafeteria
            'Private Club',                         // Private club
            'Mobile Food Preparation Premises',     // Mobile food truck
            'Hot Dog Cart',                         // Hot dog cart
            'Ice Cream / Yogurt Vendors',          // Ice cream shop
            'Refreshment Stand (Stationary)',       // Snack stand
            'Food Cart',                            // Food cart
            'Catering Vehicle',                     // Catering vehicle
            'Chartered Cruise Boats',               // Cruise dining
        ]);
    }

    /**
     * Randomly sample array
     * @param {Array} array - Array to sample from
     * @param {number} sampleSize - Sample size
     * @returns {Array} Sampled array
     */
    randomSample(array, sampleSize) {
        if (!sampleSize || sampleSize >= array.length) {
            return array;  // No sampling or sample size greater than array, return all
        }
        
        // Partial implementation of Fisher-Yates shuffle (only shuffle first sampleSize items)
        const result = [...array];
        for (let i = 0; i < sampleSize; i++) {
            const j = i + Math.floor(Math.random() * (result.length - i));
            [result[i], result[j]] = [result[j], result[i]];
        }
        
        return result.slice(0, sampleSize);
    }

    /**
     * Calculate health score
     * @param {Object} restaurant - Restaurant data
     * @returns {number} Health score
     */
    calculateHealthScore(restaurant) {
        let score = 100;
        if (restaurant["Establishment Status"] === "Closed") score -= 100;
        else if (restaurant["Establishment Status"] === "Conditional Pass") score -= 30;
        
        const severity = restaurant.Severity || "";
        if (severity.includes("C - Crucial")) score -= 40;
        else if (severity.includes("S - Significant")) score -= 20;
        else if (severity.includes("M - Minor")) score -= 10;
        
        return Math.max(0, score);
    }

    getWorstSeverity(restaurant) {
        const severity = restaurant.Severity || "";
        if (severity.includes("C - Crucial")) return "C";
        if (severity.includes("S - Significant")) return "S";
        if (severity.includes("M - Minor")) return "M";
        return "clean";
    }

    getHealthGrade(healthScore) {
        if (healthScore >= 90) return "A";
        if (healthScore >= 75) return "B";
        if (healthScore >= 60) return "C";
        return "D";
    }

    processData(dinesafeJson, yelpData) {
        console.log(`📊 Raw data: ${dinesafeJson.length} records`);
        
        // 🍽️ Step 1: Filter out actual restaurants (excluding supermarkets, convenience stores, schools, etc.)
        const restaurantsOnly = dinesafeJson.filter(d => {
            const type = d["Establishment Type"];
            return this.RESTAURANT_TYPES.has(type);
        });
        console.log(`🍽️  Filter restaurant types: ${restaurantsOnly.length} records (keeping ${(restaurantsOnly.length / dinesafeJson.length * 100).toFixed(1)}%)`);
        
        // 🎯 Step 2: Random sampling to reduce data volume
        const sampledDinesafe = this.randomSample(restaurantsOnly, this.SAMPLE_SIZE);
        console.log(`Sampled data: ${sampledDinesafe.length} records (sampled ${((sampledDinesafe.length / restaurantsOnly.length) * 100).toFixed(1)}% from restaurants)`);
        
        // Validate yelpData is an array
        if (!Array.isArray(yelpData)) {
            console.warn("yelpData is not an array, using empty array:", yelpData);
            yelpData = [];
        }
        
        // Generate simulated Yelp ratings
        yelpData.forEach(d => {
            if (!d.avg_rating) {
                const nameLength = d["Restaurant Name"] ? d["Restaurant Name"].length : 10;
                d.avg_rating = (3.0 + (nameLength % 15) / 10).toFixed(1);
                d.num_of_reviews = 5 + (nameLength % 100);
            }
        });

        // Create Yelp lookup table - using native Map
        const yelpLookup = new Map();
        console.log("🔍 Creating Yelp lookup table, yelpData length:", yelpData.length);
        
        yelpData.forEach(yelpRest => {
            if (yelpRest && yelpRest["Restaurant Name"]) {
                const key = yelpRest["Restaurant Name"].trim().toLowerCase();
                if (!yelpLookup.has(key)) {
                    yelpLookup.set(key, yelpRest);
                }
            }
        });
        
        // Merge data and add calculated fields
        return sampledDinesafe.map(dinesafeRest => {
            let yelpMatch = null;
            if (dinesafeRest["Establishment Name"]) {
                const key = dinesafeRest["Establishment Name"].trim().toLowerCase();
                yelpMatch = yelpLookup.get(key);
            }
            const healthScore = this.calculateHealthScore(dinesafeRest);
            return { 
                ...dinesafeRest, 
                yelpMatch,
                healthScore: healthScore,
                healthGrade: this.getHealthGrade(healthScore),
                worstSeverity: this.getWorstSeverity(dinesafeRest)
            };
        }).filter(d => d["Latitude"] && d["Longitude"]);
    }

    /**
     * Main function: Load data (with caching)
     * @returns {Promise<Object>} Object containing geo and mergedData
     */
    async loadData() {
        // Check cache
        const cachedGeoData = sessionStorage.getItem('cachedGeoData');
        const cachedDinesafeData = sessionStorage.getItem('cachedDinesafeData');
        const cachedYelpData = sessionStorage.getItem('cachedYelpData');

        if (cachedGeoData && cachedDinesafeData && cachedYelpData) {
            console.log("✓ Loading data from cache...");
            const geo = JSON.parse(cachedGeoData);
            const dinesafeJson = JSON.parse(cachedDinesafeData);
            const yelpData = JSON.parse(cachedYelpData);
            
            console.log("✓ Processing cached data...");
            const mergedData = this.processData(dinesafeJson, yelpData);
            return { geo, mergedData };
        } else {
            console.log("⟳ Loading data from files...");
            const [geo, dinesafeJson, yelpData] = await Promise.all([
                d3.json("data/Neighbourhoods.geojson"),
                d3.json("data/Dinesafe.json"),
                d3.csv("data/yelp_data.csv")
            ]);
            
            console.log("✓ Data loading complete, processing...");
            
            // Cache raw data
            try {
                sessionStorage.setItem('cachedGeoData', JSON.stringify(geo));
                sessionStorage.setItem('cachedDinesafeData', JSON.stringify(dinesafeJson));
                sessionStorage.setItem('cachedYelpData', JSON.stringify(yelpData));
                console.log("✓ Data cached");
            } catch (e) {
                console.warn("⚠ Caching failed:", e.message);
            }
            
            const mergedData = this.processData(dinesafeJson, yelpData);
            return { geo, mergedData };
        }
    }
}

// For backward compatibility, create global instance and function
const dataLoader = new DataLoader();
const loadData = () => dataLoader.loadData();