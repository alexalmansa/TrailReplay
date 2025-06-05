// Simple translation system
export const translations = {
    en: {
        subtitle: "Replay the story your trails told",
        
        // Tutorial and examples
        tutorial: {
            link: "📚 Tutorial & Examples",
            title: "Complete Tutorial & Feature Guide",
            welcomeTitle: "Welcome to TrailReplay",
            welcomeSubtitle: "Transform your GPX trail data into beautiful, interactive 3D animations",
            welcomeDescription: "TrailReplay is a powerful yet simple web application that turns your GPS trail data into stunning visual stories. Whether you're a runner, cyclist, hiker, or multi-sport athlete, TrailReplay helps you relive and share your outdoor adventures through animated maps, detailed statistics, and exportable videos.",
            proTip: "💡 Pro Tip:",
            proTipText: "TrailReplay works entirely in your browser - no data is uploaded to servers, ensuring your privacy and enabling offline use!",
            
            // Sample files section
            sampleFiles: "Download Sample GPX Files",
            sampleFilesSubtitle: "Try TrailReplay with these example activities",
            exampleActivities: "🏃‍♂️ Example Activities",
            sampleDescription: "Download these sample GPX files to explore all of TrailReplay's features:",
            downloadRunning: "🏃‍♂️ Running Trail (5km)",
            downloadCycling: "🚴‍♂️ Cycling Route (25km)",
            downloadHiking: "🥾 Mountain Hike (8km)",
            downloadMulti: "🏆 Multi-Sport Journey",
            
            // Demo video section
            demoVideoTitle: "See What You Can Create",
            demoVideoSubtitle: "Example of a 3D trail animation made with TrailReplay",
            demoCaption: "This example showcases the kind of immersive 3D trail animation you can create from your own GPX data using TrailReplay's powerful features.",
            videoNotSupported: "Your browser doesn't support video playback. You can download the example video instead.",
            
            // Core features
            coreFeatures: "Core Features Overview",
            coreFeaturesSubtitle: "Everything you can do with TrailReplay",
            multiFileTitle: "📁 Multi-File Upload",
            multiFileDescription: "Upload multiple GPX files to create complex journeys. Perfect for multi-day adventures or comparing different routes.",
            journeyBuilderTitle: "🧩 Journey Builder",
            journeyBuilderDescription: "Combine multiple tracks into a single journey with custom transportation segments between activities.",
            animationTitle: "🎬 3D Animation",
            animationDescription: "Watch your trail come to life with smooth 3D animations, customizable icons, and real-time statistics.",
            videoExportTitle: "📹 Video Export",
            videoExportDescription: "Export your animated trail as a video file to share on social media or save as a memory.",
            annotationsTitle: "📝 Trail Annotations",
            annotationsDescription: "Add notes, photos, and points of interest to specific locations along your trail for storytelling.",
            iconTimelineTitle: "🔄 Icon Timeline",
            iconTimelineDescription: "Change activity icons during the animation to represent different activities or conditions.",
            mapStylesTitle: "🗺️ Multiple Map Styles",
            mapStylesDescription: "Choose from satellite, terrain, or street map styles. Enable 3D terrain for dramatic elevation visualization.",
            liveStatsTitle: "📊 Live Statistics",
            liveStatsDescription: "Real-time distance, elevation, and timing data updates as the animation plays.",
            multiLanguageTitle: "🌍 Multi-Language",
            multiLanguageDescription: "Full support for English and Spanish with automatic language detection.",
            
            // Getting started
            gettingStarted: "Getting Started",
            gettingStartedSubtitle: "Your first TrailReplay animation in 5 minutes",
            step1Title: "Upload Your GPX File",
            step1Description: "Drag and drop a GPX file onto the upload area, or click \"Choose Files\" to browse. You can upload multiple files at once.",
            step2Title: "Build Your Journey",
            step2Description: "Your uploaded tracks appear in the Journey Builder. Reorder them by dragging, and add transportation segments between tracks if needed.",
            step3Title: "Customize the Visualization",
            step3Description: "Choose your map style, trail color, activity icons, and animation settings. Enable 3D terrain for dramatic effect.",
            step4Title: "Play Your Animation",
            step4Description: "Click the Play button to start the animation. Use the progress bar to jump to specific moments.",
            step5Title: "Add Annotations (Optional)",
            step5Description: "Click \"Add Note\" to add annotations at specific points. These will appear during animation playback.",
            step6Title: "Export Your Video",
            step6Description: "Click \"Export Video\" to save your animation as a WebM video file for sharing.",
            
            // Advanced features
            advancedFeatures: "Advanced Features",
            advancedFeaturesSubtitle: "Power user tips and advanced functionality",
            backToApp: "← Back to TrailReplay App",
            journeyBuilderAdvancedTitle: "🧩 Journey Builder Advanced",
            journeyBuilderAdvancedDesc: "The Journey Builder allows you to create complex multi-activity journeys:",
            reorderTracks: "<strong>Reorder Tracks:</strong> Drag tracks to change the sequence of your journey",
            customTiming: "<strong>Custom Timing:</strong> Override automatic timing calculations with custom durations",
            transportationSegments: "<strong>Transportation Segments:</strong> Add car, boat, plane, train, or walking segments between tracks",
            autoPreview: "<strong>Auto-Preview:</strong> Changes are automatically applied to the visualization",
            dynamicIconChangesTitle: "🔄 Dynamic Icon Changes",
            dynamicIconChangesDesc: "Tell your story with changing icons:",
            addIconChange: "Click \"Add Icon Change\" and then click on the map or progress bar",
            chooseNewIcon: "Choose a new icon that represents different activities or conditions",
            perfectFor: "Perfect for triathlons, adventure races, or changing weather conditions",
            smartAnnotationsTitle: "📝 Smart Annotations",
            smartAnnotationsDesc: "Add context to your trail:",
            choosePresetIcons: "Choose from preset icons (📍 location, ⚠️ warning, 📸 photo, etc.)",
            addTitles: "Add titles and descriptions for each annotation",
            annotationsAppear: "Annotations appear automatically during animation",
            clickAnnotations: "Click annotations in the list to jump to that point",
            videoExportOptionsTitle: "🎥 Video Export Options",
            videoExportOptionsDesc: "Professional-quality video exports:",
            webmFormat: "<strong>WebM Format:</strong> High-quality, web-optimized videos",
            cleanInterface: "<strong>Clean Interface:</strong> UI elements are hidden during export",
            fps: "<strong>30 FPS:</strong> Smooth animation at 30 frames per second",
            customBitrate: "<strong>Custom Bitrate:</strong> 2.5 Mbps for optimal quality/size balance",
            videoExportTipsTitle: "⚠️ Video Export Tips:",
            videoExportTips: "For best results, let the map fully load before exporting. If you see white areas (loading tiles), wait a moment or slow down the animation speed.",
            mapCustomizationTitle: "Map Customization",
            mapCustomizationDesc: "Make your visualization perfect for your story",
            mapStyles: "Map Styles",
            mapStylesDesc: "<strong>🛰️ Satellite:</strong> High-resolution satellite imagery<br><strong>🗻 Terrain:</strong> Topographic with elevation shading<br><strong>🗺️ Street:</strong> Detailed street-level mapping",
            terrain3d: "3D Terrain",
            terrain3dDesc: "Enable 3D terrain for dramatic elevation visualization. Choose between Mapzen Terrarium (global) or OpenTopography SRTM data sources.",
            trailStyling: "Trail Styling",
            trailStylingDesc: "Customize trail color with preset options or custom colors. Adjust marker size and enable/disable background circles.",
            autoFollow: "Auto Follow",
            autoFollowDesc: "Camera automatically follows the animated marker, or disable for a fixed view of the entire trail.",
            troubleshootingTitle: "Troubleshooting & Tips",
            troubleshootingDesc: "Common issues and how to solve them",
            fileUploadIssues: "📁 File Upload Issues",
            fileFormat: "<strong>Format:</strong> Only GPX files are supported (not TCX, FIT, or other formats)",
            fileSize: "<strong>Size:</strong> Very large files (>1000 points) may slow down performance",
            fileContent: "<strong>Content:</strong> GPX files must contain track points with coordinates and timestamps",
            videoExportIssues: "🎥 Video Export Issues",
            whiteAreas: "<strong>White Areas:</strong> Wait for map tiles to load before exporting",
            browserSupport: "<strong>Browser Support:</strong> Chrome and Firefox work best for video export",
            performance: "<strong>Performance:</strong> Close other browser tabs for better recording performance",
            mapDisplayIssues: "🗺️ Map Display Issues",
            slowLoading: "<strong>Slow Loading:</strong> Disable 3D terrain if the map loads slowly",
            missingTiles: "<strong>Missing Tiles:</strong> Check your internet connection",
            poorPerformance: "<strong>Poor Performance:</strong> Try switching to a simpler map style",
            performanceTipsTitle: "💡 Performance Tips:",
            simplifyFiles: "Simplify large GPX files by reducing track points",
            satelliteView: "Use satellite view for best visual impact",
            recordAtLowerSpeed: "Record videos at lower animation speeds for smoother results",
            clearCache: "Clear browser cache if experiencing issues",
            technicalDetailsTitle: "Technical Details",
            technicalDetailsDesc: "How TrailReplay works under the hood",
            techStack: "🔧 Technology Stack",
            maplibre: "<strong>MapLibre GL JS:</strong> Open-source mapping and 3D visualization",
            threejs: "<strong>Three.js:</strong> Additional 3D graphics capabilities",
            mediaRecorder: "<strong>MediaRecorder API:</strong> Browser-native video recording",
            turfjs: "<strong>Turf.js:</strong> Geospatial calculations and analysis",
            webWorkers: "<strong>Web Workers:</strong> Background processing for large files",
            privacySecurity: "🔒 Privacy & Security",
            clientSide: "<strong>Client-Side Only:</strong> All processing happens in your browser",
            noDataUpload: "<strong>No Data Upload:</strong> Your GPX files never leave your device",
            noTracking: "<strong>No Tracking:</strong> No analytics or user tracking",
            openSource: "<strong>Open Source:</strong> All code is publicly available",
            browserSupport: "🌐 Browser Support",
            chrome: "<strong>Chrome 80+:</strong> Full feature support including video export",
            firefox: "<strong>Firefox 75+:</strong> Full feature support",
            safari: "<strong>Safari 14+:</strong> Basic features (video export may be limited)",
            edge: "<strong>Edge 80+:</strong> Full feature support",
            elevationDataChanged: "Switched to {source} elevation data",
            terrainSourceSwitched: "Terrain source switched to {source}",
            openTopoUnavailable: "OpenTopography unavailable, switched to Mapzen",
            mapzenWorking: "Mapzen elevation data loading successfully"
        },
        
        upload: {
            title: "Upload GPX Files",
            description: "Add multiple GPX tracks to create your journey",
            button: "Choose Files"
        },
        
        controls: {
            activity: "Activity Type:",
            terrain: "Terrain Style:",
            totalTime: "Total Time:",
            pathColor: "Trail Color",
            markerSize: "Marker Size",
            currentIcon: "Current Icon",
            changeIcon: "Change",
            autoFollow: "Auto Follow",
            showCircle: "Show Circle",
            play: "Play",
            pause: "Pause",
            reset: "Reset",
            addIconChange: "🔄 Add Icon Change",
            addAnnotation: "📍 Add Note",
            export: "📹 Export Video",
            videoExport: "Video Export",
            exportHelp: "ℹ️ Export Options",
            exportHelpHide: "ℹ️ Hide Options",
            
            // Manual recording instructions
            manualRecordingTitle: "🎥 Manual Mode con Estadísticas",
            manualRecordingInstructions: "Perfect Quality Recording Instructions:",
            manualRecordingWindows: "Windows:",
            manualRecordingWindowsKeys: "<kbd>Win</kbd> + <kbd>G</kbd> → Game Bar → Record",
            manualRecordingMac: "Mac:",
            manualRecordingMacKeys: "<kbd>⌘</kbd> + <kbd>⇧</kbd> + <kbd>5</kbd> → Record Selected Portion",
            manualRecordingHighlight: "📱 The orange highlight shows exactly what to capture!",
            manualRecordingHighlightDesc: "This ensures you get all statistics, elevation profile, and overlays in perfect quality.",
            manualRecordingWhatHappens: "What happens next:",
            manualRecordingStep1: "Map tiles will preload for smooth recording",
            manualRecordingStep2: "The recording area will be highlighted in orange", 
            manualRecordingStep3: "Animation will start automatically with all statistics",
                    manualRecordingStep4: "Use your system's screen recorder to capture the highlighted area",
        manualRecordingStep5: "Press Escape at any time to exit manual recording mode",
        manualRecordingCancel: "Cancel",
            manualRecordingStart: "🎬 Start Preparation",

            exportAutoTitle: "🔧 Auto Recording (WebM)",
            exportAutoDesc: "Automatic recording with overlays rendered on canvas. Works on all browsers (WebM format).",
            exportCropTitle: "🚀 Auto Recording (MP4)",
            exportCropDesc: "⚠️ EXPERIMENTAL: Chrome 126+ only. Uses experimental CropTarget API. May not work reliably - use WebM mode if you encounter issues.",
            exportManualTitle: "🎥 Manual Mode con Estadísticas",
            exportManualDesc: "Best quality with all statistics and overlays. Use your system's screen recorder to capture the highlighted area while the animation plays.",
            exportAutoWebm: "🔧 Auto (WebM)",
            exportAutoCrop: "🚀 Auto (MP4)",
            exportManual: "🎥 Manual Mode con Estadísticas",
            manualWindows: "Windows:",
            manualMac: "Mac:",
            autoZoom: "Auto Zoom",
            terrain3d: "3D Terrain",
            terrainSource: "Elevation Data",
            showStats: "Show Live Stats",
            gpxOnlyStats: "Exclude Transfer Distances",
            language: "Language"
        },
        
        cameraInfo: {
            title: "Map Camera Controls",
            buttonText: "ℹ️ Camera Controls",
            desktop: {
                title: "💻 Desktop Controls",
                pan: "Pan: Click and drag to move the map",
                zoom: "Zoom: Use mouse wheel or +/- keys",
                rotate: "Rotate: Right-click and drag, or Shift + click and drag",
                tilt: "Tilt: Ctrl + click and drag (3D mode)"
            },
            mobile: {
                title: "📱 Mobile Controls", 
                pan: "Pan: Touch and drag with one finger",
                zoom: "Zoom: Pinch with two fingers to zoom in/out",
                rotate: "Rotate: Touch and drag with two fingers",
                tilt: "Tilt: Touch with two fingers and move up/down (3D mode)"
            }
        },
        
        iconSelection: {
            title: "Select Icon"
        },
        
        iconChange: {
            title: "Add Icon Change",
            instruction: "Click on the map or progress bar to set the position where the icon should change.",
            newIcon: "New Icon"
        },
        
        iconChanges: {
            title: "Icon Changes Timeline"
        },
        
        annotations: {
            title: "Trail Annotations",
            addTitle: "Add Annotation",
            clickToAdd: "Click on the map to add an annotation",
            noAnnotations: "No annotations added yet"
        },
        
        timeline: {
            title: "Timeline Events",
            annotation: "Note",
            iconChange: "Icon Change",
            iconChangeTo: "Change icon to"
        },
        
        stats: {
            title: "Trail Statistics",
            distance: "Total Distance",
            duration: "Duration",
            elevation: "Elevation Gain",
            speed: "Avg Speed",
            currentDistance: "Distance",
            currentElevation: "Elevation",
            currentSpeed: "Speed"
        },
        
        messages: {
            fileLoaded: "GPX file loaded successfully!",
            fileError: "Error loading GPX file. Please try again.",
            noTrackPoints: "No track points found in GPX file.",
            exportStarted: "Starting video export...",
            exportComplete: "Video export complete!",
            annotationAdded: "Trail annotation added",
            iconChangeAdded: "Icon change added",
            clickMapToAnnotate: "Click on the map to add an annotation",
            clickMapForIconChange: "Click on the map to add an icon change",
            noTrackForExport: "No track loaded. Please load a GPX file before exporting.",
            mediaDeviceNotSupported: "Video recording is not supported by your browser.",
            mapNotReady: "Map is not ready for video export.",
            exportVideoPrepare: "Preparing video export. Please wait...",
            exportVideoRecording: "Recording animation... Please wait until complete.",
            exportError: "Error during video export",
            
            // Video export confirmation dialog
            exportVideoTitle: "Export Trail Animation Video",
            exportVideoWhatHappens: "Here's what will happen during the export:",
            exportVideoStep1: "The page interface will be temporarily hidden for a clean recording",
            exportVideoStep2: "Your current zoom level and camera orientation will be preserved",
            exportVideoStep3: "Your trail animation will automatically play from start to finish",
            exportVideoStep4: "The animation will be recorded as a high-quality video file",
            exportVideoStep5: "When complete, the video will automatically download",
            exportVideoImportant: "Important:",
            exportVideoStayActive: "Keep this browser tab active during recording for best results. The process typically takes 30-90 seconds.",
            exportVideoQuality: "Video Quality:",
            exportVideoQualityDesc: "30 FPS WebM format with your chosen zoom level and camera settings preserved",
            exportVideoStart: "🎬 Start Recording",
            exportVideoKeepTabActive: "Keep this browser tab active",
            exportVideoCloseOtherApps: "Close other heavy applications",
            exportVideoLetComplete: "Let the process complete without interruption",
            
            multipleTracksLoaded: "Multiple tracks loaded! Scroll down to the Journey Builder to arrange them and add transportation between tracks.",
            errorProcessingFiles: "Error processing files:",
            processingFiles: "Processing files...",
            
            // 3D Terrain messages
            terrain3dEnabledDefault: "3D terrain enabled by default! The map has a slight 3D tilt with elevation data.",
            terrain3dEnabled: "3D terrain enabled! The map now has a slight 3D tilt with elevation data.",
            terrain3dNotSupported: "3D terrain is not supported by your browser/device",
            terrain3dDisabled: "3D terrain disabled",
            elevationDataOpenTopo: "Using OpenTopography elevation data (subtle)",
            elevationDataMapzen: "Using Mapzen elevation data (default)",
            elevationDataChanged: "Switched to {source} elevation data",
            
            // File processing messages
            notGpxFile: "is not a GPX file",
            errorProcessingFile: "Error processing",
            filesLoadedSuccessfully: "GPX file(s) loaded successfully!",
            canvasStreamNotSupported: "Browser does not support canvas.captureStream()",
            
            // Journey Builder messages
            invalidTrackData: "Invalid track data received",
            trackAddedAutoPreview: "Track added! The journey will preview automatically.",
            trackAddedUpdating: "Track added! Journey updating...",
            errorUpdatingSegmentTiming: "Error updating segment timing",
            openingMapPreview: "Opening map preview to enable route drawing...",
            clickMapToDraw: "Click on the map to draw your {mode}. Press Escape or click \"Finish Route\" when done.",
            routeDrawingCancelled: "Route drawing cancelled",
            routeMustHaveTwoPoints: "Route must have at least 2 points",
            routeCompleted: "{mode} completed in {time} seconds!",
            noJourneyToPreview: "No journey to preview. Add tracks and transportation.",
            selectNewTransportMode: "Select a new transportation mode",
            transportationRemoved: "Transportation removed",
            errorParsingFile: "Error parsing",
            additionalTracksAdded: "additional track(s) added!",
            errorAddingTracks: "Error adding tracks",
            segmentTotalTime: "Segment: {segmentTime}s | Total: {totalTime}s",
            
            // Map and journey messages
            mapNotReadyForRouteDrawing: "Map not ready for route drawing",
            journeyUpdatedNewOrder: "Journey updated with new segment order",
            errorUpdatingJourney: "Error updating journey",
            journeyPreviewLoaded: "Journey preview loaded!",
            errorLoadingJourneyData: "Error loading journey data",
            
            // Input placeholders
            annotationTitlePlaceholder: "Annotation title...",
            annotationDescriptionPlaceholder: "Description (optional)...",
            journeyAnimationTiming: "Journey Animation Timing",
            timingTracks: "Tracks:",
            timingTransportation: "Transportation:",
            timingNote: "💡 Adjust individual segment times in the Journey Builder above",
            gpxOnlyStatsEnabled: "Transfer distances excluded from stats",
            gpxOnlyStatsDisabled: "All distances included in stats"
        },
        
        journey: {
            title: "Journey Builder",
            tracks: "Uploaded Tracks",
            segments: "Journey Segments",
            autoUpdating: "Auto-updating journey...",
            journeyUpdated: "Journey updated!",
            noTracks: "Upload GPX files to start building your journey",
            addTransportation: "Add transportation between tracks",
            clearAll: "🗑️ Clear All",
            autoPreview: "Auto-updating journey...",
            
            // Transportation modes
            transportCar: "🚗 Car",
            transportBoat: "⛵ Boat",
            transportPlane: "✈️ Plane",
            transportTrain: "🚂 Train",
            transportWalk: "🚶‍♂️ Walk"
        },
        
        // Footer elements
        footer: {
            copyright: "TrailReplay - Open Source Trail Storytelling",
            builtWith: "Built with ❤️ for the outdoor community",
            techStack: "Built with MapLibre GL JS + Three.js + Elevation Data",
            github: "View on GitHub",
            coffee: "☕  Buy me a coffee"
        },
        
        // Modal buttons
        buttons: {
            save: "Save",
            cancel: "Cancel",
            close: "Close",
            choose: "Choose",
            chooseIcon: "Choose Icon",
            delete: "Delete"
        },
        
        // Status messages
        status: {
            cancel: "✖️ Cancel",
            autoUpdatingJourney: "Auto-updating journey...",
            journeyUpdated: "Journey updated!"
        },
        
        // Journey Builder UI
        journeyBuilder: {
            addMoreTracks: "Add More Tracks",
            clickToUploadAdditionalGPXFiles: "Click to upload additional GPX files",
            moveUp: "Move Up",
            moveDown: "Move Down",
            remove: "Remove",
            journeyTiming: "📊 Journey Timing",
            tracks: "Tracks",
            transportation: "Transportation",
            animationTime: "Animation Time",
            seconds: "seconds",
            edit: "Edit",
            addTransport: "Add Transport",
            chooseHowToTravelBetweenTracks: "Choose how to travel between tracks",
            journeyTimeline: "🎬 Journey Timeline", 
            animationTime: "Animation Time",
            duration: "Duration",
            editTiming: "Edit Timing",
            totalDuration: "Total Duration",
            currentDuration: "Current Duration",
            useCustomTiming: "Use Custom Timing",
            resetToDefault: "Reset to Default",
            distance: "Distance",
            transportMode: "Transport Mode",
            defaultDuration: "Default Duration",
            customDuration: "Custom Duration",
            durationInMinutes: "Duration in minutes",
            leaveEmptyForDefault: "Leave empty for default",
            transportationOptions: "Transportation Options",
            routeOptions: "Route Options",
            directRoute: "Direct Route",
            directRouteDescription: "Straight line connection",
            calculateRoute: "Calculate Route",
            calculateRouteDescription: "Use routing service",
            drawRoute: "Draw Route",
            drawRouteDescription: "Draw custom route on map",
            timing: "Timing",
            editTransport: "Edit Transportation",
            drawRouteBtn: "Draw Route",
            needTwoTracksForTransport: "Need at least 2 tracks to add transportation",
            mapNotAvailable: "Map not available for route drawing",
            transport: {
                car: "Car",
                walking: "Walking",
                cycling: "Cycling",
                bus: "Bus",
                train: "Train",
                plane: "Plane",
                boat: "Boat",
                walk: "Walk"
                         }
         }
      },
    es: {
        subtitle: "Revive la historia que contaron tus senderos",
        
        // Tutorial and examples
        tutorial: {
            link: "📚 Tutorial y Ejemplos",
            title: "Tutorial Completo y Guía de Funciones",
            welcomeTitle: "Bienvenido a TrailReplay",
            welcomeSubtitle: "Transforma los datos de tus rutas GPX en hermosas animaciones 3D interactivas",
            welcomeDescription: "TrailReplay es una aplicación web potente pero simple que convierte los datos GPS de tus rutas en historias visuales impresionantes. Ya seas corredor, ciclista, senderista o atleta multideporte, TrailReplay te ayuda a revivir y compartir tus aventuras al aire libre a través de mapas animados, estadísticas detalladas y videos exportables.",
            proTip: "💡 Consejo Profesional:",
            proTipText: "¡TrailReplay funciona completamente en tu navegador - no se suben datos a servidores, garantizando tu privacidad y permitiendo uso offline!",
            
            // Sample files section
            sampleFiles: "Descargar Archivos GPX de Ejemplo",
            sampleFilesSubtitle: "Prueba TrailReplay con estas actividades de ejemplo",
            exampleActivities: "🏃‍♂️ Actividades de Ejemplo",
            sampleDescription: "Descarga estos archivos GPX de ejemplo para explorar todas las funciones de TrailReplay:",
            downloadRunning: "🏃‍♂️ Ruta de Correr (5km)",
            downloadCycling: "🚴‍♂️ Ruta de Ciclismo (25km)",
            downloadHiking: "🥾 Caminata de Montaña (8km)",
            downloadMulti: "🏆 Viaje Multideporte",
            
            // Demo video section
            demoVideoTitle: "Ve Lo Que Puedes Crear",
            demoVideoSubtitle: "Ejemplo de una animación de sendero 3D hecha con TrailReplay",
            demoCaption: "Este ejemplo muestra el tipo de animación inmersiva de senderos 3D que puedes crear con tus propios datos GPX usando las potentes funciones de TrailReplay.",
            videoNotSupported: "Tu navegador no soporta reproducción de video. Puedes descargar el video de ejemplo en su lugar.",
            
            // Core features
            coreFeatures: "Resumen de Funciones Principales",
            coreFeaturesSubtitle: "Todo lo que puedes hacer con TrailReplay",
            multiFileTitle: "📁 Subida de Múltiples Archivos",
            multiFileDescription: "Sube múltiples archivos GPX para crear viajes complejos. Perfecto para aventuras de múltiples días o comparar diferentes rutas.",
            journeyBuilderTitle: "🧩 Constructor de Viajes",
            journeyBuilderDescription: "Combina múltiples rutas en un solo viaje con segmentos de transporte personalizados entre actividades.",
            animationTitle: "🎬 Animación 3D",
            animationDescription: "Ve cómo tu ruta cobra vida con animaciones 3D fluidas, iconos personalizables y estadísticas en tiempo real.",
            videoExportTitle: "📹 Exportación de Video",
            videoExportDescription: "Exporta tu ruta animada como un archivo de video para compartir en redes sociales o guardar como recuerdo.",
            annotationsTitle: "📝 Anotaciones de Ruta",
            annotationsDescription: "Añade notas, fotos y puntos de interés en ubicaciones específicas a lo largo de tu ruta para contar historias.",
            iconTimelineTitle: "🔄 Cronología de Iconos",
            iconTimelineDescription: "Cambia iconos de actividad durante la animación para representar diferentes actividades o condiciones.",
            mapStylesTitle: "🗺️ Múltiples Estilos de Mapa",
            mapStylesDescription: "Elige entre estilos de mapa satelital, terreno o calles. Activa el terreno 3D para una visualización de elevación dramática.",
            liveStatsTitle: "📊 Estadísticas en Vivo",
            liveStatsDescription: "Datos de distancia, elevación y tiempo en tiempo real que se actualizan mientras se reproduce la animación.",
            multiLanguageTitle: "🌍 Multiidioma",
            multiLanguageDescription: "Soporte completo para inglés y español con detección automática de idioma.",
            
            // Getting started
            gettingStarted: "Comenzando",
            gettingStartedSubtitle: "Tu primera animación de TrailReplay en 5 minutos",
            step1Title: "Sube tu Archivo GPX",
            step1Description: "Arrastra y suelta un archivo GPX en el área de carga, o haz clic en \"Elegir Archivos\" para navegar. Puedes subir múltiples archivos a la vez.",
            step2Title: "Construye tu Viaje",
            step2Description: "Tus rutas subidas aparecen en el Constructor de Viajes. Reordénalas arrastrando, y añade segmentos de transporte entre rutas si es necesario.",
            step3Title: "Personaliza la Visualización",
            step3Description: "Elige tu estilo de mapa, color de ruta, iconos de actividad y configuraciones de animación. Activa el terreno 3D para un efecto dramático.",
            step4Title: "Reproduce tu Animación",
            step4Description: "Haz clic en el botón Reproducir para comenzar la animación. Usa la barra de progreso para saltar a momentos específicos.",
            step5Title: "Añade Anotaciones (Opcional)",
            step5Description: "Haz clic en \"Añadir Nota\" para añadir anotaciones en puntos específicos. Estas aparecerán durante la reproducción de la animación.",
            step6Title: "Exporta tu Video",
            step6Description: "Haz clic en \"Exportar Video\" para guardar tu animación como un archivo de video WebM para compartir.",
            
            // Advanced features
            advancedFeatures: "Funciones Avanzadas",
            advancedFeaturesSubtitle: "Consejos para usuarios avanzados y funcionalidad avanzada",
            backToApp: "← Volver a la App TrailReplay",
            journeyBuilderAdvancedTitle: "🧩 Constructor Avanzado de Viajes",
            journeyBuilderAdvancedDesc: "El Constructor de Viajes te permite crear recorridos multi-actividad complejos:",
            reorderTracks: "<strong>Reordenar Rutas:</strong> Arrastra las rutas para cambiar la secuencia de tu viaje",
            customTiming: "<strong>Tiempo Personalizado:</strong> Modifica los cálculos automáticos de tiempo con duraciones personalizadas",
            transportationSegments: "<strong>Segmentos de Transporte:</strong> Añade segmentos de coche, barco, avión, tren o caminata entre rutas",
            autoPreview: "<strong>Vista Previa Automática:</strong> Los cambios se aplican automáticamente a la visualización",
            dynamicIconChangesTitle: "🔄 Cambios Dinámicos de Iconos",
            dynamicIconChangesDesc: "Cuenta tu historia con iconos cambiantes:",
            addIconChange: "Haz clic en \"Cambiar Icono\" y luego en el mapa o barra de progreso",
            chooseNewIcon: "Elige un nuevo icono que represente diferentes actividades o condiciones",
            perfectFor: "Perfecto para triatlones, carreras de aventura o cambios de clima",
            smartAnnotationsTitle: "📝 Anotaciones Inteligentes",
            smartAnnotationsDesc: "Agrega contexto a tu ruta:",
            choosePresetIcons: "Elige entre iconos predefinidos (📍 ubicación, ⚠️ advertencia, 📸 foto, etc.)",
            addTitles: "Agrega títulos y descripciones a cada anotación",
            annotationsAppear: "Las anotaciones aparecen automáticamente durante la animación",
            clickAnnotations: "Haz clic en las anotaciones de la lista para saltar a ese punto",
            videoExportOptionsTitle: "🎥 Opciones de Exportación de Video",
            videoExportOptionsDesc: "Exportaciones de video de calidad profesional:",
            webmFormat: "<strong>Formato WebM:</strong> Videos web de alta calidad",
            cleanInterface: "<strong>Interfaz Limpia:</strong> Los elementos de la interfaz se ocultan durante la exportación",
            fps: "<strong>30 FPS:</strong> Animación fluida a 30 cuadros por segundo",
            customBitrate: "<strong>Tasa de Bits Personalizada:</strong> 2.5 Mbps para un equilibrio óptimo calidad/tamaño",
            videoExportTipsTitle: "⚠️ Consejos para Exportar Video:",
            videoExportTips: "Para mejores resultados, espera a que el mapa cargue completamente antes de exportar. Si ves áreas blancas (tiles cargando), espera un momento o reduce la velocidad de animación.",
            mapCustomizationTitle: "Personalización del Mapa",
            mapCustomizationDesc: "Haz tu visualización perfecta para tu historia",
            mapStyles: "Estilos de Mapa",
            mapStylesDesc: "<strong>🛰️ Satélite:</strong> Imágenes satelitales de alta resolución<br><strong>🗻 Terreno:</strong> Topografía con sombreado de elevación<br><strong>🗺️ Calle:</strong> Mapeo detallado a nivel de calle",
            terrain3d: "Terreno 3D",
            terrain3dDesc: "Activa el terreno 3D para una visualización de elevación dramática. Elige entre Mapzen Terrarium (global) u OpenTopography SRTM.",
            trailStyling: "Estilo de la Ruta",
            trailStylingDesc: "Personaliza el color de la ruta con opciones predefinidas o colores personalizados. Ajusta el tamaño del marcador y habilita/deshabilita los círculos de fondo.",
            autoFollow: "Seguimiento Automático",
            autoFollowDesc: "La cámara sigue automáticamente el marcador animado, o desactívalo para ver toda la ruta fija.",
            troubleshootingTitle: "Solución de Problemas y Consejos",
            troubleshootingDesc: "Problemas comunes y cómo resolverlos",
            fileUploadIssues: "📁 Problemas al Subir Archivos",
            fileFormat: "<strong>Formato:</strong> Solo se admiten archivos GPX (no TCX, FIT u otros)",
            fileSize: "<strong>Tamaño:</strong> Archivos muy grandes (>1000 puntos) pueden ralentizar el rendimiento",
            fileContent: "<strong>Contenido:</strong> Los archivos GPX deben contener puntos de ruta con coordenadas y marcas de tiempo",
            videoExportIssues: "🎥 Problemas al Exportar Video",
            whiteAreas: "<strong>Áreas Blancas:</strong> Espera a que los tiles del mapa carguen antes de exportar",
            browserSupport: "<strong>Navegadores Compatibles:</strong> Chrome y Firefox funcionan mejor para exportar video",
            performance: "<strong>Rendimiento:</strong> Cierra otras pestañas del navegador para mejorar la grabación",
            mapDisplayIssues: "🗺️ Problemas de Visualización del Mapa",
            slowLoading: "<strong>Carga Lenta:</strong> Desactiva el terreno 3D si el mapa carga lento",
            missingTiles: "<strong>Tiles Faltantes:</strong> Verifica tu conexión a internet",
            poorPerformance: "<strong>Pobre Rendimiento:</strong> Prueba cambiando a un estilo de mapa más simple",
            performanceTipsTitle: "💡 Consejos de Rendimiento:",
            simplifyFiles: "Simplifica archivos GPX grandes reduciendo puntos de ruta",
            satelliteView: "Usa vista satelital para mejor impacto visual",
            recordAtLowerSpeed: "Graba videos a menor velocidad de animación para mayor fluidez",
            clearCache: "Limpia la caché del navegador si tienes problemas",
            technicalDetailsTitle: "Detalles Técnicos",
            technicalDetailsDesc: "Cómo funciona TrailReplay internamente",
            techStack: "🔧 Stack Tecnológico",
            maplibre: "<strong>MapLibre GL JS:</strong> Mapeo y visualización 3D de código abierto",
            threejs: "<strong>Three.js:</strong> Capacidades gráficas 3D adicionales",
            mediaRecorder: "<strong>MediaRecorder API:</strong> Grabación de video nativa del navegador",
            turfjs: "<strong>Turf.js:</strong> Cálculos y análisis geoespaciales",
            webWorkers: "<strong>Web Workers:</strong> Procesamiento en segundo plano para archivos grandes",
            privacySecurity: "🔒 Privacidad y Seguridad",
            clientSide: "<strong>Sólo en el Cliente:</strong> Todo el procesamiento ocurre en tu navegador",
            noDataUpload: "<strong>Sin Subida de Datos:</strong> Tus archivos GPX nunca salen de tu dispositivo",
            noTracking: "<strong>Sin Seguimiento:</strong> Sin analíticas ni rastreo de usuario",
            openSource: "<strong>Código Abierto:</strong> Todo el código es público",
            browserSupport: "🌐 Navegadores Compatibles",
            chrome: "<strong>Chrome 80+:</strong> Soporte completo de funciones incluyendo exportación de video",
            firefox: "<strong>Firefox 75+:</strong> Soporte completo de funciones",
            safari: "<strong>Safari 14+:</strong> Funciones básicas (la exportación de video puede ser limitada)",
            edge: "<strong>Edge 80+:</strong> Soporte completo de funciones",
            elevationDataChanged: "Cambiado a datos de elevación {source}",
            terrainSourceSwitched: "Fuente de terreno cambiada a {source}",
            openTopoUnavailable: "OpenTopography no disponible, cambiado a Mapzen",
            mapzenWorking: "Datos de elevación Mapzen cargando correctamente"
        },
        
        upload: {
            title: "Subir Archivos GPX",
            description: "Añade múltiples rutas GPX para crear tu viaje",
            button: "Elegir Archivos"
        },
        
        controls: {
            activity: "Tipo de Actividad:",
            terrain: "Estilo de Terreno:",
            totalTime: "Tiempo Total:",
            pathColor: "Color del Sendero",
            markerSize: "Tamaño del Marcador",
            currentIcon: "Icono Actual",
            changeIcon: "Cambiar",
            autoFollow: "Seguimiento Automático",
            showCircle: "Mostrar Círculo",
            play: "Reproducir",
            pause: "Pausar",
            reset: "Reiniciar",
            addIconChange: "🔄 Cambiar Icono",
            addAnnotation: "📍 Añadir Nota",
            export: "📹 Exportar Video",
            videoExport: "Exportar Video",
            exportHelp: "ℹ️ Opciones de Exportación",
            exportHelpHide: "ℹ️ Ocultar Opciones",
            
            // Manual recording instructions
            manualRecordingTitle: "🎥 Modo Manual con Estadísticas",
            manualRecordingInstructions: "Instrucciones para Grabación de Calidad Perfecta:",
            manualRecordingWindows: "Windows:",
            manualRecordingWindowsKeys: "<kbd>Win</kbd> + <kbd>G</kbd> → Barra de Juegos → Grabar",
            manualRecordingMac: "Mac:",
            manualRecordingMacKeys: "<kbd>⌘</kbd> + <kbd>⇧</kbd> + <kbd>5</kbd> → Grabar Porción Seleccionada",
            manualRecordingHighlight: "📱 ¡El resaltado naranja muestra exactamente qué capturar!",
            manualRecordingHighlightDesc: "Esto asegura que obtengas todas las estadísticas, perfil de elevación y overlays en calidad perfecta.",
            manualRecordingWhatHappens: "Qué sucede después:",
            manualRecordingStep1: "Los tiles del mapa se precargarán para una grabación fluida",
            manualRecordingStep2: "El área de grabación se resaltará en naranja",
            manualRecordingStep3: "La animación comenzará automáticamente con todas las estadísticas",
                    manualRecordingStep4: "Usa el grabador de pantalla de tu sistema para capturar el área resaltada", 
        manualRecordingStep5: "Presiona Escape en cualquier momento para salir del modo de grabación manual",
        manualRecordingCancel: "Cancelar",
            manualRecordingStart: "🎬 Iniciar Preparación",

            exportAutoTitle: "🔧 Grabación Automática (WebM)",
            exportAutoDesc: "Grabación automática con overlays renderizados en canvas. Funciona en todos los navegadores (formato WebM).",
            exportCropTitle: "🚀 Grabación Automática (MP4)",
            exportCropDesc: "⚠️ EXPERIMENTAL: Solo Chrome 126+. Usa CropTarget API experimental. Puede no funcionar correctamente - usa modo WebM si encuentras problemas.",
            exportManualTitle: "🎥 Manual Mode con Estadísticas",
            exportManualDesc: "Mejor calidad con todas las estadísticas y overlays. Usa el grabador de pantalla de tu sistema para capturar el área destacada mientras se reproduce la animación.",
            exportAutoWebm: "🔧 Auto (WebM)",
            exportAutoCrop: "🚀 Auto (MP4)",
            exportManual: "🎥 Manual Mode con Estadísticas",
            manualWindows: "Windows:",
            manualMac: "Mac:",
            autoZoom: "Auto Zoom",
            terrain3d: "Terreno 3D",
            terrainSource: "Datos de Elevación",
            showStats: "Mostrar Estadísticas en Vivo",
            gpxOnlyStats: "No contar distancias en transfers",
            language: "Idioma"
        },
        
        cameraInfo: {
            title: "Controles de Cámara del Mapa",
            buttonText: "ℹ️ Controles de Cámara",
            desktop: {
                title: "💻 Controles de Escritorio",
                pan: "Desplazar: Clic y arrastrar para mover el mapa",
                zoom: "Zoom: Rueda del ratón o teclas +/-",
                rotate: "Rotar: Clic derecho y arrastrar, o Mayús + clic y arrastrar",
                tilt: "Inclinar: Ctrl + clic y arrastrar (modo 3D)"
            },
            mobile: {
                title: "📱 Controles Móviles",
                pan: "Desplazar: Tocar y arrastrar con un dedo",
                zoom: "Zoom: Pellizcar con dos dedos para acercar/alejar",
                rotate: "Rotar: Tocar y arrastrar con dos dedos",
                tilt: "Inclinar: Tocar con dos dedos y mover arriba/abajo (modo 3D)"
            }
        },
        
        iconSelection: {
            title: "Seleccionar Icono"
        },
        
        iconChange: {
            title: "Añadir Cambio de Icono",
            instruction: "Haz clic en el mapa o en la barra de progreso para establecer la posición donde debe cambiar el icono.",
            newIcon: "Nuevo Icono"
        },
        
        iconChanges: {
            title: "Cronología de Cambios de Icono"
        },
        
        annotations: {
            title: "Anotaciones del Sendero",
            addTitle: "Añadir Anotación",
            clickToAdd: "Haz clic en el mapa para añadir una anotación",
            noAnnotations: "No se han añadido anotaciones aún"
        },
        
        stats: {
            title: "Estadísticas del Sendero",
            distance: "Distancia Total",
            duration: "Duración",
            elevation: "Ganancia de Elevación",
            speed: "Velocidad Promedio",
            currentDistance: "Distancia",
            currentElevation: "Elevación",
            currentSpeed: "Velocidad"
        },
        
        messages: {
            fileLoaded: "¡Archivo GPX cargado exitosamente!",
            fileError: "Error al cargar el archivo GPX. Por favor intenta de nuevo.",
            noTrackPoints: "No se encontraron puntos de ruta en el archivo GPX.",
            exportStarted: "Iniciando exportación de video...",
            exportComplete: "¡Exportación de video completada!",
            annotationAdded: "Anotación del sendero añadida",
            iconChangeAdded: "Cambio de icono añadido",
            clickMapToAnnotate: "Haz clic en el mapa para añadir una anotación",
            clickMapForIconChange: "Haz clic en el mapa para añadir un cambio de icono",
            noTrackForExport: "No hay ninguna ruta cargada. Carga un archivo GPX antes de exportar.",
            mediaDeviceNotSupported: "La grabación de video no es compatible con tu navegador.",
            mapNotReady: "El mapa no está listo para exportar el video.",
            exportVideoPrepare: "Preparando la exportación del video. Por favor espera...",
            exportVideoRecording: "Grabando animación... Por favor espera hasta que termine.",
            exportError: "Error durante la exportación del video",
            
            // Video export confirmation dialog
            exportVideoTitle: "Exportar Video de Animación de Ruta",
            exportVideoWhatHappens: "Esto es lo que pasará durante la exportación:",
            exportVideoStep1: "La interfaz de la página se ocultará temporalmente para una grabación limpia",
            exportVideoStep2: "Tu zoom actual y orientación de cámara se preservarán",
            exportVideoStep3: "Tu animación de ruta se reproducirá automáticamente de principio a fin",
            exportVideoStep4: "La animación se grabará como un archivo de video de alta calidad",
            exportVideoStep5: "Cuando termine, el video se descargará automáticamente",
            exportVideoImportant: "Importante:",
            exportVideoStayActive: "Mantén esta pestaña del navegador activa durante la grabación para mejores resultados. El proceso típicamente toma 30-90 segundos.",
            exportVideoQuality: "Calidad del Video:",
            exportVideoQualityDesc: "Formato WebM de 30 FPS con tu zoom actual y configuración de cámara preservada",
            exportVideoStart: "🎬 Comenzar Grabación",
            exportVideoKeepTabActive: "Mantén esta pestaña del navegador activa",
            exportVideoCloseOtherApps: "Cierra otras aplicaciones pesadas",
            exportVideoLetComplete: "Deja que el proceso termine sin interrupciones",
            
            multipleTracksLoaded: "Multiple tracks loaded! Scroll down to the Journey Builder to arrange them and add transportation between tracks.",
            errorProcessingFiles: "Error processing files:",
            processingFiles: "Processing files...",
            
            // 3D Terrain messages
            terrain3dEnabledDefault: "¡Terreno 3D activado por defecto! El mapa tiene una ligera inclinación 3D con datos de elevación.",
            terrain3dEnabled: "¡Terreno 3D activado! El mapa ahora tiene una ligera inclinación 3D con datos de elevación.",
            terrain3dNotSupported: "El terreno 3D no es compatible con tu navegador/dispositivo",
            terrain3dDisabled: "Terreno 3D desactivado",
            elevationDataOpenTopo: "Usando datos de elevación OpenTopography (sutil)",
            elevationDataMapzen: "Usando datos de elevación Mapzen (por defecto)",
            elevationDataChanged: "Cambiado a datos de elevación {source}",
            
            // File processing messages
            notGpxFile: "no es un archivo GPX",
            errorProcessingFile: "Error procesando",
            filesLoadedSuccessfully: "archivo(s) GPX cargado(s) exitosamente!",
            canvasStreamNotSupported: "El navegador no soporta canvas.captureStream()",
            
            // Journey Builder messages
            invalidTrackData: "Datos de ruta inválidos recibidos",
            trackAddedAutoPreview: "¡Ruta añadida! El viaje se previsualizará automáticamente.",
            trackAddedUpdating: "¡Ruta añadida! Actualizando viaje...",
            errorUpdatingSegmentTiming: "Error actualizando tiempo del segmento",
            openingMapPreview: "Abriendo vista previa del mapa para habilitar dibujo de ruta...",
            clickMapToDraw: "Haz clic en el mapa para dibujar tu {mode}. Presiona Escape o haz clic en \"Finalizar Ruta\" cuando termines.",
            routeDrawingCancelled: "Dibujo de ruta cancelado",
            routeMustHaveTwoPoints: "La ruta debe tener al menos 2 puntos",
            routeCompleted: "¡{mode} completado en {time} segundos!",
            noJourneyToPreview: "No hay viaje para previsualizar. Añade rutas y transporte.",
            selectNewTransportMode: "Selecciona un nuevo modo de transporte",
            transportationRemoved: "Transporte eliminado",
            errorParsingFile: "Error analizando",
            additionalTracksAdded: "ruta(s) adicional(es) añadida(s)!",
            errorAddingTracks: "Error añadiendo rutas",
            segmentTotalTime: "Segmento: {segmentTime}s | Total: {totalTime}s",
            
            // Map and journey messages
            mapNotReadyForRouteDrawing: "Mapa no listo para dibujo de ruta",
            journeyUpdatedNewOrder: "Viaje actualizado con nuevo orden de segmentos",
            errorUpdatingJourney: "Error actualizando viaje",
            journeyPreviewLoaded: "¡Vista previa del viaje cargada!",
            errorLoadingJourneyData: "Error cargando datos del viaje",
            
            // Input placeholders
            annotationTitlePlaceholder: "Título de la anotación...",
            annotationDescriptionPlaceholder: "Descripción (opcional)...",
            journeyAnimationTiming: "Cronología de Animación del Viaje",
            timingTracks: "Rutas:",
            timingTransportation: "Transporte:",
            timingNote: "💡 Ajusta los tiempos de los segmentos individuales en el Constructor de Viajes arriba",
            gpxOnlyStatsEnabled: "Distancias de transfers excluidas de estadísticas",
            gpxOnlyStatsDisabled: "Todas las distancias incluidas en estadísticas"
        },
        
        journey: {
            title: "Constructor de Viajes",
            tracks: "Rutas Subidas",
            segments: "Segmentos del Viaje",
            autoUpdating: "Actualizando viaje automáticamente...",
            journeyUpdated: "¡Viaje actualizado!",
            noTracks: "Sube archivos GPX para comenzar a construir tu viaje",
            addTransportation: "Añadir transporte entre rutas",
            clearAll: "🗑️ Limpiar Todo",
            autoPreview: "Actualizando viaje automáticamente...",
            
            // Transportation modes
            transportCar: "🚗 Coche",
            transportBoat: "⛵ Barco",
            transportPlane: "✈️ Avión",
            transportTrain: "🚂 Tren",
            transportWalk: "🚶‍♂️ Caminar"
        },
        
        // Footer elements
        footer: {
            copyright: "TrailReplay - Narrativa de Senderos de Código Abierto",
            builtWith: "Construido con ❤️ para la comunidad outdoor",
            techStack: "Construido con MapLibre GL JS + Three.js + Datos de Elevación",
            github: "Ver en GitHub",
            coffee: "☕ Invítame a un café"
        },
        
        // Modal buttons
        buttons: {
            save: "Guardar",
            cancel: "Cancelar",
            close: "Cerrar",
            choose: "Elegir",
            chooseIcon: "Elegir Icono"
        },
        
        // Status messages
        status: {
            cancel: "✖️ Cancel",
            autoUpdatingJourney: "Actualizando viaje automáticamente...",
            journeyUpdated: "¡Viaje actualizado!"
        },
        
        // Journey Builder UI
        journeyBuilder: {
            addMoreTracks: "Añadir Más Rutas",
            clickToUploadAdditionalGPXFiles: "Haga clic para subir archivos GPX adicionales",
            moveUp: "Mover Arriba",
            moveDown: "Mover Abajo",
            remove: "Eliminar",
            journeyTiming: "📊 Tiempo del Viaje",
            tracks: "Rutas",
            transportation: "Transporte",
            animationTime: "Tiempo de Animación",
            seconds: "segundos",
            edit: "Editar",
            addTransport: "Añadir Transporte",
            chooseHowToTravelBetweenTracks: "Elige cómo viajar entre rutas",
            journeyTimeline: "🎬 Cronología del Viaje",
            animationTime: "Tiempo de Animación", 
            duration: "Duración",
            editTiming: "Editar Tiempo",
            totalDuration: "Duración Total",
            currentDuration: "Duración Actual",
            useCustomTiming: "Usar Tiempo Personalizado",
            resetToDefault: "Restablecer por Defecto",
            distance: "Distancia",
            transportMode: "Modo de Transporte",
            defaultDuration: "Duración por Defecto",
            customDuration: "Duración Personalizada",
            durationInMinutes: "Duración en minutos",
            leaveEmptyForDefault: "Dejar vacío para por defecto",
            transportationOptions: "Opciones de Transporte",
            routeOptions: "Opciones de Ruta",
            directRoute: "Ruta Directa",
            directRouteDescription: "Conexión en línea recta",
            calculateRoute: "Calcular Ruta",
            calculateRouteDescription: "Usar servicio de rutas",
            drawRoute: "Dibujar Ruta",
            drawRouteDescription: "Dibujar ruta personalizada en el mapa",
            timing: "Tiempo",
            editTransport: "Editar Transporte",
            drawRouteBtn: "Dibujar Ruta",
            needTwoTracksForTransport: "Se necesitan al menos 2 rutas para añadir transporte",
            mapNotAvailable: "Mapa no disponible para dibujar rutas",
            transport: {
                car: "Coche",
                walking: "Caminando",
                cycling: "Ciclismo",
                bus: "Autobús",
                train: "Tren",
                plane: "Avión",
                boat: "Barco",
                walk: "Caminar"
            }
        }
    }
};

let currentLanguage = 'en';

export function setLanguage(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        try {
            localStorage.setItem('trailReplayLang', lang);
        } catch (e) {}
        updatePageTranslations();
    }
}

export function t(key, params = {}) {
    const keys = key.split('.');
    let value = translations[currentLanguage];
    
    for (const k of keys) {
        value = value?.[k];
    }
    
    if (!value) return key;
    
    // Handle parameter interpolation
    if (typeof value === 'string' && Object.keys(params).length > 0) {
        return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
            return params[paramKey] !== undefined ? params[paramKey] : match;
        });
    }
    
    return value;
}

function updatePageTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = t(key);
        if (translation) {
            element.innerHTML = translation;
        }
    });
}

// Auto-detect browser language
export function initializeTranslations() {
    let savedLang = null;
    try {
        savedLang = localStorage.getItem('trailReplayLang');
    } catch (e) {}
    const browserLang = navigator.language.slice(0, 2);
    setLanguage(translations[savedLang] ? savedLang : (translations[browserLang] ? browserLang : 'en'));
} 