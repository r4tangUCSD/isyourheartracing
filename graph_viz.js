import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

import { deselectCurrentPatient, createEmptyHeartRateGraph, explored } from './bubbles_viz.js';
// GLOBAL VARIABLES

let animating;
// let instruction = d3.select('#post-animate');

// data processing
let patient_info;
let processedData;
let filteredData;


// working with missing data
    // anything previous
let prevfiltered;
let checkPrev;
let prevTime;

    // storage of missing values while plot animates
let startNull = {};
let endNull = {};
let missingValue = {};

    // track missing
let currMissing;
let missingID = 0;
let currMissID;
let isMissing = false;
let hasMissing = false;
let missingWithin15 = false;
let lastMissingEnd;

    // finding in range of values
let rangeMin;
let rangeMax;

// patient stats info
let selectedCaseID = 32; //changes based on patient selected
let patientAge;
let patient_details;
let maxHeartRate = 220;
let surgeryType;
let surgeryInfo = document.getElementById('surgery-info');
let detailed = document.getElementById('details');

//slider and time
let timeScale; 
let showPercent = document.getElementById('percent');
let slider = document.getElementById('slider');
let sliderTime = document.getElementById('selected-time');
let timeValue = document.getElementById('value');
let sliderValue = 0;

let roundedMin;
let roundedMax;
let current;

    //time values 
let minTime;
let maxTime;
let numHours;
let currHour;

//heart rate values
let minRate;
let maxRate;

let currentAverage;
let averageHeartRate;

//graph
let svg;
const margin = { top: 20, right: 30, bottom: 40, left: 40 };
const width = 750 - margin.left - margin.right;
const height = 375 - margin.top - margin.bottom;

    // x scale
let xScale;
let tenMinsAge = 0;
let endTime;

    // y scale
let yScale;
let firstY;
let endY;

    // shading
let mod50;
let mod70;
let vig85;

//back bubble
let backBubble;
let svgCircle;

// done button

// ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ Functions ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ 

function processCSV(data) {
    return data.map (d => {
        const values = d['Solar8000/HR'];
        return {
            second: Math.round(d['Time']),
            hour: d['Time']/3600,
            time: secondsToHHMMSS(d['Time']),
            heartrate: values
        }
    });
}

function secondsToHHMMSS(seconds) {
    // number of seconds to HH:MM:SS

    seconds = Math.round(seconds);
    const hours = Math.floor(seconds / 3600); // 1 hour = 3600 seconds
    const minutes = Math.floor((seconds % 3600) / 60); // 1 minute = 60 seconds
    const remainingSeconds = seconds % 60; // Remaining seconds

    const formattedTime = 
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(remainingSeconds).padStart(2, '0');

    return formattedTime;
}

function currentTime() {
    prevTime = current;

    // Time near slider
    const timeProgress = slider.value;
    showPercent.textContent = Math.round(timeProgress) + '% through the procedure';

    const currentTime = timeScale.invert(timeProgress);
    current = currentTime;
    const formattedTime = secondsToHHMMSS(currentTime);
    sliderTime.textContent = formattedTime.toLocaleString();

    // with all the heart rate until currentTime
    if (currentTime < minTime){
        filteredData = processedData.filter(d => d.second === minTime);
    } else {
        filteredData = processedData.filter(d => d.second <= currentTime);
    }

    if (currentTime >= 900) {
        tenMinsAge = currentTime - 900
        filteredData = filteredData.filter(d => d.second >= currentTime - 900);
    } else {
        tenMinsAge = 0;
    }

    currHour = currentTime/3600;

    createGraph();

    // Just to get only the average heart rate within the last minutes
    if (currentTime >= 60) {
        filteredData = filteredData.filter(d => d.second >= currentTime - 60);
    }

    handlingMissing();
    

    // displaying average and slider's current position
    timeValue.textContent = currentAverage;
    slider.style.background = `linear-gradient(to right, #7ed957 0%, #7ed957 ${timeProgress}%, #fff ${timeProgress}%, #fff 100%)`;

}

