import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

import {magic} from "./graph_viz.js";

let svg, xScale, yScale;
let width, height;
let processedData, maxTime, minRate, maxRate;
let currentView = "categories";
let currentCategory = null;
let currentPatient = null;
let allPatients = [];
let surgeryCategories = [];
let patientsByCategoryId = {};
let selectedCaseID;
// Load data on page load
export async function loadData() {
    try {
        // Use d3.csv directly
        d3.csv("emergency_data/emergency_everything.csv")
            .then(patientData => {
                allPatients = patientData
                    .filter(d => d.optype !== "Others") // Exclude 'Other' category
                    .map(d => ({
                        id: d.case_id,
                        age: +(d.age || 0),
                        max_hr: +(d.max_hr || 0),
                        duration: Math.round(+(d.duration || 0) / 60), // Convert seconds to minutes
                        category: d.optype,
                        sex: d.sex,
                        bmi: +(d.bmi || 0),
                        position: d.position,
                        death_inhosp: d.death_inhosp === "1" ? "Yes" : "No",
                        preop_htn: d.preop_htn === "1" ? "Yes" : "No", 
                        preop_dm: d.preop_dm === "1" ? "Yes" : "No"
                    }));

                // Extract surgery categories
                const categoryMap = {};
                allPatients.forEach(patient => {
                    if (!categoryMap[patient.category]) {
                        categoryMap[patient.category] = {
                            id: patient.category,
                            name: formatCategoryName(patient.category),
                            count: 0
                        };
                    }
                    categoryMap[patient.category].count++;
                });

                surgeryCategories = Object.values(categoryMap);

                // Group patients by category
                patientsByCategoryId = {};
                surgeryCategories.forEach(category => {
                    patientsByCategoryId[category.id] = allPatients.filter(p => p.category === category.id);
                });

                // Initialize visualization
                initVisualization();
            })
            .catch(error => {
                console.error('Error loading data:', error);
                document.querySelector('.loading').textContent = 'Error loading data. Please try again later.';
            });
    } catch (error) {
        console.error('Error initializing data:', error);
        document.querySelector('.loading').textContent = 'Error loading data. Please try again later.';
    }
}

// Create a function to display patient information panel
function displayPatientInfo(patient) {
    // Create or update the info panel
    let infoPanel = d3.select("#patient-info-panel");
    
    if (infoPanel.empty()) {
        // Create the panel if it doesn't exist
        infoPanel = d3.select(".chart-container")
            .append("div")
            .attr("id", "patient-info-panel")
            .style("color", "#a5a2a2")
            .style("display", "flex")
            .style("flex-direction", "column") // Stack elements vertically
            .style("align-items", "center") // Center everything
            .style("margin-top", "50px")
            .style("font-size", "20px")
            .style("padding", "10px")
    }
    
    // Clear existing content
    infoPanel.html("");
    
     // Create a centered container for the patient details (to avoid left shifting)
     const detailsContainer = infoPanel.append("div")
     .style("display", "flex")
     .style("justify-content", "center") // Center the two columns
     .style("width", "60%") // Adjust width so it's balanced
     .style("max-width", "600px") // Prevent it from getting too wide
     .style("gap", "40px"); // Adds space between the columns

 // Create left column
 const leftColumn = detailsContainer.append("div")
     .style("flex", "1")
     .style("text-align", "center"); // Center text inside column

 // Create right column
 const rightColumn = detailsContainer.append("div")
     .style("flex", "1")
     .style("text-align", "center"); // Center text inside column

 // Add info to left column
 leftColumn.html(`
     <div><strong>Case ID:</strong> ${patient.id}</div>
     <div><strong>Sex:</strong> ${patient.sex}</div>
     <div><strong>Age:</strong> ${patient.age}</div>
     <div><strong>BMI:</strong> ${patient.bmi.toFixed(1)}</div>
 `);

 // Add info to right column
 rightColumn.html(`
     <div><strong>Location:</strong> ${patient.position || "Unknown"}</div>
     <div><strong>Mortality:</strong> ${patient.death_inhosp}</div>
     <div><strong>Hypertension:</strong> ${patient.preop_htn}</div>
     <div><strong>Diabetes:</strong> ${patient.preop_dm}</div>
 `);

 // Add footer text centered at the bottom
 infoPanel.append("div")
     .style("margin-top", "15px")
     .style("color", "#dcdcdc")
     .style("font-size", "16px")
     .style("font-style", "italic")
     .style("text-align", "center")
     .text("Click a case for more.");
}

