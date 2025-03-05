const storyData = [
    { 
        time: 0, 
        heartRate: 72, 
        stage: 'Initial Status', 
        description: 'Starting heart rate' 
    },
    { 
        time: 15, 
        heartRate: 85, 
        stage: 'Stage 1', 
        description: 'Description' 
    },
    { 
        time: 45, 
        heartRate: 65, 
        stage: 'Stage 2', 
        description: 'Description' 
    },
    { 
        time: 90, 
        heartRate: 55, 
        stage: 'Stage 3', 
        description: 'Description' 
    },
    { 
        time: 120, 
        heartRate: 70, 
        stage: 'Stage 4', 
        description: 'Description' 
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
const stageDescriptionEl = document.getElementById('stage-description');
const stageTimeEl = document.getElementById('stage-time');

// create the scroll container
const scrollContainer = document.createElement('div');
scrollContainer.style.height = `${storyData.length * 100}vh`;
scrollContainer.style.position = 'absolute';
scrollContainer.style.top = '0';
scrollContainer.style.left = '0';
scrollContainer.style.width = '100%';
document.body.appendChild(scrollContainer);

// update stages function
function updateStageInfo(stage) {
    stageNameEl.textContent = stage.stage;
    heartRateEl.innerHTML = `${stage.heartRate} <span style="font-size: 2rem;">bpm</span>`;
    stageDescriptionEl.textContent = stage.description;
    stageTimeEl.textContent = `Time: ${stage.time} minutes into surgery`;
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

// initialize page on stage 0
updateStageInfo(storyData[0]);