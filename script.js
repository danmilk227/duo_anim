const screenEl = document.getElementById('screen');
const blurLayer = document.querySelector('.layer-blur');
const shadowLayer = document.querySelector('.layer-shadow');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');

// State variables for interpolation
let targetTilt = 0; // The angle we want to reach
let currentTilt = 0; // The angle we are currently at
let initialBeta = null; // For calibrating gyroscope

// Max rotation in degrees
const MAX_TILT = 50;

// Easing factor for smooth animation (linear interpolation)
const LERP_FACTOR = 0.1;

// Function to calculate and apply the transformations
function animate() {
    // Lerp current tilt towards target tilt
    currentTilt += (targetTilt - currentTilt) * LERP_FACTOR;

    // Apply rotation to the screen
    // We rotate forwards (positive X) so the top tilts away from the viewer in 3D perspective
    screenEl.style.transform = `rotateX(${currentTilt}deg)`;

    // Calculate opacity based on tilt (0 to 1)
    // When tilt is 0, opacity is 0. When tilt is MAX_TILT, opacity is 1.
    const progress = Math.max(0, Math.min(1, currentTilt / MAX_TILT));

    // Apply opacities
    blurLayer.style.opacity = progress;
    shadowLayer.style.opacity = progress * 0.8; // Max shadow 0.8 opacity

    // Continue loop
    requestAnimationFrame(animate);
}

// Start animation loop
requestAnimationFrame(animate);

// --- Desktop Interaction: Mouse Move ---
document.addEventListener('mousemove', (e) => {
    // Only apply mouse interaction if we haven't calibrated mobile gyro
    if (initialBeta !== null) return;

    // Calculate mouse Y position relative to screen height
    const yRatio = e.clientY / window.innerHeight;

    // Reverse the ratio so moving mouse down (higher yRatio) increases tilt
    // Map yRatio (0 to 1) to tilt (0 to MAX_TILT)
    targetTilt = Math.max(0, Math.min(MAX_TILT, yRatio * MAX_TILT));
});

// --- Mobile Interaction: Device Orientation ---
function handleOrientation(event) {
    let beta = event.beta; // In degree in the range [-180,180]

    if (beta === null) return;

    // Calibrate initial angle
    if (initialBeta === null) {
        initialBeta = beta;
    }

    // Calculate the difference from initial position
    // We want the effect when the device tilts "towards" the user (screen faces more up)
    let diff = beta - initialBeta;

    // Cap the diff for safety, negative diff means tilting away, positive means tilting towards user
    targetTilt = Math.max(0, Math.min(MAX_TILT, diff));
}

// Start button for mobile (iOS requires user interaction to request permission)
startBtn.addEventListener('click', async () => {
    // Hide overlay
    startOverlay.style.opacity = '0';
    setTimeout(() => {
        startOverlay.style.display = 'none';
    }, 500);

    // Request permission for iOS 13+ devices
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permissionState = await DeviceOrientationEvent.requestPermission();
            if (permissionState === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation);
            } else {
                console.warn('Device orientation permission denied');
            }
        } catch (error) {
            console.error('Error requesting device orientation permission', error);
        }
    } else {
        // Non iOS 13+ devices
        window.addEventListener('deviceorientation', handleOrientation);
    }
});