// Hide patient info panel when no patient is selected
function hidePatientInfo() {
    d3.select("#patient-info-panel").style("display", "none");
}

// Show patient info panel
function showPatientInfo() {
    d3.select("#patient-info-panel").style("display", "flex");
}


// Helper to format category names
function formatCategoryName(categoryId) {
    return categoryId
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Load heart rate data for a specific case
async function loadHeartRateData(caseId) {
    try {
        // Use d3.csv directly
        return d3.csv(`heart_rate_data/case_${caseId}.csv`)
            .then(hrData => {
                // Process the data to the format needed by the graph
                return hrData.map((d, i) => ({
                    second: i * 10, // Assuming readings every 10 seconds
                    heartrate: +d['Solar8000/HR']
                })).filter(d => !isNaN(d.heartrate)); // Filter out invalid readings
            })
            .catch(error => {
                console.error(`Error loading heart rate data for case ${caseId}:`, error);
                d3.select("#chart").html('<div class="no-data">No heart rate data available for this patient</div>');
                return [];
            });
    } catch (error) {
        console.error(`Error processing heart rate data for case ${caseId}:`, error);
        d3.select("#chart").html('<div class="no-data">Error processing heart rate data</div>');
        return [];
    }
}

function initVisualization() {
    const visualizationContainer = d3.select("#visualization");

    // Hide chart container initially
    d3.select(".chart-container").style("display", "none");

    // Add fullscreen class to visualization
    visualizationContainer.attr("class", "visualization-fullscreen");
    
    // Remove loading message
    d3.select(".loading").remove();

    // Get container dimensions - make sure to get accurate dimensions
    const containerRect = visualizationContainer.node().getBoundingClientRect();
    width = containerRect.width ;
    height = containerRect.height;
    
    // Create SVG with the full container size
    svg = visualizationContainer
        .append("svg")
        .attr("width", width)
        .attr("height", height);
        
    drawCategoryBubbles();
}

// Update the showCategoryDetail function to include animation
async function showCategoryDetail(category) {
    // Store the original category circle position and radius for animation
    const originalX = category.x;
    const originalY = category.y;
    const originalRadius = category.r;
    
    // Target position (where the large green container circle will be)
    const targetX = width * 0.175;
    const targetY = height * 0.62;
    const targetRadius = Math.min(width, height) * 0.62;
    
    // First create a copy of the clicked bubble for animation
    const animationCircle = svg.append("circle")
        .attr("cx", originalX)
        .attr("cy", originalY)
        .attr("r", originalRadius)
        .attr("fill", "#7ed957")
        .attr("stroke", "none")
        .style("opacity", 0.8)
        .style("pointer-events", "none");
    
    // Hide original content during animation
    svg.selectAll(".bubble").style("opacity", 0);
    
    // Animate the circle
    animationCircle.transition()
        .duration(750)
        .attr("cx", targetX)
        .attr("cy", targetY)
        .attr("r", targetRadius)
        .style("opacity", 0.8)
        .on("end", function() {
            // Show chart container when animation completes
            d3.select(".chart-container").style("display", "block");
            
            // Change visualization class to split mode
            d3.select("#visualization")
                .attr("class", "visualization-split");
            
            // Remove the animation circle
            animationCircle.remove();
            
            // Continue with category detail view setup
            setupCategoryDetailView(category);
        });
}

// Extract the setup functionality into a separate function
async function setupCategoryDetailView(category) {
    // Clear previous content
    svg.selectAll("*").remove();

    // Update the width and height based on new container size
    const visualizationContainer = d3.select("#visualization");
    const containerRect = visualizationContainer.node().getBoundingClientRect();
    width = containerRect.width;
    height = containerRect.height;
    
    // Resize SVG
    svg.attr("width", width)
       .attr("height", height);
    
    // Show loading
    svg.append("text")
        .attr("class", "loading-text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .text("Loading patient data...");
    
    // Get patients for this category
    const patients = patientsByCategoryId[category.data.id];
    
    // Calculate scales
    const ageExtent = d3.extent(patients, d => d.age);
    const hrExtent = d3.extent(patients, d => d.max_hr);
    const durationExtent = d3.extent(patients, d => d.duration);
    
    // Add padding to extents
    ageExtent[0] = Math.max(0, ageExtent[0] - 5);
    ageExtent[1] = ageExtent[1] + 5;
    hrExtent[0] = Math.max(0, hrExtent[0] - 5);
    hrExtent[1] = hrExtent[1] + 5;
    
    // Create scales - age is x-axis, max_hr is y-axis
    const xScale = d3.scaleLinear()
        .domain(ageExtent)
        .range([width * 0.15, width * 0.85]);
    
    const yScale = d3.scaleLinear()
        .domain(hrExtent)
        .range([height * 0.75, height * 0.15]);
    
    const sizeScale = d3.scaleLinear()
        .domain(durationExtent)
        .range([5, 20]);
        
    // Remove loading text
    svg.select(".loading-text").remove();
    
    // Create main container circle
    const circleRadius = Math.min(width, height) * 0.62;
    const containerCircle = svg.append("circle")
        .attr("cx", width * 0.35)
        .attr("cy", height * 0.62)
        .attr("r", circleRadius)
        .attr("fill", "#7ed957")
        .attr("stroke", "#333739")
        .attr("stroke-width", 2)
        .style("opacity", 0.8);
    
    // Define clip path to keep everything inside the green circle
    svg.append("defs")
        .append("clipPath")
        .attr("id", "circle-clip")
        .append("circle")
        .attr("cx", width * 0.33)
        .attr("cy", height * 0.57)
        .attr("r", circleRadius + 35);
        
    // Add category title
    svg.append("text")
        .attr("x", width / 2 - 100)
        .attr("y", height * 0.15)
        .attr("text-anchor", "middle")
        .attr("fill", "#dcdcdc")
        .style("font-size", "38px")
        .style("font-weight", "bold")
        .text(category.data.name);
        
    // Add back button
    const backButtonGroup = svg.append("g")
        .attr("class", "back-button")
        .attr("transform", `translate(${width * 0.05}, ${height * 0.06})`)
        .on("click", drawCategoryBubbles)
        .on("mouseover", function() {
            d3.select(this).select("circle")
                .transition()
                .duration(200)
                .attr("fill", "#7ed957");
            
            d3.select(this).select("text")
                .transition()
                .duration(200)
                .attr("fill", "#363336");
        })
        .on("mouseout", function() {
            d3.select(this).select("circle")
                .transition()
                .duration(200)
                .attr("fill", "#333739");
            
            d3.select(this).select("text")
                .transition()
                .duration(200)
                .attr("fill", "#a5a2a2");
        });
        
    backButtonGroup.append("circle")
        .attr("r", 35)
        .attr("fill", "#333739")
        .attr("stroke", "#292929")
        .attr("stroke-width", 0);
        
    backButtonGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", ".3em")
        .attr("fill", "#a5a2a2")
        .style("font-size", "12px")
        .text("Back");
    
    // Create grid container that will be clipped
    const gridContainer = svg.append("g")
        .attr("clip-path", "url(#circle-clip)")
        .attr("transform", `translate(${width * - 0.05}, ${height * 0.07})`); // Move the entire chart down and left

    // Add grid lines
    // Vertical grid lines (for x-axis)
    const xTicks = xScale.ticks(10);
    gridContainer.selectAll(".vertical-grid")
        .data(xTicks)
        .enter()
        .append("line")
        .attr("class", "vertical-grid")
        .attr("x1", d => xScale(d))
        .attr("y1", height * 0.15)
        .attr("x2", d => xScale(d))
        .attr("y2", height * 0.75)
        .attr("stroke", "white")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.3);
    
    // Horizontal grid lines (for y-axis)
    const yTicks = yScale.ticks(10);
    gridContainer.selectAll(".horizontal-grid")
        .data(yTicks)
        .enter()
        .append("line")
        .attr("class", "horizontal-grid")
        .attr("x1", width * 0.15)
        .attr("y1", d => yScale(d))
        .attr("x2", width * 0.85)
        .attr("y2", d => yScale(d))
        .attr("stroke", "white")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.3);
    
    // Add x-axis with axis bar
    const xAxis = d3.axisBottom(xScale)
        .ticks(10)
        .tickSize(5);
        
    gridContainer.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height * 0.75})`)
        .call(xAxis)
        .attr("color", "#dcdcdc")
        .style("font-size", "10px");
    
    // Add y-axis with axis bar
    const yAxis = d3.axisLeft(yScale)
        .ticks(10)
        .tickSize(5);
        
    gridContainer.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${width * 0.15}, 0)`)
        .call(yAxis)
        .attr("color", "#dcdcdc")
        .style("font-size", "10px");
    
    // Style the axes paths and lines
    gridContainer.selectAll(".x-axis path, .y-axis path, .x-axis line, .y-axis line")
        .attr("stroke", "#dcdcdc")
        .style("opacity", 0.5)
        .attr("stroke-width", 1.5);
        
    // Add x-axis label
    svg.append("text")
        .attr("x", width / 2 - 30)
        .attr("y", height * 0.90)
        .attr("text-anchor", "middle")
        .attr("fill", "#dcdcdc")
        .style("font-size", "14px")
        .style("opacity", 0.9)
        .text("Patient Age");
        
    // Add y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", width * 0.04)
        .attr("text-anchor", "middle")
        .attr("fill", "#dcdcdc")
        .style("font-size", "14px")
        .style("opacity", 0.8)
        .text("Max Heart Rate (bpm)");

    const sortedPatients = [...patients].sort((a, b) => 
        sizeScale(b.duration) - sizeScale(a.duration)
    );
    
    // Show an empty heart rate graph with instructions
    d3.select(".chart-container").style("display", "block");
    
    // Create empty heart rate graph with the message
    createEmptyHeartRateGraph();
        
    // Add patient bubbles
    gridContainer.selectAll(".patient")
        .data(sortedPatients)
        .enter()
        .append("circle")
        .attr("class", "patient")
        .attr("cx", d => xScale(d.age))
        .attr("cy", d => yScale(d.max_hr))
        .attr("r", d => sizeScale(d.duration))
        .attr("fill", "#7b7878")
        .attr("stroke", "#7b7878")
        .attr("stroke-width", 1)
        .style("opacity", 0.7)
        .style("cursor", "pointer")
        .style("transition", "all 0.2s ease")
        .on("mouseover", async function(event, d) {
            // Update appearance immediately
            d3.select(this)
                .attr("fill", "#ff3131")
                .style("opacity", 1)
                .attr("stroke", "#ff3131")
                .attr("stroke-width", 2);
            selectedCaseID = d.id;
            
            // Show tooltip
            const tooltip = d3.select("#tooltip");
            tooltip
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 10}px`)
                .html(`<strong>Patient ID:</strong> ${d.id}<br>
                       <strong>Age:</strong> ${d.age}<br>
                       <strong>Max HR:</strong> ${d.max_hr} bpm<br>
                       <strong>Duration:</strong> ${d.duration} min`)
                .style("opacity", 1);
                
            // Load and display heart rate data
            d3.select("#chart").html('<div class="no-data">Loading heart rate data...</div>');
            
            processedData = await loadHeartRateData(d.id);
            if (processedData && processedData.length > 0) {
                maxTime = d.duration * 60;
                [minRate, maxRate] = d3.extent(processedData, d => d.heartrate);
                createWholeGraph();
            }

            // Display patient info
            displayPatientInfo(d);
            showPatientInfo();
        })
        .on("mouseout", function(event, d) {
            // Only reset appearance if this isn't the selected patient
            if (!currentPatient || currentPatient.id !== d.id) {
                d3.select(this)
                    .attr("fill", "#7b7878")
                    .style("opacity", 0.7)
                    .attr("stroke", "#7b7878")
                    .attr("stroke-width", 1);
            }
            
            // Hide tooltip
            d3.select("#tooltip")
                .style("opacity", 0);
        })
        .on("click", async function(event, d) {
            // Reset all patient circles
            d3.selectAll(".patient")
                .attr("fill", "#7b7878")
                .style("opacity", 0.7)
                .attr("stroke", "#7b7878")
                .attr("stroke-width", 1);
            
            // Highlight selected patient
            d3.select(this)
                .attr("fill", "#ff3131")
                .style("opacity", 1)
                .attr("stroke", "#ff3131")
                .attr("stroke-width", 2);

                transitionToGraph(d);


            
        });
        
    currentView = "category-detail";
}

function transitionToGraph(d) {
    // Fade out the story section
    document.getElementById('bubble-section').style.opacity = '0';

    setTimeout(() => {
        // Hide the story and show visualization
        document.getElementById('bubble-section').style.display = 'none';
        document.getElementById('graph-section').style.display = 'block';

        // Apply fade-in effect with a slight delay
        setTimeout(() => {
            document.getElementById('graph-section').style.opacity = '1';
            magic(d.id);
        }, 300);

    }, 1000); // Matches fade-out duration
}

// Function to create an empty heart rate graph with instructions
function createEmptyHeartRateGraph() {
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const chartContainer = document.getElementById("chart");
    const containerWidth = chartContainer.clientWidth;
    const containerHeight = chartContainer.clientHeight;

    const width = 750 - margin.left - margin.right;
    const height = 375 - margin.top - margin.bottom - 40;

    d3.select("#chart").selectAll("*").remove();

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Add axis labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 30)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#7ed957")
        .style("opacity", "0.6")
        .style("font-weight", "bold")
        .text("Time Since Operation Started (HH:MM)");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -35)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#7ed957")
        .style("opacity", "0.6")
        .style("font-weight", "bold")
        .text("Heart Rate (bpm)");

    // Create x-axis scale
    const xScale = d3.scaleLinear()
        .domain([0, 7200]) // 2 hours in seconds
        .range([0, width]);

    // Create y-axis scale
    const yScale = d3.scaleLinear()
        .domain([0, 240])  // 0 to 240 bpm
        .range([height, 0]);

    // Generate evenly spaced tick values
    const xTicks = d3.range(0, 7200 + 600, 600);  // Every 10 minutes
    const yTicks = d3.range(0, 240 + 20, 20);     // Every 20 bpm

    // Format time labels
    function secondsToHHMM(seconds) {
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}:${remainingMinutes.toString().padStart(2, "0")}`;
    }

    // Create x and y axes
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale)
            .tickValues(xTicks)
            .tickFormat(d => secondsToHHMM(d))
        )
        .style("opacity", "0.6");

    svg.append("g")
        .call(d3.axisLeft(yScale)
            .tickValues(yTicks)
        )
        .style("opacity", "0.6");

    // Create gridlines
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale)
            .tickValues(xTicks)
            .tickSize(-height)
            .tickFormat("")
        )
        .style("stroke", "#ccc")
        .style("stroke-width", "2px")
        .style("opacity", "20%");

    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
            .tickValues(yTicks)
            .tickSize(-width)
            .tickFormat("")
        )
        .style("stroke", "#ccc")
        .style("stroke-width", "1px")
        .style("opacity", "40%");
    
    // Add instruction message in the center of the chart
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", "16px")
        .style("fill", "#a5a2a2")
        .text("Hover over a patient to view heart rate data");

        d3.select("#patient-info-panel").remove(); // Remove the panel completely
}

