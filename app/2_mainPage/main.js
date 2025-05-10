// DOM Elements and State
const elements = {
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    rightHandBtn: document.getElementById('right-hand-btn'),
    leftHandBtn: document.getElementById('left-hand-btn'),
    fingerBtns: document.querySelectorAll('.finger-btn'),
    predictionResult: document.getElementById('predictionResult'),
    bloodGroupDetails: document.getElementById('bloodGroupDetails'),
    dynamicFact: document.getElementById('dynamicFact'),
    bloodExamples: document.querySelectorAll('.blood-type-examples .example')
};

let state = {
    selectedHand: 'right',
    selectedFinger: null,
    uploadedImage: null,
    isPredicted: false
};

let defaultBloodDetailsContent = null;

// Initialize the app
function init() {
    setDefaultSelections();
    setupEventListeners();
    
    // Store default content
    defaultBloodDetailsContent = elements.bloodGroupDetails.innerHTML;
}

function setDefaultSelections() {
    elements.rightHandBtn.classList.add('active');
}

function setupEventListeners() {
    // Hand selection
    elements.rightHandBtn.addEventListener('click', () => selectHand('right'));
    elements.leftHandBtn.addEventListener('click', () => selectHand('left'));
    
    // Finger selection
    elements.fingerBtns.forEach(btn => {
        btn.addEventListener('click', () => selectFinger(btn.dataset.finger));
    });
    
    // File handling
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.uploadArea.addEventListener('click', (e) => {
        if (e.target === elements.uploadArea) {
            triggerFileInput();
        }
    });
    elements.uploadArea.addEventListener('dragover', dragOverHandler);
    elements.uploadArea.addEventListener('drop', dropHandler);
}


// Selection handlers
function selectHand(hand) {
    state.selectedHand = hand;
    elements.rightHandBtn.classList.toggle('active', hand === 'right');
    elements.leftHandBtn.classList.toggle('active', hand === 'left');
}

function selectFinger(finger) {
    state.selectedFinger = finger;
    elements.fingerBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.finger === finger);
    });
}

// File handling
function triggerFileInput() {
    elements.fileInput.click();
}

function dragOverHandler(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
}

function dropHandler(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
    }
}

function handleFileSelect(e) {
    if (e.target.files.length) {
        handleFiles(e.target.files);
    }
}

function handleFiles(files) {
    const file = files[0];
    
    if (!file.type.startsWith('image/')) {
        swal("Error", "Please upload an image file", "error");
        return;
    }
    
    state.uploadedImage = file;
    const reader = new FileReader();
    
    reader.onload = (e) => {
        elements.uploadArea.innerHTML = `
            <img src="${e.target.result}" 
                 alt="Uploaded fingerprint" 
                 style="max-width: 100%; max-height: 100%; border-radius: 8px;">
        `;
    };
    
    reader.onerror = () => {
        swal("Error", "Failed to read the image file", "error");
    };
    
    reader.readAsDataURL(file);
}

// Function to show the reload button
function showReloadButton() {
    const reloadBtn = document.querySelector('.page-reload');
    reloadBtn.classList.add('visible');

    reloadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        document.body.classList.add('fade-out');        
        // Reload after the transition completes
        setTimeout(() => {
            window.location.reload();
        }, 300); // 3 second transition
    });
}




// API Integration
async function processFingerprints() {
    // Validate inputs
    if (!state.uploadedImage) {
        swal("Error", "Please upload a fingerprint image", "error");
        return;
    }
    
    if (!state.selectedHand) {
        swal("Error", "Please select a hand", "error");
        return;
    }
    
    if (!state.selectedFinger) {
        swal("Error", "Please select a finger", "error");
        return;
    }
    
    // Show loading state
    const overlay = createLoadingOverlay();
    document.body.appendChild(overlay);
    
    try {
        const formData = new FormData();
        formData.append('file', state.uploadedImage);
        formData.append('hand', state.selectedHand);
        formData.append('finger', state.selectedFinger);
        
        const response = await fetch('http://localhost:5001/predict', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        displayResults(result);
        
    } catch (error) {
        console.error('Error:', error);
        swal("Error", error.message || "Failed to process fingerprint. Please try again.", "error");
    } finally {
        document.body.removeChild(overlay);
    }
    showReloadButton();
}

function createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'blur-overlay';
    overlay.innerHTML = `
        <div>Processing your fingerprint...</div>
        <div class="loader">⌛</div>
    `;
    return overlay;
}

