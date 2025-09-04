// Orientation Manager for handling device orientation changes and overlay management
// Uses global window pattern for Phaser compatibility
window.OrientationManager = class OrientationManager {
    constructor() {
        // State properties
        this.currentOrientation = null;
        this.overlayVisible = false;
        this.gameInitialized = false;
        this.gamePaused = false;
        
        // Callbacks for orientation changes
        this.callbacks = {
            onOrientationChange: [],
            onOverlayShow: [],
            onOverlayHide: []
        };
        
        // Debounce timer
        this.debounceTimer = null;
        this.debounceDelay = 300; // milliseconds
        
        // References
        this.overlayController = null;
        this.gameScene = null;
    }
    
    // Initialize the orientation manager
    init(options = {}) {
        console.log('📐 Initializing OrientationManager...');
        
        // Store options
        this.gameScene = options.gameScene || null;
        this.overlayController = options.overlayController || null;
        
        // Get initial orientation
        this.currentOrientation = this._getCurrentOrientation();
        console.log(`📐 Initial orientation: ${this.currentOrientation}`);
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Check initial state if on mobile
        if (window.deviceDetection && window.deviceDetection.isMobileOrTablet()) {
            console.log('📐 Mobile device detected, checking orientation...');
            this._checkOrientation();
        }
        
        this.gameInitialized = true;
        console.log('📐 OrientationManager initialized');
    }
    
    // Get current orientation using DeviceDetectionService
    _getCurrentOrientation() {
        if (window.deviceDetection) {
            return window.deviceDetection.getOrientation();
        }
        // Fallback
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }
    
    // Set up event listeners for orientation changes
    _setupEventListeners() {
        // Method 1: orientationchange event (older but widely supported)
        window.addEventListener('orientationchange', () => {
            console.log('📐 orientationchange event fired');
            this._handleOrientationChange();
        });
        
        // Method 2: resize event with orientation check
        window.addEventListener('resize', () => {
            const newOrientation = this._getCurrentOrientation();
            if (newOrientation !== this.currentOrientation) {
                console.log('📐 Orientation changed via resize event');
                this._handleOrientationChange();
            }
        });
        
        // Method 3: Screen Orientation API (modern browsers)
        if (screen && screen.orientation) {
            screen.orientation.addEventListener('change', () => {
                console.log('📐 screen.orientation change event fired');
                this._handleOrientationChange();
            });
        }
        
        // Fullscreen change events (cross-browser support)
        document.addEventListener('fullscreenchange', () => {
            console.log('📱 Fullscreen state changed');
            this._handleFullscreenChange();
        });
        
        document.addEventListener('webkitfullscreenchange', () => {
            console.log('📱 WebKit fullscreen state changed');
            this._handleFullscreenChange();
        });
        
        document.addEventListener('mozfullscreenchange', () => {
            console.log('📱 Mozilla fullscreen state changed');
            this._handleFullscreenChange();
        });
        
        document.addEventListener('msfullscreenchange', () => {
            console.log('📱 MS fullscreen state changed');
            this._handleFullscreenChange();
        });
        
        console.log('📐 Event listeners registered');
    }
    
    // Handle orientation change with debouncing
    _handleOrientationChange() {
        // Clear existing debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Set new debounce timer
        this.debounceTimer = setTimeout(() => {
            this._processOrientationChange();
        }, this.debounceDelay);
    }
    
    // Process the actual orientation change
    _processOrientationChange() {
        const newOrientation = this._getCurrentOrientation();
        const oldOrientation = this.currentOrientation;
        
        if (newOrientation === oldOrientation) {
            console.log('📐 Orientation unchanged, skipping update');
            return;
        }
        
        console.log(`📐 Orientation changed: ${oldOrientation} → ${newOrientation}`);
        this.currentOrientation = newOrientation;
        
        // Check if we need to show/hide overlay on mobile
        if (window.deviceDetection && window.deviceDetection.isMobileOrTablet()) {
            this._checkOrientation();
        }
        
        // Dispatch custom event
        this._dispatchOrientationEvent({
            oldOrientation,
            newOrientation,
            timestamp: Date.now()
        });
        
        // Call registered callbacks
        this.callbacks.onOrientationChange.forEach(callback => {
            try {
                callback(newOrientation, oldOrientation);
            } catch (error) {
                console.error('📐 Error in orientation change callback:', error);
            }
        });
    }
    
    // Handle fullscreen state changes
    _handleFullscreenChange() {
        const isFullscreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement ||
                           document.msFullscreenElement;
        
        console.log(`📱 Fullscreen state: ${isFullscreen ? 'ACTIVE' : 'INACTIVE'}`);
        
        // If we're on mobile and fullscreen was exited, we might need to check orientation overlay
        if (!isFullscreen && window.deviceDetection && window.deviceDetection.isMobileOrTablet()) {
            // Small delay to allow for UI adjustments
            setTimeout(() => {
                this._checkOrientation();
            }, 100);
        }
        
        // Dispatch custom fullscreen event
        window.dispatchEvent(new CustomEvent('orientation:fullscreenchange', {
            detail: { 
                isFullscreen: !!isFullscreen,
                timestamp: Date.now() 
            }
        }));
    }
    
    // Check orientation and show/hide overlay
    _checkOrientation() {
        if (!window.deviceDetection || !window.deviceDetection.isMobileOrTablet()) {
            return; // Only check on mobile devices
        }
        
        const isPortrait = this.currentOrientation === 'portrait';
        
        if (isPortrait && !this.overlayVisible) {
            this._showOverlay();
        } else if (!isPortrait && this.overlayVisible) {
            this._hideOverlay();
        }
    }
    
    // Show the orientation overlay
    _showOverlay() {
        console.log('📐 Showing orientation overlay...');
        
        // Pause the game
        this.pauseGame();
        
        // Show overlay
        if (this.overlayController) {
            this.overlayController.show();
        } else if (window.overlayController) {
            window.overlayController.show();
        } else {
            // Fallback: Direct DOM manipulation
            const overlay = document.getElementById('orientation-overlay');
            if (overlay) {
                overlay.style.display = 'flex';
                overlay.classList.add('visible');
            }
        }
        
        this.overlayVisible = true;
        
        // Call callbacks
        this.callbacks.onOverlayShow.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('📐 Error in overlay show callback:', error);
            }
        });
    }
    
    // Hide the orientation overlay
    _hideOverlay() {
        console.log('📐 Hiding orientation overlay...');
        
        // Hide overlay
        if (this.overlayController) {
            this.overlayController.hide();
        } else if (window.overlayController) {
            window.overlayController.hide();
        } else {
            // Fallback: Direct DOM manipulation
            const overlay = document.getElementById('orientation-overlay');
            if (overlay) {
                overlay.classList.remove('visible');
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 300); // Match fade animation duration
            }
        }
        
        this.overlayVisible = false;
        
        // Resume the game
        this.resumeGame();
        
        // Call callbacks
        this.callbacks.onOverlayHide.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('📐 Error in overlay hide callback:', error);
            }
        });
    }
    
    // Pause the game
    pauseGame() {
        if (this.gamePaused) return;
        
        console.log('📐 Pausing game...');
        this.gamePaused = true;
        
        // Pause Phaser scene if available
        if (this.gameScene && this.gameScene.scene) {
            this.gameScene.scene.pause();
        } else if (window.game && window.game.scene) {
            // Try to pause the active scene
            const activeScenes = window.game.scene.getScenes(true);
            activeScenes.forEach(scene => {
                if (scene.scene.key === 'GameScene') {
                    scene.scene.pause();
                }
            });
        }
        
        // Dispatch pause event
        window.dispatchEvent(new CustomEvent('game:pause', {
            detail: { reason: 'orientation' }
        }));
    }
    
    // Resume the game
    resumeGame() {
        if (!this.gamePaused) return;
        
        console.log('📐 Resuming game...');
        this.gamePaused = false;
        
        // Resume Phaser scene if available
        if (this.gameScene && this.gameScene.scene) {
            this.gameScene.scene.resume();
        } else if (window.game && window.game.scene) {
            // Try to resume the active scene
            const activeScenes = window.game.scene.getScenes(false);
            activeScenes.forEach(scene => {
                if (scene.scene.key === 'GameScene' && scene.scene.isPaused()) {
                    scene.scene.resume();
                }
            });
        }
        
        // Dispatch resume event
        window.dispatchEvent(new CustomEvent('game:resume', {
            detail: { reason: 'orientation' }
        }));
    }
    
    // Dispatch custom orientation event
    _dispatchOrientationEvent(detail) {
        window.dispatchEvent(new CustomEvent('orientationchanged', {
            detail: detail,
            bubbles: true
        }));
    }
    
    // Register a callback for orientation changes
    onOrientationChange(callback) {
        if (typeof callback === 'function') {
            this.callbacks.onOrientationChange.push(callback);
        }
    }
    
    // Register a callback for overlay show
    onOverlayShow(callback) {
        if (typeof callback === 'function') {
            this.callbacks.onOverlayShow.push(callback);
        }
    }
    
    // Register a callback for overlay hide
    onOverlayHide(callback) {
        if (typeof callback === 'function') {
            this.callbacks.onOverlayHide.push(callback);
        }
    }
    
    // Remove a callback
    removeCallback(type, callback) {
        if (this.callbacks[type]) {
            const index = this.callbacks[type].indexOf(callback);
            if (index > -1) {
                this.callbacks[type].splice(index, 1);
            }
        }
    }
    
    // Force check orientation (useful for testing)
    forceCheck() {
        this._checkOrientation();
    }
    
    // Get current state
    getState() {
        return {
            orientation: this.currentOrientation,
            overlayVisible: this.overlayVisible,
            gamePaused: this.gamePaused,
            gameInitialized: this.gameInitialized,
            isMobile: window.deviceDetection ? window.deviceDetection.isMobileOrTablet() : false,
            isFullscreen: document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement
        };
    }
    
    // Request fullscreen mode (mobile optimized)
    async requestFullscreen() {
        if (!window.deviceDetection || !window.deviceDetection.isMobileOrTablet()) {
            console.log('📱 Fullscreen request skipped - not a mobile device');
            return;
        }
        
        console.log('📱 Requesting fullscreen mode for mobile gameplay...');
        
        try {
            const element = document.documentElement;
            
            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                await element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                await element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                await element.msRequestFullscreen();
            } else {
                throw new Error('Fullscreen API not supported');
            }
            
            console.log('📱 Fullscreen mode activated');
            
            // Dispatch fullscreen event
            window.dispatchEvent(new CustomEvent('game:fullscreen', {
                detail: { active: true }
            }));
            
        } catch (error) {
            console.log('📱 Fullscreen request failed:', error.message);
            // Not throwing error as fullscreen may be blocked by user/browser
        }
    }
    
    // Exit fullscreen mode
    async exitFullscreen() {
        console.log('📱 Exiting fullscreen mode...');
        
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                await document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                await document.msExitFullscreen();
            }
            
            console.log('📱 Fullscreen mode deactivated');
            
            // Dispatch fullscreen event
            window.dispatchEvent(new CustomEvent('game:fullscreen', {
                detail: { active: false }
            }));
            
        } catch (error) {
            console.log('📱 Exit fullscreen failed:', error.message);
        }
    }
    
    // Toggle fullscreen mode
    async toggleFullscreen() {
        const isFullscreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement ||
                           document.msFullscreenElement;
                           
        if (isFullscreen) {
            await this.exitFullscreen();
        } else {
            await this.requestFullscreen();
        }
    }
    
    // Clean up event listeners
    destroy() {
        console.log('📐 Destroying OrientationManager...');
        
        // Clear debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Clear callbacks
        this.callbacks.onOrientationChange = [];
        this.callbacks.onOverlayShow = [];
        this.callbacks.onOverlayHide = [];
        
        // Note: We don't remove window event listeners as they might be used elsewhere
        
        this.gameInitialized = false;
    }
}

// Create singleton instance
window.orientationManager = new window.OrientationManager();