// Update the drawCategoryBubbles function to handle the click event
function drawCategoryBubbles() {
    // Hide chart container FIRST before doing anything else
    d3.select(".chart-container").style("display", "none");
    d3.select("#patient-info-panel").remove(); // Remove the panel completely
    
    // Only do animation if we're coming from category detail view
    if (currentView === "category-detail" && currentCategory) {
        // Get the source category data for animation
        const category = surgeryCategories.find(c => c.id === currentCategory);
        
        // Create animation circle at the current large position
        const startX = width * 0.35;
        const startY = height * 0.62;
        const startRadius = Math.min(width, height) * 0.62;
        
        // Change visualization back to fullscreen mode BEFORE calculating positions
        d3.select("#visualization")
            .attr("class", "visualization-fullscreen");
        
        // Update width and height NOW based on fullscreen container size
        const visualizationContainer = d3.select("#visualization");
        const containerRect = visualizationContainer.node().getBoundingClientRect();
        width = containerRect.width;
        height = containerRect.height;
        
        // Resize SVG
        svg.attr("width", width)
           .attr("height", height);
        
        // Now create bubble layout with the UPDATED dimensions
        const bubble = d3.pack()
            .size([width, height * 0.9])
            .padding(20);
            
        const hierarchyData = { children: surgeryCategories };
        const root = d3.hierarchy(hierarchyData).sum(d => d.count || 0);
        bubble(root);
        
        // Calculate vertical offset for centering
        const verticalOffset = (height - root.r * 2) / 2;
        
        // Find the node that matches our category
        let targetNode = null;
        for (const node of root.children) {
            if (node.data.id === category.id) {
                targetNode = node;
                break;
            }
        }
        
        // Target position is where the bubble will shrink to
        // Use default positions as a fallback, but this shouldn't happen
        const targetX = targetNode ? targetNode.x : width / 2;
        const targetY = targetNode ? targetNode.y + verticalOffset : height / 2;
        const targetRadius = targetNode ? targetNode.r : 50;
        
        // For debugging - log the positions 
        console.log("Animation targets:", {
            categoryId: category.id,
            targetNodeFound: !!targetNode,
            targetX: targetX,
            targetY: targetY,
            targetRadius: targetRadius,
            windowWidth: width,
            windowHeight: height
        });
        
        // Clear existing SVG content
        svg.selectAll("*").remove();
        
        // Create the animation circle
        const animationCircle = svg.append("circle")
            .attr("cx", startX)
            .attr("cy", startY)
            .attr("r", startRadius)
            .attr("fill", "#7ed957")
            .attr("stroke", "none")
            .style("opacity", 1)
            .style("pointer-events", "none");

        drawAllCategoryBubbles();
            
        // Animate the circle shrinking back to its original position
        animationCircle.transition()
            .duration(750)
            .attr("cx", targetX)
            .attr("cy", targetY)
            .attr("r", targetRadius)
            .style("opacity", 0.5)
            .on("end", function() {
                // Remove the animation circle
                animationCircle.remove();
                
                // Draw the regular category bubbles
                
            });
    } else {
        // If not coming from category detail, just draw bubbles normally
        // Change visualization back to fullscreen mode
        d3.select("#visualization")
            .attr("class", "visualization-fullscreen");
        
        // Update the width and height based on new container size
        const visualizationContainer = d3.select("#visualization");
        const containerRect = visualizationContainer.node().getBoundingClientRect();
        width = containerRect.width;
        height = containerRect.height;
        
        // Resize SVG
        svg.attr("width", width)
           .attr("height", height);
        
        d3.select("#chart").html(""); // Clear heart rate graph
        currentPatient = null;
        svg.selectAll("*").remove();
        
        drawAllCategoryBubbles();
    }
}

