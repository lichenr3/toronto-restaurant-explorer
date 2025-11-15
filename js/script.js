// Load data and initialize map
loadData()
    .then(({ geo, mergedData }) => {
        console.log(`✓ Loaded ${mergedData.length} restaurants and ${geo.features.length} neighbourhoods`);
        
        // Initialize map
        initMap(geo, mergedData);
        
        console.log("✓ Map initialization complete!");
    })
    .catch(error => {
        console.error("❌ Loading failed:", error);
        alert("Data loading failed, please refresh and try again");
    });
