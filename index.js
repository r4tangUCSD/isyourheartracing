import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// data processing
let processedData;
let filteredData;
let patient_info;

// find patient
let selectedCaseID = 5;
let patientAge;
let patient_details;
let maxHeartRate = 220;
let surgeryType;
let surgeryInfo = document.getElementById('surgery-info');

//slider and time
let timeScale; 
let slider = document.getElementById('slider');
let sliderTime = document.getElementById('selected-time');
let timeValue = document.getElementById('value');
let current;
let sliderValue = 0;

//time values 
let minTime;
let maxTime;
let numHours;
let currHour;

//heart rate values
let minRate;
let maxRate;

//graph
let xScale;
let yScale;

let svg;

let tenMinsAge = 0;
let endTime;

let firstY;
let endY;

// shading
let mod50;
let mod70;
let vig85;


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
    // Time near slider
    const timeProgress = slider.value;
    const currentTime = timeScale.invert(timeProgress);
    current = currentTime
    numHours = Math.ceil(currentTime/3600)
    const formattedTime = secondsToHHMMSS(currentTime);
    sliderTime.textContent = formattedTime.toLocaleString();
    // console.log(processedData)

    // with all the heart rate until cirrentTime
    if (currentTime < minTime){
        filteredData = processedData.filter(d => d.second === minTime);
    } else {
        filteredData = processedData.filter(d => d.second <= currentTime);
    }

    if (currentTime >= 900) {
        tenMinsAge = currentTime - 900
        filteredData = filteredData.filter(d => d.second >= currentTime - 900);
        // tenMinsAge = tenMinsAge/3600;
    } else {
        tenMinsAge = 0;
    }

    currHour = currentTime/3600;
    
    createGraph();

    // Just to get only the heart rate from the last minutes
    if (currentTime >= 60) {
        filteredData = filteredData.filter(d => d.second >= currentTime - 60);
    }

    const currentAverage = Math.round(d3.mean(filteredData, d => d.heartrate))
    timeValue.textContent = currentAverage;

    slider.style.background = `linear-gradient(to right, #7ed957 0%, #7ed957 ${timeProgress}%, #fff ${timeProgress}%, #fff 100%)`;

}

function createWholeGraph() {
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    d3.select("#chart").selectAll("svg").remove();  

    svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Creates x axis scales
    endTime = Math.max(900, current)
    xScale = d3.scaleLinear()
    .domain([0, maxTime]) // data values for x-axis
    .range([0, width]); // pixel range for the graph

    // Creates y axis scales
    firstY = Math.max(0, minRate - 20);
    endY = maxRate + 20;

    yScale = d3.scaleLinear()
        .domain([firstY, endY]) // data values for y-axis
        .range([height, 0]); // pixel range for the graph

    // Creates the x and y axis

    const ticks = d3.range(0, maxTime, 60); 

    svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(xScale).tickValues(ticks).tickFormat(d => secondsToHHMMSS(d)));

    svg.append("g")
    .call(d3.axisLeft(yScale));

    svg.append("g")
        .call(d3.axisLeft(yScale).ticks(10));


    // Creates grids

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

    // Draw the line

    const line = d3.line()
        .x(d => xScale(d.second)) // Map time to the x-axis
        .y(d => yScale(d.heartrate));

    svg.append("path")
    .data([processedData]) // Bind the data
    .attr("class", "line") // Add a class for styling (optional)
    .attr("d", line) // Draw the path based on the data
    .style("fill", "none") // No fill for the line
    .style("stroke", "#7ed957") // Line color
    .style("stroke-width", 2); // Line width

    
}


function createGraph() {
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = 750 - margin.left - margin.right;
    const height = 375 - margin.top - margin.bottom;

    d3.select("#chart").selectAll("svg").remove();  

    svg = d3.select("#chart")
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

    // Creates y axis scales
    firstY = Math.max(0, minRate - 20);
    endY = maxRate + 20;

    yScale = d3.scaleLinear()
        .domain([firstY, endY]) // data values for y-axis
        .range([height, 0]); // pixel range for the graph

    // Creates the x and y axis

    const ticks = d3.range(tenMinsAge, endTime, 60); 

    svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(xScale).tickValues(ticks).tickFormat(d => secondsToHHMMSS(d)));

    svg.append("g")
    .call(d3.axisLeft(yScale));

    svg.append("g")
        .call(d3.axisLeft(yScale).ticks(10));

    if (Math.ceil(current) >= maxTime) {
        shadingRange();
    }
    // console.log(current)


    // Creates grids

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

    // Draw the line

    const line = d3.line()
        .x(d => xScale(d.second)) // Map time to the x-axis
        .y(d => yScale(d.heartrate));

    svg.append("path")
    .data([filteredData]) // Bind the data
    .attr("class", "line") // Add a class for styling (optional)
    .attr("d", line) // Draw the path based on the data
    .style("fill", "none") // No fill for the line
    .style("stroke", "#7ed957") // Line color
    .style("stroke-width", 2); // Line width

    
}

