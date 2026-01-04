import { GPXParser } from '../gpxParser.js';
import { AnalyticsTracker } from '../utils/analytics.js';
import { FeedbackSolicitation } from '../ui/feedbackSolicitation.js';

export class FileController {
    constructor(app) {
        this.app = app;
        this.gpxParser = new GPXParser();
    }

    async handleFiles(files) {
        if (!files || files.length === 0) return;

        // Separate GPX files and image files
        const gpxFiles = Array.from(files).filter(file =>
            file.name.toLowerCase().endsWith('.gpx')
        );

        const imageFiles = Array.from(files).filter(file =>
            file.type.startsWith('image/')
        );

        // Handle GPX files first
        if (gpxFiles.length > 0) {
            await this.handleGPXFiles(gpxFiles);
        }

        // Handle image files for annotations
        if (imageFiles.length > 0) {
            await this.handleImageFiles(imageFiles);
        }

        // If no valid files
        if (gpxFiles.length === 0 && imageFiles.length === 0) {
            console.error('Please select GPX or image files');
            this.app.showMessage?.('Please select valid GPX or image files', 'error');
            return;
        }
    }

    async handleGPXFiles(gpxFiles) {
        // Track file upload
        AnalyticsTracker.trackFileUpload(gpxFiles.length, gpxFiles.length === 1 ? 'single' : 'multiple');

        // Track activity for feedback solicitation
        FeedbackSolicitation.trackActivity('file_upload');

        try {
            // No global loading overlay; proceed immediately

            if (gpxFiles.length === 1) {
                // Single file - load directly
                const file = gpxFiles[0];
                const trackData = await this.gpxParser.parseFile(file);

                if (trackData) {
                    this.app.currentTrackData = trackData;

                    // Load track data to map
                    try {
                        this.app.map.loadTrackData(trackData);
                    } catch (mapError) {
                        console.error('Error loading track to map:', mapError);
                        this.app.showMessage?.('Warning: Map loading encountered an issue, but track data was parsed.', 'warning');
                    }

                    // Show visualization section - ensure this happens even if map has minor issues
                    if (this.app.showVisualizationSection) {
                        this.app.showVisualizationSection();
                    } else {
                        console.warn('showVisualizationSection method not found on app');
                        // Fallback: try to find element directly
                        const vizSection = document.getElementById('visualizationSection');
                        if (vizSection) vizSection.style.display = 'block';
                    }

                    // Update stats
                    this.app.updateStats(trackData.stats);

                    // Generate elevation profile after loading track data
                    this.app.generateElevationProfile();

                    // Update stats again after elevation profile generation (may have recalculated elevation stats)
                    this.app.updateStats(trackData.stats);

                    console.log('GPX file loaded successfully');

                    // Only add to journey builder if NOT in comparison mode
                    // Comparison mode requires tracks to remain as individual entities
                    if (this.app.journey && !this.app.comparisonMode) {
                        console.log('Adding track to journey builder...');
                        this.app.journey.addTrack(trackData, file.name);
                    } else if (this.app.comparisonMode) {
                        console.log('⚠️ Skipping journey builder - comparison mode is active');
                        console.log('📊 Track loaded for comparison mode:', {
                            points: trackData.trackPoints.length,
                            hasTimeData: trackData.trackPoints.some(p => p.time),
                            startTime: trackData.stats.startTime,
                            endTime: trackData.stats.endTime
                        });
                    }
                }
            } else {
                // Multiple files - check if this might be for comparison mode
                console.log(`Processing ${gpxFiles.length} GPX files...`);

                // If we have exactly 2 files and comparison mode is enabled, handle specially
                if (gpxFiles.length === 2 && this.app.comparisonMode) {
                    console.log('Detected 2 files with comparison mode - processing for comparison');
                    await this.handleComparisonFiles(gpxFiles);
                } else {
                    // Process as journey
                    console.log('Processing as journey...');
                    let processedCount = 0;
                    for (const file of gpxFiles) {
                        try {
                            const trackData = await this.gpxParser.parseFile(file);
                            if (trackData && this.app.journey) {
                                this.app.journey.addTrack(trackData, file.name);
                                processedCount++;
                            }
                        } catch (error) {
                            console.error(`Error processing file ${file.name}:`, error);
                            this.app.showMessage?.(`Error loading ${file.name}: ${error.message}`, 'error');
                        }
                    }
                }

                if (processedCount > 0) {
                    console.log(`${processedCount} files added to journey builder`);

                    // Show journey planning guidance
                    this.showJourneyPlanningGuidance();
                } else {
                    this.app.showMessage?.('No valid GPX files could be processed', 'error');
                }
            }
        } catch (error) {
            console.error('Error loading GPX files:', error);
            this.app.showMessage?.('Error processing GPX files: ' + error.message, 'error');
        }
    }

