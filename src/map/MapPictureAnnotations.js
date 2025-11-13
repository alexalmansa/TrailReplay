/**
 * MapPictureAnnotations - Handles picture annotation functionality for the map
 */
export class MapPictureAnnotations {
    constructor(mapRenderer) {
        this.mapRenderer = mapRenderer;
        this.pictureAnnotations = [];
        this.activePictureAnnotation = null;
        this.pauseOverlay = null;
        this.pauseTimeout = null;
    }

    /**
     * Add a picture annotation
     */
    addPictureAnnotation(progress, title, description, imageData, displayDuration = 3000) {
        const annotation = {
            id: Date.now() + Math.random(),
            progress,
            title,
            description,
            imageData,
            displayDuration,
            timestamp: new Date(),
            type: 'picture'
        };

        this.pictureAnnotations.push(annotation);
        console.log('Picture annotation added:', annotation);
        return annotation;
    }

    /**
     * Check for picture annotations during animation
     */
    checkAnnotations(progress) {
        // Skip if we're already showing a picture annotation
        if (this.activePictureAnnotation) return;

        for (const annotation of this.pictureAnnotations) {
            // Use a more precise triggering system to avoid loops
            const annotationProgress = annotation.progress;
            const threshold = 0.001; // Small threshold for precise triggering
            
            // Check if we've reached this annotation and haven't shown it yet
            if (progress >= annotationProgress && progress <= annotationProgress + threshold) {
                // Only trigger if we haven't triggered this annotation recently
                if (!annotation.triggered && !annotation.lastShown) {
                    annotation.triggered = true;
                    annotation.lastShown = Date.now(); // Track when it was last shown
                    this.showPictureAnnotation(annotation);
                    break;
                }
            }
            // Reset triggered flag if we're well before the annotation (for rewinding)
            else if (progress < annotationProgress - (threshold * 2)) {
                annotation.triggered = false;
                // Only reset lastShown if it was shown more than 1 second ago
                if (annotation.lastShown && (Date.now() - annotation.lastShown > 1000)) {
                    annotation.lastShown = null;
                }
            }
        }
    }

    /**
     * Show picture annotation with pause functionality
     */
    async showPictureAnnotation(annotation) {
        if (this.activePictureAnnotation) return;

        console.log('Showing picture annotation:', annotation);
        this.activePictureAnnotation = annotation;

        // Never pause animation - let it continue smoothly during picture annotations
        // This creates consistent behavior between preview and export modes
        console.log('📸 Showing picture annotation - animation continues running');

        // Create and show picture overlay
        this.createPictureOverlay(annotation);

        // Resume animation before image disappears for smooth transition
        if (this.pauseTimeout) {
            clearTimeout(this.pauseTimeout);
        }

        // Animation continues running - no need to resume since we never pause

        // Auto-hide after specified duration
        this.pauseTimeout = setTimeout(() => {
            this.hidePictureAnnotation();
        }, annotation.displayDuration);
    }

    /**
     * Create picture overlay UI
     */
    createPictureOverlay(annotation) {
        // Remove existing overlay
        this.removePictureOverlay();

        // Get the map container for positioning the overlay inside it
        const mapContainer = this.mapRenderer.map.getContainer();
        if (!mapContainer) {
            console.error('Map container not found, cannot display picture annotation');
            return;
        }

        // Ensure map container has relative positioning for proper overlay containment
        const containerStyle = window.getComputedStyle(mapContainer);
        if (containerStyle.position === 'static') {
            mapContainer.style.position = 'relative';
        }

        // Create overlay container
        this.pauseOverlay = document.createElement('div');
        this.pauseOverlay.className = 'picture-annotation-overlay map-overlay';
        this.pauseOverlay.innerHTML = `
            <div class="picture-annotation-content">
                <div class="picture-annotation-body">
                    <img src="${annotation.imageData.url}" alt="${annotation.title || 'Annotation image'}" class="picture-annotation-image">
                    ${annotation.title ? `<div class="picture-annotation-title">${annotation.title}</div>` : ''}
                    ${annotation.description ? `<div class="picture-annotation-description">${annotation.description}</div>` : ''}
                    <div class="picture-annotation-progress">
                        <div class="picture-annotation-progress-bar">
                            <div class="picture-annotation-progress-fill"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // No manual close buttons - auto-hide only

        // Add to map container instead of document body for video export capture
        mapContainer.appendChild(this.pauseOverlay);
        
        // Debug: log container and overlay dimensions
        const containerRect = mapContainer.getBoundingClientRect();
        console.log('📸 Picture annotation overlay created:', {
            width: containerRect.width,
            height: containerRect.height,
            position: window.getComputedStyle(mapContainer).position
        });

        // Start progress bar animation
        this.animateProgressBar(annotation.displayDuration);

        // Add fade-in effect
        setTimeout(() => {
            this.pauseOverlay.classList.add('show');
        }, 10);
    }

    /**
     * Animate the progress bar
     */
    animateProgressBar(duration) {
        const progressFill = this.pauseOverlay?.querySelector('.picture-annotation-progress-fill');
        if (progressFill) {
            progressFill.style.transition = `width ${duration}ms linear`;
            progressFill.style.width = '100%';
        }
    }

    /**
     * Hide picture annotation and resume animation
     */
    hidePictureAnnotation() {
        if (!this.activePictureAnnotation) return;

        console.log('📸 Hiding picture annotation - animation continues running');
        
        // Mark the current annotation as finished showing
        if (this.activePictureAnnotation) {
            this.activePictureAnnotation.isShowing = false;
        }

        // Clear timeout
        if (this.pauseTimeout) {
            clearTimeout(this.pauseTimeout);
            this.pauseTimeout = null;
        }

        // Remove overlay with fade-out effect
        if (this.pauseOverlay) {
            this.pauseOverlay.classList.add('hiding');
            setTimeout(() => {
                this.removePictureOverlay();
            }, 300);
        }

        // Reset state
        this.activePictureAnnotation = null;
    }

    /**
     * Remove picture overlay from DOM
     */
    removePictureOverlay() {
        if (this.pauseOverlay) {
            this.pauseOverlay.remove();
            this.pauseOverlay = null;
        }
    }

    /**
     * Get all picture annotations
     */
    getPictureAnnotations() {
        return this.pictureAnnotations;
    }

    /**
     * Calculate total display time for all picture annotations (for video export duration)
     */
    getTotalPictureDisplayTime() {
        if (!this.pictureAnnotations || this.pictureAnnotations.length === 0) {
            return 0;
        }

        let totalTime = 0;
        this.pictureAnnotations.forEach(annotation => {
            totalTime += annotation.displayDuration || 3000; // Default 3 seconds
        });

        // Convert from milliseconds to seconds
        return totalTime / 1000;
    }

    /**
     * Remove a picture annotation
     */
    removePictureAnnotation(id) {
        this.pictureAnnotations = this.pictureAnnotations.filter(annotation => annotation.id !== id);
    }

    /**
     * Clear all picture annotations
     */
    clearPictureAnnotations() {
        this.pictureAnnotations = [];
        this.hidePictureAnnotation();
    }

    /**
     * Reset all triggered states (useful when animation restarts)
     */
    resetTriggeredStates() {
        this.pictureAnnotations.forEach(annotation => {
            annotation.triggered = false;
            annotation.lastShown = null;
            annotation.isShowing = false;
        });
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.clearPictureAnnotations();
        this.removePictureOverlay();
        
        if (this.pauseTimeout) {
            clearTimeout(this.pauseTimeout);
            this.pauseTimeout = null;
        }
    }
} 