function handlingMissing() {
    // accounts for missing heart rates for more than a minute
    if (filteredData.length === 0) {
        // no recorded heart rate within the last minute 

        isMissing = true;
        hasMissing = true;

        if (checkPrev.length !== 0 && prevTime < current && !endNull.hasOwnProperty(current) && animating) {
            // slider moving forward

            startNull[current] = missingID;
            missingValue[missingID] = currentAverage;
            currMissing = currentAverage;
        } else if (prevTime > current){
            // slider moving backward

            for (let i = 0; i < Object.keys(startNull).length; i++) {
                if (current >= Object.keys(startNull)[i] && current <= Object.keys(endNull)[i]) {
                    // find the range the value is in
                    rangeMin = Object.keys(startNull)[i];
                    rangeMax = Object.keys(endNull)[i];
                    break;
                } 
            }
            currMissID = startNull[rangeMin];
            currentAverage = missingValue[currMissID];
        }
        
    } else {
        // there is recorded data within the last minute

        if (checkPrev && checkPrev.length === 0 && !startNull.hasOwnProperty(current) && prevTime < current & animating) {
            isMissing = false;
            endNull[prevTime] = missingID;
            missingID ++;
            lastMissingEnd = prevTime;
            missingWithin15 = true;

        }
        
        if (current - (15 * 60) > lastMissingEnd) {
            missingWithin15 = false;
        }

        prevfiltered = filteredData;
        currentAverage = Math.round(d3.mean(filteredData, d => d.heartrate));
        
    }

    // checks to see if there are any missing values for > 1 minute straight
    for (let i = 0; i < Object.keys(startNull).length; i++){
        let startMissing = Object.keys(startNull)[i];
        if (current - (15*60) < startMissing & startMissing < current) {
            missingWithin15 = true;
            break;
        } else {
            missingWithin15 = false;
        }
    }

    checkPrev = filteredData;
}


function createGraph() {
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const container = d3.select("#graph").node();
    const width = container.getBoundingClientRect().width - margin.left - margin.right;
    const height = 375 - margin.top - margin.bottom;

    d3.select("#graph").selectAll("svg").remove();  

    svg = d3.select("#graph")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Creates x axis scales
    endTime = Math.max(900, current)
    xScale = d3.scaleLinear()
    .domain([tenMinsAge, endTime]) // data values for x-axis
    .range([0, width]); // pixel range for the graph

    // x axis labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "rgb(126, 217, 87, 0.6)")
        .text("Time Since Operation Started (HH:MM:SS)");

    // Creates y axis scales
    firstY = Math.max(0, Math.floor(minRate/10) * 10);
    endY = (Math.ceil(maxRate/10) * 10);

    yScale = d3.scaleLinear()
        .domain([firstY, endY]) // data values for y-axis
        .range([height, 0]); // pixel range for the graph

    // y axis labels
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -31.5)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-size", "12px")
        .style("fill", "rgb(126, 217, 87, 0.6)")
        .text("Heart Rate (bpm)");

    // Creates the x and y axis

    const ticks = d3.range(tenMinsAge, endTime, 60); 

    svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .style("opacity", 0.55)
    .call(d3.axisBottom(xScale).tickValues(ticks).tickFormat(d => secondsToHHMMSS(d)));

    svg.append("g")
    .call(d3.axisLeft(yScale))
    .style("opacity", 0.35);

    svg.append("g")
        .call(d3.axisLeft(yScale).ticks(10))
        .style("opacity", 0.35);

    // add shading
    if (animating === false || Math.ceil(current) >= maxTime) {
        shadingRange();
    }

    // Creates grids
        // vertical grids
    svg.append("g")
    .attr("class", "grid")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(xScale)
        .tickValues(ticks)  // Number of ticks for gridlines
        .tickSize(-height) // Extend the gridlines across the chart
        .tickFormat("") // No tick labels
    )
    .style("stroke", "#ccc") // Color of the gridlines
    .style("stroke-width", "2px")
    .style("opacity", "20%");

        // horizontal grids
    const ticksY = d3.range(Math.floor((firstY + 10) / 10) * 10, Math.ceil((endY) / 10) * 10, 10);
    
    svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(yScale)
        .tickValues(ticksY)  // Use the generated array of ticks
        .tickSize(-width)    // Extend the gridlines across the chart
        .tickFormat("")      // Remove tick labels
    )
    .style("stroke", "#ccc")  // Gridline color
    .style("stroke-width", "1px")
    .style("opacity", "40%");

    // create different segments
    let segments = [];
    let segment;
    let segEnd;
    let segStart = current - (15*60)

    if (missingWithin15) {
        // there is missing data for more than 1 minute straight within the last 15 minutes 

        for (let i = 0; i < Object.keys(startNull).length; i++) {
            if (segStart < Object.keys(startNull)[i]) {
                segEnd = Object.keys(startNull)[i];
                segment = filteredData.filter(d => segStart <= d.second && d.second <= segEnd);
                segments.push(segment);
                
                if (Object.keys(startNull)[i+1]) {
                    // another segment of missing data
                    segStart = Object.keys(startNull)[i+1];
                    continue;
                } else {
                    // continue drawing the rest of the data within the 15 minutes shown
                    segStart = Object.keys(endNull)[i];
                    segment = filteredData.filter(d => segStart <= d.second);
                    segments.push(segment)
                }
                
            } else {
                // If no missing data, just add the whole filtered data
                segments = [filteredData];  
                break;
            }
        }
    } else {
        /* there is no missing data for more than 1 minute straight
         within the last 15 minutes from current */
        
        segments = [filteredData];
    }

    // Plot the line graph
    const line = d3.line()
        .x(d => xScale(d.second)) // Map time to the x-axis
        .y(d => yScale(d.heartrate));

    // Draw each segment
    segments.forEach(segment => {
        svg.append("path")
        .data([segment]) // Bind the data
        .attr("class", "line") // Add a class for styling (optional)
        .attr("d", line) // Draw the path based on the data
        .style("fill", "none") // No fill for the line
         //.style("stroke", "#7ed957") // Line color
        .style("stroke-width", 2) // Line width
        .style("stroke", "#00ff00")
        .style("filter", "drop-shadow(0px 0px 4px #00ff00)");
    });
}

