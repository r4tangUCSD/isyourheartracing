// STATIC STORY INFORMATION
const storyData = [
    { 
        time: 0, 
        heartRate: 72, 
        stage: 'Initial Status', 
        description: 'The human heart continuously adapts to surgical conditions, speeding up or slowing down in response to various factors. ' 
    },
    { 
        time: 15, 
        heartRate: 85, 
        stage: 'Stage 1', 
        description: 'Before a patient goes under, their heart rate might be more elevated than usual due to feeling anxious about the surgery. As the patient slowly drifts into unconsciousness, deep anesthesia might suppress the nervous system and decrease heart rate.' 
    },
    { 
        time: 45, 
        heartRate: 65, 
        stage: 'Stage 2', 
        description: 'Even while the patient is under anesthesia, the body’s autonomic nervous system can still respond to stress and pain signals. Painful procedures like incisions may trigger a stress response and make a patient’s heart beat faster.' 
    },
    { 
        time: 90, 
        heartRate: 45, 
        stage: 'Stage 3', 
        description: 'Heart rate may also increase due to a drop in blood pressure or oxygen levels. The heart will pump faster and harder to circulate blood around the body. This also helps deliver oxygen to the rest of the body.' 
    },
    { 
        time: 120, 
        heartRate: 70, 
        stage: 'Stage 4', 
        description: 'As a patient wakes up, their heart rate might rise due to the pain and discomfort caused by the procedure. Waking up from anesthesia also increase adrenaline levels. Post operation, a patient’s heart rate will slowly return to baseline levels. Yippee' 
    },
    { 
        time: 150, 
        heartRate: 82, 
        stage: 'Surgery Completion', 
        description: 'Ending heart rate' 
    }
];

// DOM element references
const silhouetteEl = document.getElementById('silhouette');
const stageNameEl = document.getElementById('stage-name');
const heartRateEl = document.getElementById('heart-rate');
const bpmBoxEl = document.getElementById('bpm-box');
const stageDescriptionEl = document.getElementById('stage-description');
const stageTimeEl = document.getElementById('stage-time');

// SCROLL FUNCTIONALITY

// create the scroll container
const scrollContainer = document.createElement('div');
scrollContainer.style.height = `${storyData.length * 100}vh`;
scrollContainer.style.position = 'absolute';
scrollContainer.style.top = '0';
scrollContainer.style.left = '0';
scrollContainer.style.width = '100%';
document.body.appendChild(scrollContainer);

// set heart rate color based on value
function getHeartRateColor(heartRate) {
    // define heart rate thresholds
    const normalLow = 60;
    const normalHigh = 80;
    const riskLow = 50;
    const riskHigh = 90;
    
    // normal (green): 60-80 bpm
    if (heartRate >= normalLow && heartRate <= normalHigh) {
        return '#7ed957'; // green
    }
    // risky (yellow): 50-60 or 80-90 bpm
    else if ((heartRate >= riskLow && heartRate < normalLow) || 
            (heartRate > normalHigh && heartRate <= riskHigh)) {
        return '#ffff00'; // yellow
    }
    // critical (red): < 50 or > 90 bpm
    else {
        return '#ff3131'; // red
    }
}

// border color opacity 
function getBorderColor(heartRate) {
    // define heart rate thresholds
    const normalLow = 60;
    const normalHigh = 80;
    const riskLow = 50;
    const riskHigh = 90;
    
    // normal (green): 60-80 bpm
    if (heartRate >= normalLow && heartRate <= normalHigh) {
        return 'rgba(126, 217, 87, 0.4)'; // green
    }
    // risky (yellow): 50-60 or 80-90 bpm
    else if ((heartRate >= riskLow && heartRate < normalLow) || 
            (heartRate > normalHigh && heartRate <= riskHigh)) {
        return 'rgba(255, 255, 0, 0.4)'; // yellow
    }
    // critical (red): < 50 or > 90 bpm
    else {
        return 'rgba(255, 49, 49, 0.4)'; // red
    }
}

// HEART ANIMATION FUNCTIONALITY

let heartEl = null;
let heartCreated = false;

// create and add the heart overlay
function createHeartOverlay() {
    // Only create the heart once
    if (heartCreated) return;
    
    heartEl = document.createElement('div');
    heartEl.id = 'heart-overlay';
    
    // link heart to body (child)
    silhouetteEl.appendChild(heartEl);
    
    // mark as created
    heartCreated = true;
    
    console.log('Heart overlay created');
}

// animate the heart based on heart rate
function animateHeart(heartRate) {
    if (!heartCreated) {
        createHeartOverlay();
    }
    
    if (!heartEl) {
        console.error('Heart element not found');
        return;
    }
    
    // calculate animation duration based on heart rate
    const beatsPerSecond = heartRate / 60;
    const animationDuration = 1 / beatsPerSecond;
    
    // apply the animation
    heartEl.style.animation = `heartbeat ${animationDuration}s ease-in-out infinite`;
    console.log(`Animating heart at ${heartRate} bpm, duration: ${animationDuration}s`);
}

// css for heart overlay and animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
#heart-overlay {
    position: absolute;
    width: 10%;
    height: 15%;
    background: url("images/heart_isolated.png") no-repeat center center;
    background-size: contain;
    /* Position relative to the silhouette element */
    top: 37%;
    left: 16%;
    z-index: 100;
    transform-origin: center;
    pointer-events: none;
}

@keyframes heartbeat {
    0% {
        transform: scale(1);
    }
    15% {
        transform: scale(1.3);
    }
    30% {
        transform: scale(1);
    }
    45% {
        transform: scale(1.2);
    }
    60% {
        transform: scale(1);
    }
    100% {
        transform: scale(1);
    }
}
`;
document.head.appendChild(styleSheet);

// SURGERY STAGE FUNCTIONALITY

// update stages function
function updateStageInfo(stage) {
    stageNameEl.textContent = stage.stage;
    heartRateEl.innerHTML = `<div id="unit" style="font-size: 2rem;">HR</div><div id="unit" style="font-size: 2rem;">bpm</div>${stage.heartRate} `;
    stageDescriptionEl.textContent = stage.description;
    stageTimeEl.textContent = `Time: ${stage.time} minutes into surgery`;
    
    // animate heart with the current heart rate
    animateHeart(stage.heartRate);

    // update heart rate color
    const heartRateColor = getHeartRateColor(stage.heartRate);
    const borderColoring = getBorderColor(stage.heartRate);
    heartRateEl.style.color = heartRateColor;
    bpmBoxEl.style.borderColor = borderColoring;
}

// scroll event handler
function handleScroll() {
    // calculate scroll progress
    const scrollProgress = window.scrollY / (scrollContainer.offsetHeight - window.innerHeight);
    
    // assign stage based on scroll progress
    const stageIndex = Math.floor(scrollProgress * (storyData.length - 1));
    const currentStage = storyData[Math.min(stageIndex, storyData.length - 1)];
    
    // update stage
    updateStageInfo(currentStage);
}

// scroll event listener
window.addEventListener('scroll', handleScroll);

// check that heart is created when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    createHeartOverlay();
    // initialize page on stage 0
    updateStageInfo(storyData[0]);
});