function animateSlider() {
    // draws the line
    const interval = setInterval(() => {
        if (sliderValue >= 100) {
            slider.value = 100
            clearInterval(interval); // Stop the animation when slider reaches 100
            // console.log(maxTime)

        } else {
            sliderValue += 0.175; // Increase the slider value (adjust for speed)
            slider.value = sliderValue
            currentTime(); // Update slider position
        }
    }, 50);
}

function shadingRange() {
    // resting
    const restinglow = Math.max(0, firstY);
    svg.append("rect")
    .attr("x", xScale(tenMinsAge))  // Map the start X value to the scale
    .attr("y", yScale(mod50))    // Map the end Y value to the scale (invert y-axis)
    .attr("width", xScale(endTime) - xScale(tenMinsAge))  // Rectangle width
    .attr("height", yScale(restinglow) - yScale(mod50)) // Rectangle height (invert the height)
    .attr("fill", "green")  // Rectangle color
    .style("opacity", 0.2); 

    // moderate-intensity activities
    const lowerY = Math.max(mod50, firstY);
    svg.append("rect")
    .attr("x", xScale(tenMinsAge))  // Map the start X value to the scale
    .attr("y", yScale(mod70))    // Map the end Y value to the scale (invert y-axis)
    .attr("width", xScale(endTime) - xScale(tenMinsAge))  // Rectangle width
    .attr("height", yScale(lowerY) - yScale(mod70)) // Rectangle height (invert the height)
    .attr("fill", "yellow")  // Rectangle color
    .style("opacity", 0.2); 

    // vigorous physical activity
    const higherY = Math.min(vig85, endY);
    svg.append("rect")
    .attr("x", xScale(tenMinsAge))  // Map the start X value to the scale
    .attr("y", yScale(higherY))    // Map the end Y value to the scale (invert y-axis)
    .attr("width", xScale(endTime) - xScale(tenMinsAge))  // Rectangle width
    .attr("height", yScale(mod70) - yScale(higherY)) // Rectangle height (invert the height)
    .attr("fill", "red")  // Rectangle color
    .style("opacity", 0.2); 
}

function getPatientInfoByCaseid(caseid) {
    const patient = patient_info.find(record => record.caseid === caseid.toString());
    return patient ? patient : null; // Return patient or null if not found
}

d3.csv("emergency.csv")
    .then(patients => {
        patient_info = patients
        const filepath = "./heart_rate_data/case_" + selectedCaseID + ".csv"
        return d3.csv(filepath);

    })
    .then(data => {
        processedData = processCSV(data);

        // console.log(processedData);
        // console.log(patient_info);

        // Scaling the time
        const startTime = new Date();
        startTime.setHours(0, 0, 0, 0);

        minTime = d3.min(processedData, d => d.second);
        maxTime = d3.max(processedData, d => d.second);
        numHours = Math.ceil(maxTime/3600);        

        timeScale = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d.second)])
        .range([0, 100]);

        // heart rate values
        minRate = d3.min(processedData, d => parseInt(d.heartrate));
        maxRate = d3.max(processedData, d => parseInt(d.heartrate));

        // important values
        patient_details = getPatientInfoByCaseid(selectedCaseID);
        patientAge = patient_details.age;
        maxHeartRate = maxHeartRate - patientAge;

        //surgery details
        surgeryType = patient_details.optype;
        surgeryInfo.textContent = surgeryType + ' Surgery Info'

        // for shading
        mod50 = maxHeartRate * 0.5;
        mod70 = maxHeartRate * 0.7;
        vig85 = maxHeartRate * 0.85;

        // console.log(secondsToHHMMSS(maxTime))

        // Set Up
        slider.step = 1/maxTime
        currentTime();
        animateSlider();
            
        slider.addEventListener('input', () => {
            currentTime();
            if (Math.ceil(current) < maxTime){
                shadingRange();
            }
            
        });

    })