// Create a separate function for drawing the category bubbles
function drawAllCategoryBubbles() {
    console.log("Drawing all category bubbles");
    // Define available space and create bubble layout
    const bubble = d3.pack()
        .size([width, height * 0.9])  // Reduce height to keep bubbles centered
        .padding(20);

    // Prepare hierarchy data
    const hierarchyData = { children: surgeryCategories };
    const root = d3.hierarchy(hierarchyData).sum(d => d.count || 0);

    // Apply layout
    bubble(root);

    // Calculate vertical offset for centering
    const verticalOffset = (height - root.r * 2) / 2;

    // Create bubble groups
    const bubbleGroups = svg.selectAll(".bubble")
        .data(root.children)
        .enter()
        .append("g")
        .attr("class", "bubble")
        .attr("transform", d => `translate(${d.x},${d.y + verticalOffset})`)  // Apply centering offset
        .style("cursor", "pointer");

    // Add circles
    console.log(bubbleGroups);
    bubbleGroups.append("circle")
        .attr("r", d => d.r)
        .attr("fill", "#333739")
        .attr("stroke", "none")
        .attr("stroke-width", 0)
        .style("opacity", 0.75)
        .on("mouseover", function(event, d) {
            d3.select(this).transition().duration(200).attr("fill", "#7ed957").style("opacity", 1);

            // Show tooltip
            d3.select("#tooltip")
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 10}px`)
                .html(`<strong>${d.data.name}</strong><br>${d.data.count} surgeries`)
                .style("opacity", 1);

            d3.select(this.parentNode).selectAll("text")
                .transition()
                .duration(200)
                .attr("fill", "#363336");    
        })
        .on("mouseout", function() {
            d3.select(this).transition().duration(200).attr("fill", "#333739").style("opacity", 0.75);
            d3.select("#tooltip").style("opacity", 0);

            d3.select(this.parentNode).selectAll("text")
                .transition()
                .duration(200)
                .attr("fill", "#a5a2a2");
        })
        .on("click", function(event, d) {
            currentCategory = d.data.id;
            d3.select("#tooltip").style("opacity", 0);
            showCategoryDetail(d);
        });

    // Add category name labels
    bubbleGroups.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-.2em")
        .attr("fill", "#a5a2a2")
        .style("font-size", d => Math.min(2.5 * d.r / (d.data.name.length), 18) + "px")
        .style("pointer-events", "none")
        .text(d => d.data.name);

    // Add case count labels
    bubbleGroups.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "1.5em")
        .attr("fill", "#a5a2a2")
        .style("font-size", d => Math.min(1.75 * d.r / 10, 14) + "px")
        .style("pointer-events", "none")
        .text(d => d.data.count > 0 ? `${d.data.count} cases` : "");

    currentView = "categories";
}

// Helper function to convert seconds to HH:MM:SS format
function secondsToHHMMSS(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// The createWholeGraph function
function createWholeGraph() {
    if (!processedData || processedData.length === 0) {
        d3.select("#chart").html('<div class="no-data">No heart rate data available for this patient</div>');
        return;
    }
    
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const chartContainer = document.getElementById("chart");
    const containerWidth = chartContainer.clientWidth;
    const containerHeight = chartContainer.clientHeight;

    const width = 750 - margin.left - margin.right;
    const height = 375 - margin.top - margin.bottom - 40;

    d3.select("#chart").selectAll("*").remove();

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Add axis labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 30)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "rgb(126, 217, 87, 0.6)")
        .style("font-weight", "bold")
        .text("Time Since Operation Started (HH:MM)");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -35)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "rgb(126, 217, 87, 0.6)")
        .style("font-weight", "bold")
        .text("Heart Rate (bpm)");

    svg.append("text")
    .attr("x", width / 2 - 40)
    .attr("y", height - 280)
    .style("fill", "rgb(126, 217, 87, 0.6)")
    .style("font-weight", "bold")
    .text('Case ' + selectedCaseID);

    
        // Ensure we use the full dataset range without filtering NaN values
    const fullData = processedData; 

    if (fullData.length === 0) {
        d3.select("#chart").html('<div class="no-data">No valid heart rate data available for this patient</div>');
        return;
    }

    // Find max time value without slicing or filtering
    const maxTime = d3.max(fullData, d => d.second);

    // Creates x-axis scale
    const xScale = d3.scaleLinear()
        .domain([0, maxTime]) 
        .range([0, width]);

    // Generate exactly 15 evenly spaced tick values
    const xTickInterval = Math.ceil(maxTime / 14); // Dividing full range into 14 equal segments
    const xTicks = d3.range(0, maxTime + xTickInterval, xTickInterval)
        .slice(0, 15); // Ensure exactly 15 ticks

    // Ensure last tick is exactly at maxTime if not included
    if (!xTicks.includes(maxTime)) {
        xTicks[xTicks.length - 1] = maxTime;
    }

    // Fixes inconsistent time labeling by ensuring proper HH:MM formatting
    function secondsToHHMM(seconds) {
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}:${remainingMinutes.toString().padStart(2, "0")}`;
    }

    // Determine max heart rate value dynamically without slicing
    const dataMaxRate = d3.max(fullData, d => d.heartrate);

    // Set y-axis ticks in steps of 20 up to at least 240
    const maxTickValue = Math.max(240, Math.ceil(dataMaxRate / 20) * 20);
    const yTicks = d3.range(0, maxTickValue + 20, 20);

    const yScale = d3.scaleLinear()
        .domain([0, maxTickValue])
        .range([height, 0]);

    // Create x and y axes
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale)
            .tickValues(xTicks)
            .tickFormat(d => secondsToHHMM(d))
        )
        .style("opacity", 0.55);

    svg.append("g")
        .call(d3.axisLeft(yScale)
            .tickValues(yTicks)
        )
        .style("opacity", 0.55);

    // Create gridlines
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale)
            .tickValues(xTicks)
            .tickSize(-height)
            .tickFormat("")
        )
        .style("stroke", "#ccc")
        .style("stroke-width", "2px")
        .style("opacity", "20%");

    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
            .tickValues(yTicks)
            .tickSize(-width)
            .tickFormat("")
        )
        .style("stroke", "#ccc")
        .style("stroke-width", "1px")
        .style("opacity", "40%");

    // Clip path to keep the line inside the graph area
    svg.append("defs").append("clipPath")
        .attr("id", "clip-path")
        .append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 0);

    // Draw the line graph without filtering NaN values
    const line = d3.line()
        .defined(d => !isNaN(d.heartrate)) // Only exclude NaN points from being drawn, but keep them in the dataset
        .x(d => xScale(d.second))
        .y(d => yScale(d.heartrate));

    svg.append("path")
        .datum(fullData)
        .attr("class", "line")
        .attr("clip-path", "url(#clip-path)")
        .attr("d", line)
        .style("fill", "none")
        .style("stroke", "#7ed957")
        .style("stroke-width", 2);    
}

// Initialize visualization when the page loads
window.addEventListener('resize', () => {
    // Update dimensions on resize
    const visualizationContainer = d3.select("#visualization");
    const containerRect = visualizationContainer.node().getBoundingClientRect();
    width = containerRect.width;
    height = containerRect.height;

    // Resize SVG
    // console.log(width)
    svg.attr("width", width)
    .attr("height", height);

    // Redraw based on current view
    if (currentView === "categories") {
        drawCategoryBubbles();
    } else if (currentView === "category-detail" && currentCategory) {
        const category = surgeryCategories.find(c => c.id === currentCategory);
        const hierarchyNode = {
            data: category,
            x: width / 2,
            y: height / 2,
            r: Math.min(width, height) * 0.45
        };
        showCategoryDetail(hierarchyNode);
    }

    // Redraw heart rate chart if needed
    if (currentPatient && processedData && processedData.length > 0) {
        createWholeGraph();
    }
});