function animateSlider() {
    numHours = maxTime/3600;
    const durationPerHour = 10000; // Animation duration in milliseconds (e.g., 5 seconds)
    const totalDuration = durationPerHour * numHours/1000;
    sliderValue = 0;
    animating = true;

    const interval = setInterval(() => {
        if (sliderValue >= 100) {
            animating = false;
            slider.value = maxTime;
            // instruction.style.opacity = 0.3;
            clearInterval(interval);
        } else {
            sliderValue += 0.2; // Adjust step size based on range
            slider.value = sliderValue;
            currentTime(); // Update slider position
        }
    }, totalDuration);
}

function shadingRange() {
    let restinglow;
    let lowMax;
    let lowLow;

    // too low and resting by age
    if (patientAge < 5) {
        // patients below age 5

            // boundary for low to resting
        lowMax = 80;
        restinglow = Math.max(80, firstY);
        

    } else if (patientAge < 10) {
        // patients below age 10

            // boundary for low to resting
        lowMax = 70;
        restinglow = Math.max(70, firstY);

    } else {
        // everyone else

            // boundary for low to resting
        lowMax = 40;
        restinglow = Math.max(40, firstY);
    }
    
    // low shading
    if (firstY < lowMax) {
        lowLow = Math.max(0, firstY);
        svg.append("rect")
        .attr("x", xScale(tenMinsAge))  // Map the start X value to the scale
        .attr("y", yScale(lowMax))    // Map the end Y value to the scale (invert y-axis)
        .attr("width", xScale(endTime) - xScale(tenMinsAge))  // Rectangle width
        .attr("height", yScale(lowLow) - yScale(lowMax)) // Rectangle height (invert the height)
        .attr("fill", "#009AEE")  // Rectangle color
        .style("opacity", 0.25); 
    }

    // resting shading

    let restingHigh = Math.min(endY, mod50);

    if (firstY < mod50) {
        svg.append("rect")
        .attr("x", xScale(tenMinsAge))  // Map the start X value to the scale
        .attr("y", yScale(restingHigh))    // Map the end Y value to the scale (invert y-axis)
        .attr("width", xScale(endTime) - xScale(tenMinsAge))  // Rectangle width
        .attr("height", yScale(restinglow) - yScale(restingHigh)) // Rectangle height (invert the height)
        .attr("fill", "#2db41e")  // Rectangle color
        .style("opacity", 0.25); 
    }
    
    // moderate shading
    let modHigh = Math.min(endY, mod70);
    const lowerY = Math.max(mod50, firstY);
    svg.append("rect")
    .attr("x", xScale(tenMinsAge))  // Map the start X value to the scale
    .attr("y", yScale(modHigh))    // Map the end Y value to the scale (invert y-axis)
    .attr("width", xScale(endTime) - xScale(tenMinsAge))  // Rectangle width
    .attr("height", yScale(lowerY) - yScale(modHigh)) // Rectangle height (invert the height)
    .attr("fill", "#FEED53")  // Rectangle color
    .style("opacity", 0.25); 


    // high shading
    let higherY = Math.max(vig85, endY);

    if (vig85 > endY) {
        higherY = endY
    }

    let lowHigh = Math.max(mod70, firstY);

    if (endY > mod70) {
        svg.append("rect")
        .attr("x", xScale(tenMinsAge))  // Map the start X value to the scale
        .attr("y", yScale(higherY))    // Map the end Y value to the scale (invert y-axis)
        .attr("width", xScale(endTime) - xScale(tenMinsAge))  // Rectangle width
        .attr("height", yScale(lowHigh) - yScale(higherY)) // Rectangle height (invert the height)
        .attr("fill", "#F63C4C")  // Rectangle color
        .style("opacity", 0.25); 
    }
    
}