function displayResults(result) {
    state.isPredicted = true;
    
    // Update prediction result
    elements.predictionResult.innerHTML = `
        <div class="blood-type-result">
            <span class="type" style="font-size:60px; font-weight:bold;">${result.blood_type}</span>
            <p>Predicted with ${result.confidence}% confidence</p>
            <p>Finger: ${state.selectedFinger} (${state.selectedHand} hand)</p>
        </div>
    `;
    
    const factsHeading = document.querySelector('.blood-group-details-box h2');
    factsHeading.textContent = `More About ${result.blood_type} Blood Group`;
    
    // Update blood group details
    updateBloodGroupDetails(result.blood_type);
    
    // Hide the "waste" message
    document.querySelector('.waste').style.display = 'none';
    document.querySelector('.did-you-know-box').style.display = 'none';
    
    // Animate results
    document.querySelector('.right-side').classList.add('results-visible');
}

// Blood type information display
function updateBloodGroupDetails(bloodType) {
    const typeInfo = getBloodTypeInfo(bloodType);
    
    elements.bloodGroupDetails.innerHTML = `
        <div class="blood-type-details">
            <div class="details-grid">
                <div class="detail-item">
                    <h4>Can Donate To</h4><p>${typeInfo.donation}</p>
                </div>
                <div class="detail-item">
                    <h4>Can Receive From</h4><p>${typeInfo.receiving}</p>
                </div>
                <div class="detail-item">
                    <p>${typeInfo.description}</p>
                </div>
                <div class="detail-item">
                    <h4>Medical Advantages</h4><p>${typeInfo.medical}</p>
                </div>
                <div class="detail-item">
                    <h4>Best Career Matches</h4><p>${typeInfo.careers}</p>
                </div>
                <div class="detail-item">
                    <h4>Trait-Highlights</h4><p>${typeInfo.traits}</p>
                </div>
            </div>
        </div>
    `;
    
    elements.bloodGroupDetails.classList.add('updated');
}

