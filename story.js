// Import bubble function
import { loadData } from './bubbles_viz.js';

// STATIC STORY INFORMATION
const storyData = [
    { 
        time: 0, 
        heartRate: 61, 
        stage: 'Initial Status', 
        description: 'This is Patient 32, a 74 year old man about to undergo gallbladder removal surgery. Doctors have decided to remove his gallstones with a laparoscopic cholecystectomy.' 
    },
    { 
        time: 15, 
        heartRate: 100, 
        stage: 'Anesthesia Administered', 
        description: 'The surgery is minimally invasive, but gallstones pose a real risk to someone his age. He\'d be more prone to infection, inflammation, and abdominal pain. Patient 32\'s heart rate spikes after settling from anesthesia.' 
    },
    { 
        time: 25, 
        heartRate: 123, 
        stage: 'CO2 Inflation', 
        description: 'His abdomen was inflated with carbon dioxide to create space for the surgeons to work. If his body absorbed too much CO2, his blood chemistry could be altered; his body is working extra hard to keep this regulated.' 
    },
    { 
        time: 30, 
        heartRate: 140, 
        stage: 'Irritation and Risk', 
        description: 'The gallbladder is relatively close to the diaphragm, which is closely linked to heart rate regulation; since it was irritated during the procedure, it caused bursts of increased heart rate before the body could stabilize.' 
    },
    { 
        time: 40, 
        heartRate: 55, 
        stage: 'Hypertension', 
        description: 'Patient 32 has a history of hypertension, making him more susecptible to blood pressure changes. Doctors had to keep a careful eye on his heart rate. Thankfully, this surgery was successful!' 
    },
    { 
        time: 55, 
        heartRate: 82, 
        stage: 'Surgery Completion', 
        description: 'Goodbye to your gallbladder, Patient 32!\nKeep scrolling for more stories.' 
    },
    { 
        time: 55, 
        heartRate: 82, 
        stage: 'Let\'s explore more!', 
        description: 'Loading visualization...' 
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
scrollContainer.style.height = `${storyData.length * 50}vh`;
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
    
    // resting (green)
    if (heartRate < 72) {
        return '#2db41e'; 
    }
    // moderate (yellow)
    else if (heartRate < 102) {
        return '#FEED53';
    }
    // high (red)
    else {
        return '#F63C4C'; 
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

    // calculate heart size based on heart rate
    // scale heart size between 15% (at 45 bpm) to 25% (at 90 bpm)
    const minRate = 45;  // lowest rate in your data
    const maxRate = 90;  // highest reasonable rate
    const minSize = 15;  // minimum size (%)
    const maxSize = 20;  // maximum size (%)
    
    // calculate the size as a percentage between minSize and maxSize
    const sizePercent = minSize + (Math.min(Math.max(heartRate - minRate, 0), maxRate - minRate) / (maxRate - minRate)) * (maxSize - minSize);
    
    // set the heart size
    heartEl.style.width = `${sizePercent}%`;
    heartEl.style.height = `${sizePercent}%`;
    
    // calculate scale for animation based on heart rate
    const minScale = 1.2;  // minimum scale for beats
    const maxScale = 1.5;  // maximum scale for beats
    const scaleAmount = minScale + (Math.min(Math.max(heartRate - minRate, 0), maxRate - minRate) / (maxRate - minRate)) * (maxScale - minScale);
    
    // update the animation with dynamic scale values
    heartEl.style.setProperty('--scale-amount', scaleAmount);
    
    // apply the animation
    heartEl.style.animation = `heartbeat ${animationDuration}s ease-in-out infinite`;
    console.log(`Animating heart at ${heartRate} bpm, duration: ${animationDuration}s`);
}

// css for heart overlay and animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
#heart-overlay {
    position: absolute;
    width: 17%;
    height: 13%;
    background: url("images/heart_isolated.png") no-repeat center center;
    background-size: contain;
    /* position relative to the silhouette element */
    top: 43%;
    left: 21%;
    transform: translate(-50%, -50%);
    z-index: 100;
    transform-origin: center;
    pointer-events: none;
    /* make size transitions smooth */
    transition: width 0.5s, height 0.5s;
    --scale-amount: 1.3;
}

@keyframes heartbeat {
    0% {
        transform: translate(-50%, -50%) scale(1);
    }
    15% {
        transform: translate(-50%, -50%) scale(var(--scale-amount));
    }
    30% {
        transform: translate(-50%, -50%) scale(1);
    }
    45% {
        transform: translate(-50%, -50%) scale(calc(var(--scale-amount) * 0.9));
    }
    60% {
        transform: translate(-50%, -50%) scale(1);
    }
    100% {
        transform: translate(-50%, -50%) scale(1);
    }
}
`;

document.head.appendChild(styleSheet);

// SURGERY STAGE FUNCTIONALITY

// update stages function
function updateStageInfo(stage) {
    stageNameEl.textContent = stage.stage;
    heartRateEl.innerHTML = `<div id="unit" style="font-size: 2rem; font-family: 'OCR-B', sans-serif;">HR</div>
    <div id="unit" style="font-size: 2rem; font-family: 'OCR-B', sans-serif;">bpm</div>
    <span style="font-family: 'OCR-B', sans-serif;">${stage.heartRate}</span>`;
    stageDescriptionEl.textContent = stage.description;
    stageTimeEl.innerHTML = `
    <p>Time: ${stage.time} minutes into surgery </p>
    <p>${Math.round(stage.time/55 * 100)}% through the surgery`;

    console.log(stage.time)
    
    // animate heart with the current heart rate
    animateHeart(stage.heartRate);

    // update heart rate color
    const heartRateColor = getHeartRateColor(stage.heartRate);
    const borderColoring = getHeartRateColor(stage.heartRate);
    heartRateEl.style.color = heartRateColor;
    bpmBoxEl.style.borderColor = borderColoring;

    stageNameEl.style.color = heartRateColor
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

    // If we are at the last stage, transition to visualization
    if (stageIndex === storyData.length - 1) {
        setTimeout(transitionToVisualization, 1500); // Small delay before transition
    }
}

// Function to transition to visualization (either bubbles or graph)
function transitionToVisualization() {
    // Fade out the story section
    document.getElementById('story-section').style.opacity = '0';

    setTimeout(() => {
        // Hide the story and show visualization
        document.getElementById('story-section').style.display = 'none';
        document.getElementById('bubble-section').style.display = 'block';

        // Reset scroll position
        window.scrollTo({ top: 0, behavior: 'instant' });

        if (scrollContainer) {
            scrollContainer.remove();
        }

        // Set overflow to hidden to remove scroll
        document.body.style.overflow = 'hidden';

        // Apply fade-in effect with a slight delay
        setTimeout(() => {
            document.getElementById('bubble-section').style.opacity = '1';
            
            // Load the visualization data
            loadData().then(() => {
                // Wait a bit more to ensure the visualization container is fully visible
                /*setTimeout(() => {
                    refreshVisualization();
                }, 300);*/
            });
        }, 300);

    }, 1000); // Matches fade-out duration
}

// Add fade effect styles
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('story-section').style.transition = "opacity 1s ease";
    document.getElementById('bubble-section').style.transition = "opacity 1s ease";
});

// scroll event listener
window.addEventListener('scroll', handleScroll);

// check that heart is created when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    createHeartOverlay();
    // initialize page on stage 0
    updateStageInfo(storyData[0]);
});