function getPatientInfoByCaseid(caseid) {
    const patient = patient_info.find(record => record.caseid === caseid.toString());
    return patient ? patient : null; // Return patient or null if not found
}

// ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ The Magic ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ 

export function magic(caseId) {
    selectedCaseID = caseId;

    d3.csv("emergency_data/emergency_premium.csv")
    .then(patients => {
        patient_info = patients;
        const filepath = "./heart_rate_data/case_" + selectedCaseID + ".csv";
        return d3.csv(filepath);
    })
    .then(data => {
        processedData = processCSV(data);

        // Scaling the time
        const startTime = new Date();
        startTime.setHours(0, 0, 0, 0);

        minTime = d3.min(processedData, d => d.second);
        maxTime = d3.max(processedData, d => d.second);
        numHours = Math.ceil(maxTime / 3600);

        timeScale = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d.second)])
        .range([0, 100]);

        // heart rate values
        minRate = d3.min(processedData, d => parseInt(d.heartrate));
        maxRate = d3.max(processedData, d => parseInt(d.heartrate));

        // important values
        patient_details = getPatientInfoByCaseid(selectedCaseID);
        patientAge = patient_details.age;
        maxHeartRate = 220 - patientAge;

        averageHeartRate = Math.round(d3.mean(processedData, d => d.heartrate));

        // surgery details
        surgeryType = patient_details.optype;
        // infoTitle.textContent = 'Details for Case ' + selectedCaseID;
        detailed.innerHTML = `
        <strong>Surgery Name: </strong>${patient_details.opname}<br>
        <strong>Description: </strong>${patient_details.dx}<br>`
        surgeryInfo.innerHTML = `
        <div id="left">
            <p>Age: ${patientAge}</p>
            <p>Sex: ${patient_details.sex}</p>
            <p>Height: ${patient_details.height} cm</p>
            <p>Weight: ${patient_details.weight} kg</p>
            <p>BMI: ${patient_details.bmi} cm</p>
        </div>

        <div id="right">
            <p>Hypertension: ${patient_details.preop_htn === "1" ? "Yes" : "No"}</p>
            <p>Diabetes: ${patient_details.preop_dm === "1" ? "Yes" : "No"}</p>
            <p>Average Heart Rate: ${averageHeartRate}</p>
            <p>Hospital Stay: ${Math.round((patient_details.dis - patient_details.adm) / 3600)} days</p>
            <p>Mortality: ${patient_details.death_inhosp === "1" ? "Yes" : "No"}</p>
        </div>`;

        // for shading
        mod50 = maxHeartRate * 0.5;
        mod70 = maxHeartRate * 0.7;
        vig85 = maxHeartRate * 0.85;

        // instruction.append('svg').append('line').attr("width", 100);

        // Set Up
        slider.step = 1 / maxTime;
        currentTime();
        // instruction.style.opacity = 0;
        animating = true;
        animateSlider();

        slider.addEventListener('input', () => {
            currentTime();
        });

        // Call drawBackBubble after updating selectedCaseID
        drawBackBubble();
        
    });

    
}

// ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ Bubble Back Button ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ 

function drawBackBubble() {
    backBubble = d3.select("#back-bubble");

    // Clear previous contents before appending a new SVG
    backBubble.selectAll("*").remove();
    
    // Append new SVG
    svgCircle = backBubble
        .append("svg")
        .attr("width", 1500)
        .attr("height", 75);

    // Append a circle inside the SVG (with your requested changes)
    svgCircle.append("circle")
        .attr("cx", 260)  // Center the circle
        .attr("cy", -125) // Keeps the same positioning as requested
        .attr("r", 200)  // Large circle size as specified
        .style("fill", "#333739")
        .style("opacity", 0.85)
        .on("mouseover", function(event) {
            d3.select(this)
                .transition()
                .style("fill", "#7ed957")
                .style("opacity", 1);
        })
        .on("mouseout", function(event) {
            d3.select(this)
                .transition()
                .style("fill", "#333739")
                .style("opacity", 0.85);
        })
        .on("click", async function(event, d) {
            transitionToBubble(d);
        });

    svgCircle.append("text").attr("x", 800)  // Center the text horizontally
        .attr("y", 50).attr("text-anchor", "middle")
        .attr("text-align", "middle")
        .style("fill", "white")
        .style("font-size", "3.5em")
        .style("text-shadow", "0px 0px 5px #00ff00")
        .style("font-family", "OCR-B, sans-serif;")
        .style("font-weight", "bold").text("Case " + selectedCaseID);

    // Add text inside the circle
    svgCircle.append("text")
        .attr("x", 260)  // Center the text horizontally
        .attr("y", 40) // Adjusted for better centering
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("fill", "white")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("opacity", 0.4)
        .style("pointer-events", "none")  // Prevents text from blocking clicks
        .text("Back");

    // Add text to the right of the SVG
}

/*function drawDoneBubble() {
    svgCircle.append("circle")
    .attr("cx", 1240)  // Center the circle
    .attr("cy", -125) // Keeps the same positioning as requested
    .attr("r", 200)  // Large circle size as specified
    .style("fill", "#333739")
    .style("opacity", 0.85)
    .on("mouseover", function(event) {
        d3.select(this)
            .transition()
            .style("fill", "#7ed957")
            .style("opacity", 1);
    })
    .on("mouseout", function(event) {
        d3.select(this)
            .transition()
            .style("fill", "#333739")
            .style("opacity", 0.85);
    })
    .on("click", async function(event, d) {
    });

    svgCircle.append("text")
        .attr("x", 1240)  // Center the text horizontally
        .attr("y", 40) // Adjusted for better centering
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("fill", "white")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("opacity", 0.4)
        .style("pointer-events", "none")  // Prevents text from blocking clicks
        .text("I'm Done");
     
}*/

function transitionToBubble(d) {
    // Fade out the graph section
    document.getElementById('graph-section').style.opacity = '0';

    setTimeout(() => {
        // Hide the graph section and show the bubble section
        document.getElementById('graph-section').style.display = 'none';
        document.getElementById('bubble-section').style.display = 'block';

        // createEmptyHeartRateGraph();


        // Apply fade-in effect with a slight delay
        setTimeout(() => {
            document.getElementById('bubble-section').style.opacity = '1';
            
            // Remove all elements created by the magic function
            d3.selectAll("#graph svg").remove();
            // d3.selectAll("#tooltip").remove();
            d3.selectAll("#back-bubble svg").remove();

            // Deselect the current patient and create an empty heart rate graph
            deselectCurrentPatient();
            createEmptyHeartRateGraph();

            // Call the magic function with the caseid
            // magic(d.id);
        }, 300);

    }, 1000); // Matches fade-out duration
}

// ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ Bubble Page ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ 

    

