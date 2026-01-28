import { t } from '../translations.js';

export class JourneyTracksUI {
    constructor(journeyCore) {
        this.journeyCore = journeyCore;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for tracks changes
        document.addEventListener('tracksChanged', (e) => {
            this.renderTracksList();
        });

        // Clear tracks button
        document.getElementById('clearTracksBtn')?.addEventListener('click', () => {
            this.journeyCore.clearAllTracks();
        });

        // Setup drag and drop container
        this.setupDragAndDropContainer();
    }

    // Render the tracks list UI
    renderTracksList() {
        const tracksItems = document.getElementById('tracksItems');
        if (!tracksItems) return;

        tracksItems.innerHTML = '';
        const tracks = this.journeyCore.getTracks();
        
        // Update transportation options visibility when track list changes
        this.updateTransportationOptionsVisibility();

        // Add "Add More Tracks" button if there are existing tracks
        if (tracks.length > 0) {
            const addMoreButton = document.createElement('div');
            addMoreButton.className = 'track-item add-more-tracks';
            addMoreButton.innerHTML = `
                <div class="track-icon">➕</div>
                <div class="track-info">
                    <div class="track-name">${t('journeyBuilder.addMoreTracks')}</div>
                    <div class="track-stats">${t('journeyBuilder.clickToUploadAdditionalGPXFiles')}</div>
                </div>
            `;
            addMoreButton.addEventListener('click', () => this.addMoreTracks());
            tracksItems.appendChild(addMoreButton);
        }

        tracks.forEach((track, index) => {
            const trackElement = document.createElement('div');
            trackElement.className = 'track-item';
            trackElement.draggable = true;
            trackElement.setAttribute('data-track-id', track.id);

            trackElement.innerHTML = `
                <div class="track-icon">${this.getTrackIcon(track.data.activityType || 'running')}</div>
                <div class="track-info">
                    <div class="track-name">${track.name}</div>
                    <div class="track-stats">
                        ${this.formatDistance(track.stats.totalDistance)} • 
                        ${this.formatElevation(track.stats.elevationGain)} elevation
                    </div>
                </div>
                <div class="track-actions">
                    <button class="track-action-btn" title="${t('journeyBuilder.moveUp')}" ${index === 0 ? 'disabled' : ''}>⬆️</button>
                    <button class="track-action-btn" title="${t('journeyBuilder.moveDown')}" ${index === tracks.length - 1 ? 'disabled' : ''}>⬇️</button>
                    <button class="track-action-btn remove-btn" title="${t('journeyBuilder.remove')}">🗑️</button>
                </div>
            `;

            // Add event listeners for track actions
            this.setupTrackActions(trackElement, track);

            // Add drag and drop functionality
            this.setupDragAndDrop(trackElement);
            tracksItems.appendChild(trackElement);
        });
    }

    // Setup track action buttons
    setupTrackActions(trackElement, track) {
        const actions = trackElement.querySelectorAll('.track-action-btn');
        const [upBtn, downBtn, removeBtn] = actions;

        upBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.journeyCore.moveTrack(track.id, 'up');
        });

        downBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.journeyCore.moveTrack(track.id, 'down');
        });

        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.journeyCore.removeTrack(track.id);
        });
    }

    // Get appropriate icon for track type
    getTrackIcon(activityType) {
        const icons = {
            running: '🏃‍♂️',
            cycling: '🚴‍♂️',
            swimming: '🏊‍♂️',
            hiking: '🥾',
            walking: '🚶‍♂️'
        };
        return icons[activityType] || '🏃‍♂️';
    }

    // Setup drag and drop for reordering tracks
    setupDragAndDrop(element) {
        element.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', e.target.getAttribute('data-track-id'));
            e.target.classList.add('dragging');
        });

        element.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
        });
    }

    // Setup drag and drop container
    setupDragAndDropContainer() {
        const tracksItems = document.getElementById('tracksItems');
        if (!tracksItems) return;

        tracksItems.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingElement = document.querySelector('.dragging');
            const afterElement = this.getDragAfterElement(tracksItems, e.clientY);
            
            if (afterElement == null) {
                tracksItems.appendChild(draggingElement);
            } else {
                tracksItems.insertBefore(draggingElement, afterElement);
            }
        });

        tracksItems.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            
            // Find the drop target
            const dropTarget = e.target.closest('.track-item[data-track-id]');
            if (dropTarget && dropTarget.getAttribute('data-track-id') !== draggedId) {
                const dropTargetId = dropTarget.getAttribute('data-track-id');
                this.journeyCore.reorderTracks(draggedId, dropTargetId);
            }
        });
    }

    // Get element after which to insert during drag
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.track-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Add more tracks functionality
    addMoreTracks() {
        // Trigger the file picker or upload mechanism
        const fileInput = document.getElementById('gpxFileInput');
        if (fileInput) {
            fileInput.click();
        } else {
            // Create a temporary file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.gpx';
            input.multiple = true;
            input.style.display = 'none';
            
            input.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                // Emit event to handle file upload
                document.dispatchEvent(new CustomEvent('filesSelected', { 
                    detail: { files } 
                }));
                document.body.removeChild(input);
            });
            
            document.body.appendChild(input);
            input.click();
        }
    }

    // Format distance for display
    formatDistance(distanceKm) {
        const unitPreference = typeof localStorage !== 'undefined'
            ? localStorage.getItem('trailReplayUnits')
            : 'metric';
        const useImperial = unitPreference === 'imperial';
        if (useImperial) {
            const miles = distanceKm * 0.621371;
            return `${miles.toFixed(1)} mi`;
        }
        if (distanceKm < 1) {
            return `${Math.round(distanceKm * 1000)}m`;
        }
        return `${distanceKm.toFixed(1)}km`;
    }

    // Format elevation for display
    formatElevation(elevationM) {
        const unitPreference = typeof localStorage !== 'undefined'
            ? localStorage.getItem('trailReplayUnits')
            : 'metric';
        const useImperial = unitPreference === 'imperial';
        const value = useImperial ? elevationM * 3.28084 : elevationM;
        return `${Math.round(value)}${useImperial ? 'ft' : 'm'}`;
    }

    // Show tracks section
    showTracksSection() {
        const tracksSection = document.getElementById('tracksSection');
        if (tracksSection) {
            tracksSection.style.display = 'block';
        }
        
        // Show transportation options when there are 2 or more tracks
        this.updateTransportationOptionsVisibility();
    }
    
    // Update transportation options visibility based on number of tracks
    updateTransportationOptionsVisibility() {
        const transportationOptions = document.getElementById('transportationOptions');
        const tracks = this.journeyCore.getTracks();
        
        if (transportationOptions) {
            if (tracks.length >= 2) {
                transportationOptions.style.display = 'block';
            } else {
                transportationOptions.style.display = 'none';
            }
        }
    }

    // Hide tracks section
    hideTracksSection() {
        const tracksSection = document.getElementById('tracksSection');
        if (tracksSection) {
            tracksSection.style.display = 'none';
        }
    }
} 