    // Special handling for comparison files - preserves time data
    async handleComparisonFiles(gpxFiles) {
        console.log('🔄 Handling comparison files with time data preservation...');

        try {
            // Load first file as main track
            const firstFile = gpxFiles[0];
            const firstTrackData = await this.gpxParser.parseFile(firstFile);

            if (firstTrackData) {
                console.log('✅ Loaded first track for comparison:', firstTrackData.stats);
                this.app.currentTrackData = firstTrackData;

                // Load track data to map
                try {
                    this.app.map.loadTrackData(firstTrackData);
                } catch (mapError) {
                    console.error('Error loading first track to map:', mapError);
                }

                // Show visualization section
                if (this.app.showVisualizationSection) {
                    this.app.showVisualizationSection();
                }

                // Update stats
                this.app.updateStats(firstTrackData.stats);

                // Generate elevation profile
                this.app.generateElevationProfile();
                this.app.updateStats(firstTrackData.stats);
            }

            // Load second file as comparison track
            const secondFile = gpxFiles[1];
            const secondTrackData = await this.gpxParser.parseFile(secondFile);

            if (secondTrackData) {
                console.log('✅ Loaded second track for comparison:', secondTrackData.stats);

                // Load comparison track directly - bypass journey processing to preserve time data
                await this.app.loadComparisonTrack(secondFile);
            }

        } catch (error) {
            console.error('Error in comparison file handling:', error);
            this.app.showMessage?.('Error processing comparison files: ' + error.message, 'error');
        }

        // No global loading overlay to hide
    }

    async handleImageFiles(imageFiles) {
        // Track activity for feedback solicitation
        FeedbackSolicitation.trackActivity('image_upload');

        try {
            console.log(`Processing ${imageFiles.length} image files for annotations...`);

            // Store images for later use in annotations
            if (!this.app.uploadedImages) {
                this.app.uploadedImages = [];
            }

            for (const file of imageFiles) {
                // Create object URL for the image
                const imageUrl = URL.createObjectURL(file);
                const imageData = {
                    id: Date.now() + Math.random(),
                    file: file,
                    url: imageUrl,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    uploaded: new Date()
                };

                this.app.uploadedImages.push(imageData);
                console.log('Image processed:', imageData.name);
            }

            // Show message about images being ready for annotations
            this.app.showMessage?.(`${imageFiles.length} images ready for annotation. Click "Add Annotation" to place them on your route.`, 'success');

            // Update the annotation modal to show available images
            if (this.app.notes && this.app.notes.updateImageLibrary) {
                this.app.notes.updateImageLibrary(this.app.uploadedImages);
            }

        } catch (error) {
            console.error('Error processing image files:', error);
            this.app.showMessage?.('Error processing image files: ' + error.message, 'error');
        }
    }

    // Show guidance for journey planning
    showJourneyPlanningGuidance() {
        // Multiple files - guide user to journey builder
        this.app.showMessage?.('Multiple GPX files loaded! Use the Journey Planning section below to arrange tracks and add transportation between them.', 'info');

        // Auto-scroll to journey builder
        const journeySection = document.getElementById('journeyPlanningSection');
        if (journeySection) {
            journeySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    async handleDrop(event) {
        event.preventDefault();
        const files = event.dataTransfer.files;
        await this.handleFiles(files);
    }

    // Journey building is now handled by JourneyController
    async buildJourney(segments) {
        console.warn('buildJourney called on FileController - this should be handled by JourneyController');
        return this.app.journey?.journeyBuilder?.buildJourney(segments);
    }
} 
