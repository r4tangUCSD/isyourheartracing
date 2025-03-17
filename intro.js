document.addEventListener('DOMContentLoaded', function() {
    const introSection = document.getElementById('intro-section');
    const introSecond = document.getElementById('intro-second');
    const storySection = document.getElementById('story-section');
    const bubbleSection = document.getElementById('bubble-section');
    const graphSection = document.getElementById('graph-section');
    const finalSection = document.getElementById('final-section');
    const heartbeatLine = document.getElementById('heartbeat-line');
    const introText = document.getElementById('intro-text');
    const startButton = document.getElementById('start-button');
    const doneButton = document.getElementById('done-button');

    // RUN INTRO
    startIntroSequence();

    // event listeners for buttons
    startButton.addEventListener('click', startExploration);
    
    doneButton.addEventListener('click', function() {
        // Hide current sections
        bubbleSection.style.display = 'none';
        graphSection.style.display = 'none';
        
        // Show final section
        finalSection.classList.remove('hidden');
        finalSection.classList.add('active');
        
        // Add visible class to text for fade-in effect
        setTimeout(() => {
            const finalText = finalSection.querySelector('.intro-text');
            finalText.classList.add('visible');
        }, 850);
    });

    // intro animation sequence
    function startIntroSequence() {
        // 1: animate heartbeat line - starting from left and ending in the middle
        setTimeout(() => {
            // generate heartbeat EKG pattern - using half width to stop halfway
            const svgPath = document.getElementById('heartbeat-path');
            const pathData = generateHeartbeatPath(500, 50, 3); // width, baseline, # of beats - reduced to stop halfway
            svgPath.setAttribute('d', pathData);
    
            // trigger animation
            svgPath.style.animation = 'none';
            svgPath.offsetHeight; // Trigger reflow
            svgPath.style.animation = 'dash 3s ease-in-out forwards';
        }, 500);

        // show group names and icon
        setTimeout(() => {
            const groupCredits = document.getElementById('group-credits');
            const teamIcon = document.getElementById('team-icon');
            
            groupCredits.classList.add('visible');
            teamIcon.classList.add('visible');
        }, 4000);

        // 2: fade in the intro text
        setTimeout(() => {
            introText.classList.add('visible');
            
            const titleElement = document.querySelector('#intro-text h1');
            if (titleElement) {
                const titleText = titleElement.textContent;
                const updatedText = titleText.replace('Racing', '<span class="racing-text">Racing</span>');
                titleElement.innerHTML = updatedText;
            }
            
            // change racing text to red after a delay
            setTimeout(() => {
                const racingSpan = document.querySelector('.racing-text');
                if (racingSpan) {
                    racingSpan.style.color = '#ff3131';
                }
            }, 2000);
        }, 3500);

        // 3: transition to case intro screen - increased delay for longer reading time
        setTimeout(() => {
            fadeTransition(introSection, introSecond);
            
            // fade in text
            setTimeout(() => {
                const secondIntroText = introSecond.querySelector('.intro-text');
                secondIntroText.classList.add('visible');
                
                // show start button (after delay)
                setTimeout(() => {
                    startButton.classList.add('visible');
                }, 1000);
            }, 1000);
        }, 12000); // IN ms
    }

    // function to handle fade transition between sections
    function fadeTransition(fromSection, toSection) {
        fromSection.classList.add('fade-out');
        
        setTimeout(() => {
            fromSection.classList.remove('active');
            fromSection.classList.add('hidden');
            fromSection.classList.remove('fade-out');
            
            toSection.classList.remove('hidden');
            toSection.classList.add('active');
        }, 1000);
    }

    // function to start the main exploration
    function startExploration() {
        // hide intro section, show story section
        introSecond.classList.add('fade-out');
        
        setTimeout(() => {
            introSecond.classList.remove('active');
            introSecond.classList.add('hidden');
            introSecond.classList.remove('fade-out');
            
            // show the story section
            storySection.classList.remove('hidden');
            storySection.style.display = 'block';
        }, 1000);
    }
});

// function to generate an EKG-like path
function generateHeartbeatPath(width, baseline, numBeats) {
    let path = `M0,${baseline} `;
    const beatWidth = width / numBeats;
    const segments = 8; // segments per beat
    
    for (let i = 0; i < numBeats; i++) {
      const startX = i * beatWidth;
      
      // First segment - slight rise
      path += `L${startX + beatWidth * 0.1},${baseline - 5} `;
      
      // P wave
      path += `L${startX + beatWidth * 0.2},${baseline - 10} `;
      
      // Back to baseline
      path += `L${startX + beatWidth * 0.3},${baseline} `;
      
      // Q dip
      path += `L${startX + beatWidth * 0.35},${baseline + 5} `;
      
      // R spike
      path += `L${startX + beatWidth * 0.4},${baseline - 40} `;
      
      // S dip
      path += `L${startX + beatWidth * 0.45},${baseline + 15} `;
      
      // Back to baseline
      path += `L${startX + beatWidth * 0.5},${baseline} `;
      
      // T wave
      path += `L${startX + beatWidth * 0.7},${baseline - 15} `;
      
      // Back to baseline
      path += `L${startX + beatWidth * 0.9},${baseline} `;
    }
    
    return path;
}

// listen for custom event from story.js when scrollytelling is done
document.addEventListener('scrollytellingComplete', function() {
    // show bubble section
    document.getElementById('story-section').style.display = 'none';
    document.getElementById('bubble-section').style.display = 'block';
});