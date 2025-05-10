/**
 * Fingerprint Data Collection Application
 * 
 * This script handles:
 * - Scanner status checking
 * - Fingerprint image capture (both scanner and file upload)
 * - Blood group selection
 * - Form submission with data validation
 * - Data reset functionality
 */

// ====================== Global State ======================
// Track selected blood group and fingerprint data
const appState = {
  selectedBloodGroup: null,
  scannerAvailable: false,
  fingerprintData: {
      'Right Hand': {
          'Thumb': null,
          'Index Finger': null,
          'Middle Finger': null,
          'Ring Finger': null,
          'Little Finger': null
      },
      'Left Hand': {
          'Thumb': null,
          'Index Finger': null,
          'Middle Finger': null,
          'Ring Finger': null,
          'Little Finger': null
      }
  }
};

// ====================== Initialization ======================
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
  await checkScannerStatus();
  setupEventListeners();
}

function setupEventListeners() {
  // Setup any additional event listeners if needed
}

// ====================== Scanner Functions ======================
async function checkScannerStatus() {
  try {
      const response = await fetch('http://localhost:3000/check-scanner');
      const result = await response.json();
      appState.scannerAvailable = result.connected;
      updateScannerUI();
  } catch (error) {
      console.error("Scanner check failed:", error);
      appState.scannerAvailable = false;
      updateScannerUI();
  }
}

function updateScannerUI() {
  const statusElement = document.getElementById('scannerStatus');
  if (statusElement) {
      statusElement.textContent = `Scanner: ${appState.scannerAvailable ? 'Connected' : 'Not Connected'}`;
      statusElement.className = appState.scannerAvailable ? 'scanner-connected' : 'scanner-disconnected';
  }
}

// ====================== Image Handling-Upload/Scan ======================
async function uploadImage(element) {
  if (appState.scannerAvailable) {
      const { value } = await Swal.fire({
          title: 'Select Input Method',
          showDenyButton: true,
          showCancelButton: true,
          confirmButtonText: 'Use Scanner',
          denyButtonText: 'Upload File',
      });
      
      if (value === true) {
          await useScanner(element);
      } else if (value === false) {
          uploadImageFile(element);
      }
  } else {
      uploadImageFile(element);
  }
}

async function useScanner(element) {
  try {
      Swal.fire({
          title: 'Scanning Fingerprint',
          html: 'Please place your finger on the scanner...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
      });
      
      const response = await fetch('http://localhost:3000/scan-fingerprint', {
          method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
          const imageUrl = `http://localhost:3000/get-scan/${result.image_path}`;
          handleImageUpload(element, imageUrl);
          Swal.close();
      } else {
          throw new Error(result.message || "Failed to scan fingerprint");
      }
  } catch (error) {
      Swal.fire('Error', error.message || "Scan failed", 'error');
      console.error("Scanner error:", error);
  }
}

function uploadImageFile(element) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  
  input.onchange = e => {
      const file = e.target.files[0];
      if (file && file.type.match('image.*')) {
          const reader = new FileReader();
          reader.onload = event => handleImageUpload(element, event.target.result);
          reader.readAsDataURL(file);
      }
  };
  input.click();
}

function handleImageUpload(element, imageData) {
  const img = document.createElement('img');
  img.src = imageData;
  img.style.maxWidth = '100%';
  img.style.maxHeight = '100%';
  
  element.innerHTML = '';
  element.appendChild(img);
  element.dataset.uploaded = "true";
  
  const handType = element.dataset.hand + " Hand";
  const fingerType = element.dataset.finger;
  
  appState.fingerprintData[handType][fingerType] = imageData;
  console.log(`Saved ${fingerType} of ${handType}`);
}

// ====================== Blood Group Selection ======================
function selectBloodGroup(button) {
  document.querySelectorAll('.blood-group-btn').forEach(btn => {
      btn.classList.remove('selected');
  });
  button.classList.add('selected');
  appState.selectedBloodGroup = button.textContent;
}

// ====================== Form Submission ======================
async function submitForm() {
  if (!validateForm()) return;
  
  try {
      await saveFingerprintData();
      await Swal.fire('Success', 'Data saved successfully!', 'success');
      resetForm();
  } catch (error) {
      Swal.fire('Error', error.message || "Save failed", 'error');
      console.error(error);
  }
}

function validateForm() {
  const uploadedCount = Object.values(appState.fingerprintData['Right Hand']).concat(
      Object.values(appState.fingerprintData['Left Hand'])
  ).filter(img => img !== null).length;
  
  if (uploadedCount === 0) {
      Swal.fire('Error', 'Please upload at least one fingerprint image', 'error');
      return false;
  }
  
  if (!appState.selectedBloodGroup) {
      Swal.fire('Error', 'Please select a blood group', 'error');
      return false;
  }
  
  return true;
}

async function saveFingerprintData() {
  Swal.fire({
      title: 'Saving Data',
      html: 'Please wait...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
  });
  
  const response = await fetch('http://localhost:3000/save-fingerprints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          bloodGroup: appState.selectedBloodGroup,
          fingerprints: appState.fingerprintData
      })
  });
  
  const result = await response.json();
  
  if (!result.success) {
      throw new Error(result.message || "Failed to save data");
  }
}

// ====================== Form Reset ======================
function resetForm() {
  // Reset UI
  document.querySelectorAll('.upload-box').forEach(box => {
      box.innerHTML = box.dataset.finger;
      box.dataset.uploaded = "false";
  });
  
  document.querySelectorAll('.blood-group-btn').forEach(btn => {
      btn.classList.remove('selected');
  });
  
  // Reset state
  appState.selectedBloodGroup = null;
  Object.keys(appState.fingerprintData['Right Hand']).forEach(key => {
      appState.fingerprintData['Right Hand'][key] = null;
  });
  Object.keys(appState.fingerprintData['Left Hand']).forEach(key => {
      appState.fingerprintData['Left Hand'][key] = null;
  });
}

// ====================== Navigation ======================
function goToBGPage() {
  window.location.href = "../2_mainPage/index.html";
}