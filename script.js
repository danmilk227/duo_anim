const screenEl = document.getElementById('screen');
const blurContainer = document.querySelector('.layer-blur-container');
const shadowLayer = document.querySelector('.layer-shadow');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');

// State variables for interpolation
let targetTiltX = 0; // The angle we want to reach for X axis (up/down)
let targetTiltY = 0; // The angle we want to reach for Y axis (left/right)
let currentTiltX = 0;
let currentTiltY = 0;
let initialBeta = null; // For calibrating gyroscope X
let initialGamma = null; // For calibrating gyroscope Y

// Max rotation in degrees
const MAX_TILT = 40; // Slightly reduced max tilt for 2-axis better feel

// Easing factor for smooth animation (linear interpolation)
const LERP_FACTOR = 0.1;

// Function to calculate and apply the transformations
function animate() {
    // Lerp current tilt towards target tilt
    currentTiltX += (targetTiltX - currentTiltX) * LERP_FACTOR;
    currentTiltY += (targetTiltY - currentTiltY) * LERP_FACTOR;

    // Apply rotation to the screen
    // rotateX handles up/down tilt (beta), rotateY handles left/right tilt (gamma)
    screenEl.style.transform = `rotateX(${currentTiltX}deg) rotateY(${currentTiltY}deg)`;

    // Calculate total tilt magnitude to determine opacity
    const magnitude = Math.sqrt(currentTiltX * currentTiltX + currentTiltY * currentTiltY);

    // Calculate opacity based on tilt (0 to 1)
    const progress = Math.max(0, Math.min(1, magnitude / MAX_TILT));

    // Calculate gradient angle based on current tilt direction
    // Math.atan2 takes (y, x), but here x axis rotation moves the element Y (up/down)
    // We want the blur and shadow to originate from the edge that is pushed away
    // Because rotateX > 0 pushes top away, rotateY > 0 pushes right away.
    // CSS gradient angle: 0deg is bottom-to-top, 90deg is left-to-right.
    let angleRad = Math.atan2(-currentTiltY, -currentTiltX);
    let angleDeg = (angleRad * 180 / Math.PI);

    // Adjust gradient angle for CSS linear-gradient
    let cssGradientAngle = angleDeg;

    // Update masks and shadows with dynamic gradient angle
    const maskGradient = `linear-gradient(${cssGradientAngle}deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)`;
    const shadowGradient = `linear-gradient(${cssGradientAngle}deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 70%)`;

    blurContainer.style.webkitMaskImage = maskGradient;
    blurContainer.style.maskImage = maskGradient;
    shadowLayer.style.background = shadowGradient;

    // Apply opacities
    blurContainer.style.opacity = progress;
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

    // Calculate mouse coordinates relative to center of screen (-1 to 1)
    const xRatio = (e.clientX / window.innerWidth) * 2 - 1;
    const yRatio = (e.clientY / window.innerHeight) * 2 - 1;

    // Target tilt based on mouse position.
    // Mouse down -> higher yRatio -> tilt top away (positive rotateX)
    // Mouse right -> higher xRatio -> tilt right away (positive rotateY)
    targetTiltX = yRatio * MAX_TILT;
    targetTiltY = xRatio * MAX_TILT;
});

// --- Mobile Interaction: Device Orientation ---
function handleOrientation(event) {
    let beta = event.beta;   // In degree in the range [-180,180] (front-to-back tilt)
    let gamma = event.gamma; // In degree in the range [-90,90] (left-to-right tilt)

    if (beta === null || gamma === null) return;

    // Calibrate initial angle
    if (initialBeta === null) {
        initialBeta = beta;
        initialGamma = gamma;
    }

    // Calculate the difference from initial position
    let diffX = beta - initialBeta;
    let diffY = gamma - initialGamma;

    // Cap the diff for safety, map diff to target tilt
    targetTiltX = Math.max(-MAX_TILT, Math.min(MAX_TILT, diffX));
    targetTiltY = Math.max(-MAX_TILT, Math.min(MAX_TILT, diffY));
}

// Start button for mobile (iOS requires user interaction to request permission)
startBtn.addEventListener('click', async () => {
    // Request Fullscreen
    if (!document.fullscreenElement) {
        try {
            await document.documentElement.requestFullscreen();
        } catch (err) {
            console.warn(`Error attempting to enable fullscreen: ${err.message}`);
        }
    }

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
