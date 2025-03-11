import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// GLOBAL VARIABLES

let animating = true;
let instruction = document.getElementById('post-animate');
instruction.style.opacity = 0;

// data processing
let patient_info;
let processedData_v;
let filteredData;

// surgery descriptions 
const response = await fetch('./description.json');
if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`);
}

const surgeryDescription = await response.json();

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
let infoTitle = document.getElementById('title');
let surgeryInfo = document.getElementById('surgery-info');

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
let maxTime_v;
let numHours;
let currHour;

//heart rate values
let minRate_v;
let maxRate_v;

let currentAverage;

//graph
let svg_v;

    // x scale
let xScale_v;
let tenMinsAge = 0;
let endTime;

    // y scale
let yScale_v;
let firstY;
let endY;

    // shading
let mod50;
let mod70;
let vig85;

//back bubble
let svgCircle;

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
        filteredData = processedData_v.filter(d => d.second === minTime);
    } else {
        filteredData = processedData_v.filter(d => d.second <= currentTime);
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
    const width = 750 - margin.left - margin.right;
    const height = 375 - margin.top - margin.bottom;

    d3.select("#chart").selectAll("svg").remove();  

    svg_v = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    // Creates x axis scales
    endTime = Math.max(900, current)
    xScale_v = d3.scaleLinear()
    .domain([tenMinsAge, endTime]) // data values for x-axis
    .range([0, width]); // pixel range for the graph

    // x axis labels
    svg_v.append("text")
        .attr("x", width / 2)
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "rgb(126, 217, 87, 0.6)")
        .text("Time Since Operation Started (HH:MM:SS)");

    // Creates y axis scales
    firstY = Math.max(0, Math.floor(minRate_v/10) * 10);
    endY = (Math.ceil(maxRate_v/10) * 10);

    yScale_v = d3.scaleLinear()
        .domain([firstY, endY]) // data values for y-axis
        .range([height, 0]); // pixel range for the graph

    // y axis labels
    svg_v.append("text")
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

    svg_v.append("g")
    .attr("transform", "translate(0," + height + ")")
    .style("opacity", 0.55)
    .call(d3.axisBottom(xScale_v).tickValues(ticks).tickFormat(d => secondsToHHMMSS(d)));

    svg_v.append("g")
    .call(d3.axisLeft(yScale_v))
    .style("opacity", 0.35);

    svg_v.append("g")
        .call(d3.axisLeft(yScale_v).ticks(10))
        .style("opacity", 0.35);

    // add shading
    if (animating === false || Math.ceil(current) >= maxTime_v) {
        shadingRange();
    }

    // Creates grids
        // vertical grids
    svg_v.append("g")
    .attr("class", "grid")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(xScale_v)
        .tickValues(ticks)  // Number of ticks for gridlines
        .tickSize(-height) // Extend the gridlines across the chart
        .tickFormat("") // No tick labels
    )
    .style("stroke", "#ccc") // Color of the gridlines
    .style("stroke-width", "2px")
    .style("opacity", "20%");

        // horizontal grids
    const ticksY = d3.range(Math.floor((firstY + 10) / 10) * 10, Math.ceil((endY) / 10) * 10, 10);
    
    svg_v.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(yScale_v)
        .tickValues(ticksY)  // Use the generated array of ticks
        .tickSize(-width)    // Extend the gridlines across the chart
        .tickFormat("")      // Remove tick labels
    )
    .style("stroke", "#ccc")  // Gridline color
    .style("stroke-width", "1px")
    .style("opacity", "40%");

    // create differet segments
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
        .x(d => xScale_v(d.second)) // Map time to the x-axis
        .y(d => yScale_v(d.heartrate));

    // Draw each segment
    segments.forEach(segment => {
        svg_v.append("path")
        .data([segment]) // Bind the data
        .attr("class", "line") // Add a class for styling (optional)
        .attr("d", line) // Draw the path based on the data
        .style("fill", "none") // No fill for the line
        .style("stroke", "#7ed957") // Line color
        .style("stroke-width", 2); // Line width
    });


}

function animateSlider() {
    numHours = maxTime_v/3600;
    const durationPerHour = 10000; // Animation duration in milliseconds (e.g., 5 seconds)
    const totalDuration = durationPerHour * numHours/1000;
    
    animating = true;

    const interval = setInterval(() => {
        if (sliderValue >= 100) {
            animating = false;
            slider.value = maxTime_v;
            instruction.style.opacity = 0.3;
            clearInterval(interval);
        } else {
            sliderValue += 0.175; // Adjust step size based on range
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
        svg_v.append("rect")
        .attr("x", xScale_v(tenMinsAge))  // Map the start X value to the scale
        .attr("y", yScale_v(lowMax))    // Map the end Y value to the scale (invert y-axis)
        .attr("width", xScale_v(endTime) - xScale_v(tenMinsAge))  // Rectangle width
        .attr("height", yScale_v(lowLow) - yScale_v(lowMax)) // Rectangle height (invert the height)
        .attr("fill", "#009AEE")  // Rectangle color
        .style("opacity", 0.15); 
    }

    // resting shading

    if (firstY < mod50) {
        svg_v.append("rect")
        .attr("x", xScale_v(tenMinsAge))  // Map the start X value to the scale
        .attr("y", yScale_v(mod50))    // Map the end Y value to the scale (invert y-axis)
        .attr("width", xScale_v(endTime) - xScale_v(tenMinsAge))  // Rectangle width
        .attr("height", yScale_v(restinglow) - yScale_v(mod50)) // Rectangle height (invert the height)
        .attr("fill", "#2db41e")  // Rectangle color
        .style("opacity", 0.15); 
    }
    
    // moderate shading
    let modHigh = Math.min(endY, mod70);
    const lowerY = Math.max(mod50, firstY);
    svg_v.append("rect")
    .attr("x", xScale_v(tenMinsAge))  // Map the start X value to the scale
    .attr("y", yScale_v(modHigh))    // Map the end Y value to the scale (invert y-axis)
    .attr("width", xScale_v(endTime) - xScale_v(tenMinsAge))  // Rectangle width
    .attr("height", yScale_v(lowerY) - yScale_v(modHigh)) // Rectangle height (invert the height)
    .attr("fill", "#FEED53")  // Rectangle color
    .style("opacity", 0.15); 


    // high shading
    let higherY = Math.max(vig85, endY);

    if (vig85 > endY) {
        higherY = endY
    }

    if (endY > mod70) {
        svg_v.append("rect")
        .attr("x", xScale_v(tenMinsAge))  // Map the start X value to the scale
        .attr("y", yScale_v(higherY))    // Map the end Y value to the scale (invert y-axis)
        .attr("width", xScale_v(endTime) - xScale_v(tenMinsAge))  // Rectangle width
        .attr("height", yScale_v(mod70) - yScale_v(higherY)) // Rectangle height (invert the height)
        .attr("fill", "#F63C4C")  // Rectangle color
        .style("opacity", 0.15); 
    }
    
}

function getPatientInfoByCaseid(caseid) {
    const patient = patient_info.find(record => record.caseid === caseid.toString());
    return patient ? patient : null; // Return patient or null if not found
}

// ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ The Magic ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ 

d3.csv("emergency.csv")
    .then(patients => {
        patient_info = patients
        const filepath = "./heart_rate_data/case_" + selectedCaseID + ".csv"
        return d3.csv(filepath);

    })
    .then(data => {
        processedData_v = processCSV(data);

        // Scaling the time
        const startTime = new Date();
        startTime.setHours(0, 0, 0, 0);

        minTime = d3.min(processedData_v, d => d.second);
        maxTime_v = d3.max(processedData_v, d => d.second);
        numHours = Math.ceil(maxTime_v/3600);        

        timeScale = d3.scaleLinear()
        .domain([0, d3.max(processedData_v, d => d.second)])
        .range([0, 100]);

        // heart rate values
        minRate_v = d3.min(processedData_v, d => parseInt(d.heartrate));
        maxRate_v = d3.max(processedData_v, d => parseInt(d.heartrate));

        // important values
        patient_details = getPatientInfoByCaseid(selectedCaseID);
        patientAge = patient_details.age;
        maxHeartRate = maxHeartRate - patientAge;

        //surgery details
        surgeryType = patient_details.optype;
        surgeryInfo.textContent = surgeryDescription[surgeryType];
        infoTitle.textContent = surgeryType + ' Surgery Info';

        // for shading
        mod50 = maxHeartRate * 0.5;
        mod70 = maxHeartRate * 0.7;
        vig85 = maxHeartRate * 0.85;

        // Set Up
        slider.step = 1/maxTime_v
        currentTime();
        animateSlider();
            
        slider.addEventListener('input', () => {
            currentTime();
        });

    })

// ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ Bubble Back Button ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ 

function drawBackBubble() {
    const backBubble = d3.select("#back-bubble");
    // Clear previous contents before appending a new SVG
    
    // Append new SVG
    svgCircle = backBubble
        .append("svg")
        .attr("width", 600)
        .attr("height", 75);

    // console.log(svgCircle)

    // Append a circle inside the SVG
    svgCircle.append("circle")
        .attr("cx", 260)  // Center the circle
        .attr("cy", -125)
        .attr("r", 200)
        .style("fill", "#333739")
        .style("opacity", 0.85)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                // .duration(200)
                .style("fill", "#7ed957")
                .style("opacity", 1)
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
                .transition()
                // .duration(200)
                .style("fill", "#333739")
                .style("opacity", 0.85)
        });

}

drawBackBubble();