function getBloodTypeInfo(bloodType) {
    const typeInfo = {
        'A+': {
            description: "It is the second most common blood type, approximately found in 28% of the global population. People with this blood have A antigens and Rh factor on their red blood cells.",
            donation: "A+ and AB+ blood type recipients",
            receiving: "A+, A-, O+ and O- blood type donors",
            traits: "Often conscientious and cooperative team players. Tend to be detail-oriented with strong planning skills. Many show remarkable creativity in structured environments.",
            medical: "Have lower risk of pancreatic cancer, better stress hormone regulation, may have higher cortisol levels and digest carbohydrates well.",
            careers: "Researchers, artists, accountants, and healthcare professionals"
        },
        'A-': {
            description: "It is relatively rare blood type, approximately found in 6% of the global population. Red blood cells lacks the Rh factor but has A antigens.",
            donation: "A+, A-, AB+ and AB- blood type recipients",
            receiving: "A- and O- blood type donors",
            traits: "Known for being reliable and organized. Often creative and innovative with artistic sensitivity and strong attention to details. Often demonstrate strong problem-solving skills and may have excellent focus and concentration abilities. Many possess excellent pattern recognition abilities.",
            medical: "Universal platelet donors for all blood types, lower cardiovascular disease risk",
            careers: "Designers, scientists, writers, and precision-based fields"
        },
        'B+': {
            description: "It is very common blood type in Asian populations, and roughly found in 22% of the global population. Red blood cells contains B antigens and Rh factor.",
            donation: "B+ and AB+ blood type recipients",
            receiving: "B+, B-, O+ and O- blood type donors",
            traits: "Typically adaptable and optimistic in challenges. Often excel in dynamic, changing situations. Many display strong practical intelligence and hands-on skills.",
            medical: "Better gut microbiome diversity, stronger immune responses",
            careers: "Chefs, athletes, journalists, and emergency responders"
        },
        'B-': {
            description: "One of the rarest blood types, roughly found only in 2% of people worldwide. Red blood cells has B antigens but no Rh factor.",
            donation: "B+, B-, AB+ and AB- blood type recipients",
            receiving: "B- and O- donors",
            traits: "Curious and independent thinkers with strong focus and problem-solving skills. Frequently inventive in technical fields and are good at multitasking. Often show exceptional dedication to specialized interests. May have natural leadership qualities and high curiosity.",
            medical: "Rare blood type makes donations extremely valuable",
            careers: "Engineers, musicians, surgeons, and technology innovators"
        },
        'AB+': {
            description: "Quite rare blood type, present just in 4% of the global population. Red blood cells contains both A and B antigens with Rh factor.",
            donation: "Other AB+ recipients",
            receiving: "All blood types (Universal Recipient)",
            traits: "Rational yet empathetic with good diplomacy skills. Often excel at seeing multiple perspectives. Many demonstrate strong communication skills and advanced emotional intelligence.",
            medical: "Universal plasma donors, lowest heart disease risk",
            careers: "Psychologists, mediators, professors, and humanitarian work"
        },
        'AB-': {
            description: "Extremely Rare and valuable blood type, present in less than 1% of the population worldwide. Red blood cells has both A and B antigens but lacks Rh factor, hence valuable for plasma donations.",
            donation: "AB+ and AB- blood type recipients",
            receiving: "A-, B-, AB- and O- donors",
            traits: "Visionary thinkers with strong intuition. Often perceptive and good at reading people. Frequently innovative in artistic or scientific fields. Often combine logic and creativity effectively.",
            medical: "Excellent plasma compatibility, rare donor value",
            careers: "Architects, researchers, artists, and strategic planners"
        },
        'O+': {
            description: "The most common blood type, approximately 37% of people globally have this blood type. Red blood cells has no A or B antigens but does have Rh factor.",
            donation: "All Rh-positive blood type(O+, A+, B+, AB+) recipients",
            receiving: "O+ and O- donors",
            traits: "Natural leaders with strong initiative. Often resilient in challenging situations. Generally confident and many demonstrate excellent crisis management abilities. May have strong physical endurance and practical thinking.",
            medical: "Lower risk of blood clots, strong circulatory health",
            careers: "CEOs, military personnel, athletes, and first responders"
        },
        'O-': {
            description: "About 7% of the world's population have this blood type. Red blood cells lacks both A/B antigens and Rh factor.",
            donation: "All blood types (universal donor)",
            receiving: "other O- donors",
            traits: "Strong-willed and adventurous yet principled with strong ethics. Frequently show courage in unconventional paths. Many possess remarkable physical endurance. Often generous and community-oriented. May have excellent survival instincts and quick decision-making skills.",
            medical: "Universal red-cell/blood donors, most requested for emergencies and newborns",
            careers: "Explorers, social workers, firefighters, and entrepreneurs"
        }
    };
    
    return typeInfo[bloodType] || {
        description: "Unknown blood type",
        donation: "N/A",
        receiving: "N/A",
        population: "N/A"
    };
}

// Facts data
const facts = [
    "People with type O- blood are universal donors and can give blood to anyone.",
    "AB+ blood type individuals can receive blood from any other blood type (universal recipients).",
    "Blood type can influence susceptibility to certain diseases and conditions.",
    "Your blood type is determined by antigens on the surface of your red blood cells.",
    "Type O blood is the most common worldwide, while AB- is the rarest.",
    "Blood types are inherited from your parents through a combination of their genes.",
    "Some blood types are more common in certain parts of the world than others.",
    "Your blood type might affect your personality according to some theories in Japan.",
    "Only 7% of people have O- blood type & can only receive from O- donors.", 
    "A+ can receive from A+, A-, O+, O-",
    "B- can receive from B- and O- donors"
];

let currentFactIndex = 0;

function showFact(index) {
    document.getElementById('dynamicFact').innerHTML = `<p>${facts[index]}</p>`;
}

function nextFact() {
    currentFactIndex = (currentFactIndex + 1) % facts.length;
    showFact(currentFactIndex);
}

function prevFact() {
    currentFactIndex = (currentFactIndex - 1 + facts.length) % facts.length;
    showFact(currentFactIndex);
}

// Auto-rotate facts every 8 seconds
setInterval(nextFact, 8000);

// Initialize with first fact
showFact(0);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);