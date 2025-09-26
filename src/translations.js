// Simple translation system
import { AnalyticsTracker } from './utils/analytics.js';

// Current language state
let currentLanguage = 'en';

export const translations = {
    en: {
        modes: {
            mapMode: "Map Mode",
            staticMode: "Static Mode"
        },
        staticMode: {
            title: "Static Mode",
            subtitle: "Create beautiful animated videos with your own background images",
            uploadImage: "Upload Background Image",
            imageHint: "Choose a thematic image (bike, landscape, runner, etc.)",
            chooseImage: "Choose Image",
            uploadGpx: "Upload GPX File", 
            gpxHint: "Your trail data for stats and elevation",
            chooseGpx: "Choose GPX",
            preview: "Preview",
            previewAnimation: "Preview Animation",
            exportVideo: "Export Video",
            customization: "Customization",
            exportFormat: "Export Format",
            trailVisualization: "Trail Visualization",
            statsPosition: "Stats Position",
            colorTheme: "Color Theme",
            animationDuration: "Animation Duration",
            showElevationProfile: "Show Elevation Profile"
        },
        controls: {
            pathColor: "Trail Color:",
            track1Letters: "Track Letters",
            showTrackLettersTitle: "Show letters on main track",
            comparisonSettings: "🏃‍♂️ Comparison Mode",
            enableComparison: "Enable Comparison",
            comparisonInstructionsTitle: "How to use:",
            comparisonInstructionsStep1: "1. Load main GPX track",
            comparisonInstructionsStep2: "2. Select comparison GPX file",
            comparisonInstructionsStep3: "3. Customize names & colors below",
            comparisonTracksTitle: "Tracks:",
            comparisonTracksTrack1: "• Track 1: Main track (color is customizable)",
            comparisonTracksTrack2: "• Track 2: Comparison track",
            secondTrack: "Second Track",
            selectTrack: "Select GPX File",
            track2Name: "Track 2 Name",
            comparisonColorTitle: "Track 2 Color",
            comparisonColorReset: "Reset",
            comparisonNamesTrack1Placeholder: "Track 1",
            comparisonNamesTrack2Placeholder: "Track 2"
        },
        subtitle: "Replay the story your trails told",
        support: "Support",
        acknowledgments: {
            title: "Acknowledgments",
            intro: "TrailReplay is proudly built on the shoulders of open source giants. We thank the following projects and communities:",
            maplibre: "Open-source JavaScript library for interactive maps and 3D visualization in the browser. Powers all the map rendering and animation in TrailReplay.",
            osm: "Collaborative project to create a free, editable map of the world. Provides the base map data for TrailReplay.",
            opentopo: "Open, topographic map tiles based on OSM data. Used for terrain and outdoor visualization.",
            ors: "Open-source routing engine and API based on OSM. Used for calculating routes between points.",
            turf: "Advanced geospatial analysis for JavaScript. Used for distance, geometry, and spatial calculations.",
            langBtn: "Español",
            back: "← Back to TrailReplay"
        },
        
        // Tutorial and examples
        tutorial: {
            link: "📚 Tutorial & Examples",
            title: "Complete Tutorial & Feature Guide",
            welcomeTitle: "Welcome to TrailReplay",
            welcomeSubtitle: "Transform your GPX trail data into beautiful, interactive 3D animations",
            welcomeDescription: "TrailReplay is a powerful yet simple web application that turns your GPS trail data into stunning visual stories. Whether you're a runner, cyclist, hiker, or multi-sport athlete, TrailReplay helps you relive and share your outdoor adventures through animated maps, detailed statistics, and exportable videos.",
            proTip: "💡 Pro Tip:",
            proTipText: "TrailReplay works entirely in your browser - no data is uploaded to servers, ensuring your privacy and enabling offline use!",
            
            // GPX Download Guide section
            gpxDownloadTitle: "How to Download GPX Files",
            gpxDownloadSubtitle: "Complete guide to export your GPS tracks from popular platforms",
            gpxDownloadDescription: "Before you can create trail animations, you'll need GPX files from your GPS activities. We've created a comprehensive guide showing you how to download GPX files from the most popular platforms like Wikiloc, Strava, Garmin Connect, and many others.",
            viewGpxGuide: "📥 View Complete GPX Download Guide",
            gpxGuideTip: "💡 Quick Tip:",
            gpxGuideTipText: "The guide covers Wikiloc and Strava in detail, plus tips for other platforms like Garmin Connect, Apple Health, Google Fit, and more.",
            
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
            demoVideoSubtitle: "Examples of TrailReplay in action",
            demoCaption: "These demos highlight a single segment with detailed statistics and the comparison mode workflow recorded directly in TrailReplay.",
            videoNotSupported: "Your browser doesn't support video playback. You can download the example video instead.",
            segmentBuilderCaption: "Path export with detailed statistics and elevation data.",
            segmentBuilderDownload: "Download path export demo",
            exportFlowCaption: "Comparison mode showing two GPX files from the same timeframe.",
            exportFlowDownload: "Download comparison mode demo",
            instagramExamples: "Want to see more examples? Check out our Instagram for inspiration:",
            instagramLink: "Follow @trailreplay on Instagram",
            
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
        
        // GPX Download Guide
        gpxGuide: {
            link: "📥 GPX Download Guide",
            welcomeTitle: "How to Download GPX Files",
            welcomeSubtitle: "Complete guide to export your GPS tracks from popular platforms",
            welcomeDescription: "To create stunning trail animations with TrailReplay, you'll need GPX files from your GPS activities. This guide shows you how to download GPX files from the most popular platforms, starting with Wikiloc and Strava.",
            proTip: "💡 Pro Tip:",
            proTipText: "GPX files contain your GPS track data with coordinates, timestamps, and elevation information. They're the standard format for sharing GPS tracks between different applications.",
            
            // Wikiloc section
            wikilocTitle: "Wikiloc",
            wikilocSubtitle: "World's largest outdoor activity platform",
            wikilocDescription: "Wikiloc is one of the most popular platforms for outdoor activities, with millions of trails shared by the community. Here's how to download GPX files from your Wikiloc activities:",
            wikilocStep1Title: "Log into your Wikiloc account",
            wikilocStep1Desc: "Go to wikiloc.com and sign in with your username and password.",
            wikilocStep2Title: "Navigate to your activities",
            wikilocStep2Desc: "Click on your profile picture in the top right corner, then select \"My tracks\" from the dropdown menu.",
            wikilocStep3Title: "Select the activity you want to download",
            wikilocStep3Desc: "Find the activity you want to export and click on its title to open the detailed view.",
            wikilocStep4Title: "Download the GPX file",
            wikilocStep4Desc: "On the activity page, look for the \"Download\" button (usually in the top right area). Click it and select \"GPX\" format from the options.",
            wikilocStep5Title: "Save the file",
            wikilocStep5Desc: "The GPX file will download to your computer. You can now upload it to TrailReplay to create your animated trail video.",
            wikilocTipTitle: "💡 Wikiloc Tips:",
            wikilocTip1: "You can also download GPX files from other users' public trails",
            wikilocTip2: "Wikiloc offers both free and premium accounts with different download limits",
            wikilocTip3: "The GPX files include elevation data, which makes for great 3D animations",
            
            // Strava section
            stravaTitle: "Strava",
            stravaSubtitle: "Popular fitness tracking platform for athletes",
            stravaDescription: "Strava is widely used by runners, cyclists, and other athletes to track their activities. Here's how to export your GPX files from Strava:",
            stravaStep1Title: "Log into your Strava account",
            stravaStep1Desc: "Go to strava.com and sign in with your credentials.",
            stravaStep2Title: "Go to your activities",
            stravaStep2Desc: "Click on your profile picture in the top right, then select \"My Activities\" or go directly to your dashboard.",
            stravaStep3Title: "Select an activity",
            stravaStep3Desc: "Find the activity you want to export and click on it to open the detailed view.",
            stravaStep4Title: "Export the GPX file",
            stravaStep4Desc: "On the activity page, click the three dots (⋮) menu in the top right corner, then select \"Export Original\" or \"Export GPX\".",
            stravaStep5Title: "Download and save",
            stravaStep5Desc: "The GPX file will download to your computer. You can now use it with TrailReplay to create beautiful trail animations.",
            stravaExportInfo: "Strava offers two export options: \"Export GPX\" for a standard GPX file, and \"Export Original\" to get the exact file format you originally uploaded (which may be GPX, TCX, or FIT).",
            stravaTipTitle: "💡 Strava Tips:",
            stravaTip1: "Use \"Export GPX\" for a standard GPX file that works with TrailReplay",
            stravaTip2: "Use \"Export Original\" to get the exact file format you originally uploaded",
            stravaTip3: "Strava Premium members have access to more export options",
            stravaTip4: "You can also export activities from other users if they're public",
            
            // Other platforms section
            otherPlatformsTitle: "Other Popular Platforms",
            otherPlatformsSubtitle: "How to download GPX files from other fitness and outdoor platforms",
            garminTitle: "Garmin Connect",
            garminDesc: "Export activities from Garmin devices through the Connect web platform or mobile app.",
            appleHealthTitle: "Apple Health",
            appleHealthDesc: "Export workout data from Apple Health app, though GPX export requires third-party apps.",
            googleFitTitle: "Google Fit",
            googleFitDesc: "Export fitness data through Google Takeout, though GPX format may require conversion.",
            runkeeperTitle: "Runkeeper",
            runkeeperDesc: "Export activities as GPX files through the web interface or mobile app settings.",
            alltrailsTitle: "AllTrails",
            alltrailsDesc: "Download GPX files from trail maps and your recorded activities through the web platform.",
            polarTitle: "Polar Flow",
            polarDesc: "Export activities from Polar devices through the Flow web platform or mobile app.",
            generalTipTitle: "💡 General Tips for All Platforms:",
            generalTip1: "Most platforms require you to be logged in to download your own activities",
            generalTip2: "Look for \"Export\", \"Download\", or \"GPX\" options in activity menus",
            generalTip3: "Some platforms may require a premium subscription for GPX export",
            generalTip4: "Always check the platform's privacy settings before sharing activities",
            
            // File format section
            fileFormatTitle: "Understanding GPX Files",
            fileFormatSubtitle: "What's inside a GPX file and why it works with TrailReplay",
            whatIsGPXTitle: "What is a GPX file?",
            whatIsGPXDesc: "GPX (GPS Exchange Format) is an open standard for storing GPS track data. It's an XML file that contains:",
            gpxElement1: "<strong>Track points:</strong> Latitude, longitude, and elevation coordinates",
            gpxElement2: "<strong>Timestamps:</strong> When each point was recorded",
            gpxElement3: "<strong>Metadata:</strong> Activity name, description, and device information",
            gpxElement4: "<strong>Waypoints:</strong> Important locations along your route",
            trailreplayCompatibleTitle: "✅ TrailReplay Compatible:",
            trailreplayCompatibleDesc: "TrailReplay reads all standard GPX files and uses the track points to create smooth animations. The more track points, the smoother your animation will be!",
            fileQualityTitle: "Getting the Best Quality GPX Files",
            fileQualityDesc: "For the best TrailReplay experience, look for GPX files with:",
            qualityTip1: "<strong>High point density:</strong> More track points = smoother animations",
            qualityTip2: "<strong>Accurate timestamps:</strong> Helps TrailReplay create realistic timing",
            qualityTip3: "<strong>Elevation data:</strong> Enables 3D terrain visualization",
            qualityTip4: "<strong>Clean data:</strong> Fewer GPS errors and outliers",
            
            // Next steps section
            nextStepsTitle: "Ready to Create Your Trail Animation?",
            nextStepsSubtitle: "Now that you have your GPX files, it's time to bring them to life",
            nextStepsDesc: "Once you've downloaded your GPX files from your preferred platform, you're ready to create stunning trail animations with TrailReplay:",
            nextStep1Title: "Upload your GPX files",
            nextStep1Desc: "Go to TrailReplay and drag & drop your GPX files onto the upload area.",
            nextStep2Title: "Build your journey",
            nextStep2Desc: "Arrange your tracks in the Journey Builder and add transportation segments if needed.",
            nextStep3Title: "Customize your animation",
            nextStep3Desc: "Choose map styles, colors, and animation settings to match your story.",
            nextStep4Title: "Export your video",
            nextStep4Desc: "Create a beautiful video to share your adventure with friends and family.",
            needHelpTitle: "Need Help?",
            needHelpDesc: "Check out our complete tutorial and examples for detailed instructions on using TrailReplay's features.",
            backToApp: "← Back to TrailReplay App"
        },
        
        upload: {
            title: "Upload GPX Files & Pictures",
            description: "Add multiple GPX tracks and images to create your journey",
            button: "Choose Files",
            urlLabel: "Paste your URL:",
            loadFromUrl: "🔗 Open Download Page",
            urlPlaceholder: "https://www.strava.com/activities/123456 or https://www.wikiloc.com/trails/view/123456 or other platform URLs",
            stravaInstructions: "On Strava: Click 3 dots (⋯) next to activity title → Export GPX",
            wikilocInstructions: "On Wikiloc: Click 'File' tab → Download GPX",
            externalImport: "Import from External Sources",
            hideExternalImport: "Hide External Import",

            // Platform instruction cards
            platformInstructions: {
                strava: {
                    title: "Strava",
                    step1: "Paste activity URL:",
                    step2: "Click \"🔗 Open Download Page\"",
                    step3: "On Strava: Click 3 dots (⋯) next to activity title",
                    step4: "Select \"Export GPX\"",
                    step5: "Upload downloaded file",
                    tryIt: "Try it:",
                    exampleActivity: "UTMB 2021 Activity"
                },
                wikiloc: {
                    title: "Wikiloc",
                    step1: "Paste trail URL:",
                    step2: "Click \"🔗 Open Download Page\"",
                    step3: "On Wikiloc: Click \"File\" tab",
                    step4: "Click \"Download GPX\"",
                    step5: "Upload downloaded file",
                    otherExamples: "Other examples:",
                    santFeliuRace: "Sant Feliu Race",
                    anotherTrail: "Another trail"
                },
                otherPlatforms: {
                    title: "Other Platforms",
                    step1: "Paste any GPS platform URL",
                    step2: "Click \"🔗 Open Download Page\"",
                    step3: "Look for \"Export\" or \"Download GPX\" option",
                    step4: "Select GPX format if available",
                    step5: "Upload downloaded file",
                    supported: "Supported:",
                    supportedPlatforms: "Garmin, AllTrails, Komoot, Suunto, Polar, Coros, Endomondo, Nike, Adidas, Fitbit, Dropbox, Google Drive"
                }
            },

            // Status messages
            urlStatus: {
                exampleLoaded: "Example URL loaded!",
                platformDetected: "Platform detected:",
                clickToTest: "Click \"🔗 Open Download Page\" to test the functionality.",
                openingPage: "⏳ Opening...",
                openingText: "Opening...",
                pageOpened: "Page opened successfully!"
            }
        },
        


        landing: {
            hero: {
                title: 'Convert GPX Files to Stunning Animated Videos',
                description: 'Transform your GPX files into beautiful animated trail videos online. Free GPX to video converter perfect for runners, cyclists, and hikers. Create professional animated maps from your GPS tracks with 3D terrain, custom styles, and smooth animations - no software download required.'
            },
            features: {
                conversion: 'GPX to Video Conversion',
                maps: '3D Animated Maps',
                free: '100% Free'
            },
            cta: {
                start: 'Start Converting Your GPX Files',
                tutorial: 'View Tutorial & Examples',
                gpxGuide: '📥 GPX Download Guide'
            },
            benefits: {
                title: 'Why Choose Our GPX to Video Converter?',
                athletes: {
                    title: 'Perfect for Athletes',
                    description: 'Create stunning running videos, cycling videos, and hiking videos from your GPS tracks. Share your training routes and race experiences with beautiful animated visualizations.'
                },
                quality: {
                    title: 'Professional Quality',
                    description: 'Generate high-quality animated trail videos with 3D terrain, multiple map styles, and smooth camera movements. Perfect for social media, presentations, or personal memories.'
                },
                easy: {
                    title: 'Easy to Use',
                    description: 'Simply upload your GPX files and watch them transform into engaging videos. No technical knowledge required - our online GPX converter does all the work.'
                },

            },
            useCases: {
                title: 'Perfect for:',
                marathon: 'Marathon Training Videos',
                cycling: 'Cycling Route Visualization',
                hiking: 'Hiking Trail Documentation',
                race: 'Race Replay Videos',
                travel: 'Travel Route Stories',
                fitness: 'Fitness Progress Tracking'
            },
            howItWorks: {
                title: 'How It Works',
                step1: {
                    title: 'Upload GPX Files',
                    description: 'Upload your GPX files from your GPS watch, phone, or any source. Supports multiple tracks and image annotations.'
                },
                step2: {
                    title: 'Customize & Preview',
                    description: 'Choose map styles, adjust camera modes, add annotations, and preview your animated trail in real-time with 3D terrain.'
                },
                step3: {
                    title: 'Export & Share',
                    description: 'Export your animated trail as a high-quality video and share it on social media, with friends, or use it for presentations.'
                }
            }
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
            showMarker: "Show Marker",
            
            // Track 1 letters UI
            track1Letters: "Track Letters",
            showTrackLettersTitle: "Show letters on main track",

            // Control Section Headers
            markerSettings: "🎯 Marker Settings",
            cameraSettings: "🎬 Camera Settings",
            mapTerrainSettings: "🗺️ Map & Terrain",
            statsSettings: "📊 Stats Settings",
            
            // Stats Labels
                    distance: "Distance",
        elevation: "Elevation",
        avgSpeed: "Average Speed",
    showEndStats: "Show End Stats",
    showSegmentSpeeds: "Show Segment Speeds",
    showLiveElevation: "Show Live Elevation",
    speedAsPace: "Show pace (min/km)",
            
            // Comparison Mode
            comparisonSettings: "🏃‍♂️ Comparison Mode",
            enableComparison: "Enable Comparison",
            secondTrack: "Second Track",
            selectTrack: "Select GPX File",
            loadTrack: "Load Track",

            // Comparison Instructions
            comparisonInstructionsTitle: "How to use:",
            comparisonInstructionsStep1: "1. Load main GPX track",
            comparisonInstructionsStep2: "2. Select comparison GPX file",
            comparisonInstructionsStep3: "3. Customize names & colors below",

            // Comparison Tracks
            comparisonTracksTitle: "Tracks:",
            comparisonTracksTrack1: "• Track 1: Main track (color is customizable)",
            comparisonTracksTrack2: "• Track 2: Comparison track",

            // Comparison Customization
            comparisonNamesTitle: "Track Names",
            comparisonNamesTrack1Placeholder: "Track 1",
            comparisonNamesTrack2Placeholder: "Track 2",
            track2Name: "Track 2 Name",
            comparisonColorTitle: "Track 2 Color",
            comparisonColorReset: "Reset",
            
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
            language: "Language",
            cameraMode: "Camera Mode",
            cameraStandard: "🎥 Manual Mode",
            cameraFollowBehind: "🎬 Follow Behind",
            followBehindZoom: "Follow Distance",
            followBehindVeryClose: "🔍 Very Close",
            followBehindMedium: "📍 Medium",
            followBehindFar: "🌍 Far",
            cancelIconChange: "Cancel Icon Change"

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
            averageSpeed: "Average Speed",
            averagePace: "Average Pace",
            maxElevation: "Max Elevation",
            minElevation: "Min Elevation",
            speed: "Avg Speed",
            currentDistance: "Distance",
            currentElevation: "Elevation",
            currentSpeed: "Speed",
            segmentSpeeds: "Segment Speeds",
            segmentSpeedsUnavailable: "Segment speed data unavailable.",
            segmentLabel: "Segment",
            overallSegment: "Overall Speed",
            speedPerKm: "Speed per km",
            kilometerLabel: "Km {index}",
            segmentActivities: {
                running: "Running",
                cycling: "Cycling",
                swimming: "Swimming",
                hiking: "Hiking",
                walking: "Walking",
                driving: "Driving",
                default: "Activity"
            }
        },
        
        messages: {
            fileLoaded: "GPX file loaded successfully!",
            fileError: "Error loading GPX file. Please try again.",
            noTrackPoints: "No track points found in GPX file.",
            exportStarted: "Starting video export...",
            exportComplete: "Video export complete!",
            annotationAdded: "Trail annotation added",
            pictureAnnotationAdded: "Picture annotation added",
            iconChangeAdded: "Icon change added",
            clickMapToAnnotate: "Click on the map to add an annotation",
            clickMapForIconChange: "Click on the map to add an icon change",
            noTrackForExport: "No track loaded. Please load a GPX file before exporting.",
            mediaDeviceNotSupported: "Video recording is not supported by your browser.",
            mapNotReady: "Map is not ready for video export.",
            exportVideoPrepare: "Preparing video export. Please wait...",
            exportVideoRecording: "Recording animation... Please wait until complete.",
            exportError: "Error during video export",
            urlProcessingError: "Could not process URL",
            validUrlsFrom: "Please make sure you're using a valid URL from:",

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
            gpxOnlyStatsDisabled: "All distances included in stats",
            iconChangeMoved: "Icon change marker moved!",
            annotationMoved: "Annotation marker moved!"
        },
        
        journey: {
            title: "Journey Builder",
            tracks: "Uploaded Tracks & Images",
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
            techStack: "Built with MapLibre GL JS, Three.js, Elevation Data, and many amazing open source projects.",
            acknowledgments: "See all acknowledgments",
            github: "View on GitHub",
            instagram: "Follow on Instagram",
            coffee: "Buy me a coffee"
        },
        
        // Feedback
        feedback: {
            link: "Feedback",
            title: "Send Feedback",
            name: "Your name",
            email: "Email (optional)",
            message: "Your message",
            send: "Send",
            sending: "Sending...",
            success: "Thanks for your feedback!",
            error: "Something went wrong. Please try again later.",
            validation: {
                messageShort: "Message too short"
            },
            solicitation: {
                title: "Enjoying TrailReplay?",
                message: "Would you mind giving us some feedback on how to improve it further?",
                yes: "Yes, I'd love to help!",
                no: "Maybe later",
                dontShowAgain: "Don't show this again"
            }
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
            clickToUploadAdditionalGPXFiles: "Click to upload additional GPX files & images",
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
        },
        
        // Video Export
        videoExport: {
            title: "Video Export",
            exportHelp: "Export Help",
            autoWebM: "Auto Recording (WebM)",
            autoMP4: "Auto Recording (MP4)",
            manualMode: "Manual Screen Recording",
            webMDescription: "Automatic recording with overlays rendered on canvas. Works on all browsers.",
            mp4Description: "Advanced client-side MP4 generation with canvas rendering. Optimized for quality and compatibility. Auto-detects best codec and settings for your device.",
            manualDescription: "Best quality with all statistics and overlays. Use your system's screen recorder to capture the highlighted area while the animation plays.",
            gameBarRecord: "Game Bar → Record",
            recordSelectedPortion: "Record Selected Portion",
            videoRatio: "Video Ratio",
            landscape: "16:9 Landscape",
            square: "1:1 Square", 
            mobile: "9:16 Mobile",
            autoWebMShort: "Auto (WebM)",
            autoMP4Short: "Auto (MP4)",
            manualModeShort: "Manual Mode",
            
            // Messages
            exportInProgress: "Video Export In Progress",
            initializing: "Initializing...",
            keepTabActive: "Keep this browser tab active",
            closeOtherApps: "Close other applications for best performance",
            doNotResizeWindow: "Do not resize or minimize this window",
            letComplete: "Let the export complete without interruption",
            cancelExport: "Cancel Export",
            exportCancelled: "Video export cancelled by user",
            noTrackData: "No track data available for export",
            browserNotSupported: "Media recording not supported in this browser",
            mapNotReady: "Map not ready for export",
            exportError: "Export error: {error}",
            mp4NotSupported: "MP4 not directly supported, using WebM format instead",
            mp4ExportFailed: "MP4 export failed: {error}",
            exportComplete: "Export complete!",
            mp4ExportSuccess: "MP4 video exported successfully: {filename} ({size})",
            downloadFailed: "Failed to download MP4 file",
            manualRecordingActive: "🎥 Manual recording active - Press Escape or Reset to exit anytime",
            manualRecordingFailed: "Manual recording setup failed: {error}",
            cannotResizeWindow: "Cannot resize window during video export",
            warningBeforeClose: "Video export in progress. Are you sure you want to leave?",
            keepWindowVisible: "Keep this window visible for best video export quality",
            
            // Confirmation dialog
            beforeExporting: "Before exporting",
            ensurePerformance: "Ensure good system performance", 
            closeUnnecessaryApps: "Close unnecessary applications",
            keepTabActiveDuringExport: "Keep this browser tab active during export",
            doNotResizeWindowConfirm: "Do not resize or minimize this window during export",
            cancel: "Cancel",
            startExport: "Start Export",
            
            // Manual recording dialog
            manualRecordingInstructions: "Manual Recording Instructions",
            howToRecord: "How to record",
            highlightOrange: "The recording area will be highlighted in orange",
            useSystemRecorder: "Use your system's screen recorder to capture the highlighted area",
            animationAutoStart: "Animation will start automatically with all statistics visible",
            recordUntilComplete: "Record until the animation completes",
            escapeToExit: "Press Escape or Reset to exit recording mode anytime",
            screenRecordingShortcuts: "Screen recording shortcuts",
            useFullscreen: "Use fullscreen mode for best quality",
            ensureGoodPerformance: "Ensure good system performance",
            startPreparation: "Start Preparation",
            manualRecordingExited: "Manual recording mode exited"
        },
        acknowledgments: {
            title: "Acknowledgments",
            intro: "TrailReplay is proudly built on the shoulders of open source giants. We thank the following projects and communities:",
            maplibre: "Open-source JavaScript library for interactive maps and 3D visualization in the browser. Powers all the map rendering and animation in TrailReplay.",
            osm: "Collaborative project to create a free, editable map of the world. Provides the base map data for TrailReplay.",
            opentopo: "Open, topographic map tiles based on OSM data. Used for terrain and outdoor visualization.",
            ors: "Open-source routing engine and API based on OSM. Used for calculating routes between points.",
            turf: "Advanced geospatial analysis for JavaScript. Used for distance, geometry, and spatial calculations.",
            langBtn: "Español",
            back: "← Back to TrailReplay"
        }
        ,
        legal: {
            privacy: {
                title: "Privacy Policy",
                updated: "Last updated: 2025-01-01",
                intro: "TrailReplay processes GPX files entirely in your browser. Files are not uploaded to any server unless explicitly stated. Strava connection is optional and only used to import your own activities when you authorize it.",
                data1: "GPX files: processed locally in your browser; not uploaded by default.",
                data2: "Strava data: when you connect, we request read access to your activities to import routes. Tokens are stored in your browser and can be revoked at any time by logging out or via Strava settings.",
                data3: "Feedback messages: if you submit feedback, we process the message content and optional email to respond.",
                thirdPartiesTitle: "Third Parties",
                third1: "Strava: used for OAuth and activity data import according to your consent.",
                third2: "Resend: used to send feedback emails.",
                choicesTitle: "Your Choices",
                choice1: "You can disconnect Strava at any time within the app (Logout) or in your Strava account settings.",
                choice2: "You can submit feedback without providing an email; if provided, it’s used only to reply."
            },
            terms: {
                title: "Terms of Use",
                updated: "Last updated: 2025-01-01",
                useTitle: "Use of Service",
                useDesc: "TrailReplay lets you visualize GPX data and create animations. You must own or have rights to any data you import. The service is provided \"as is\", without warranties.",
                stravaTitle: "Strava Integration",
                stravaDesc: "By connecting your Strava account you grant read access to your activities to import GPS data. We do not modify your Strava content. You can revoke access at any time.",
                privacyTitle: "Privacy",
                privacyDesc: "See our Privacy Policy for details about what data we process."
            }
        },
        privacy: {
            cookieTitle: "We use analytics to improve your experience",
            cookieMessage: "We use Google Analytics to understand how you use TrailReplay and improve the app. No personal data is collected.",
            accept: "Accept",
            decline: "Decline",
            learnMore: "Learn More",
            privacyTitle: "Privacy & Analytics",
            whatWeCollect: "What we collect",
            collect1: "How you use TrailReplay features (play, pause, export, etc.)",
            collect2: "General usage patterns and popular features",
            collect3: "Technical information like browser type and screen size",
            whatWeDontCollect: "What we DON'T collect",
            dontCollect1: "Your GPS tracks or personal location data",
            dontCollect2: "Personal information like names or emails",
            dontCollect3: "Any data that could identify you personally",
            whyWeCollect: "Why we collect this data",
            whyCollectText: "We use this information to understand which features are most useful and improve TrailReplay for everyone.",
            yourChoice: "Your choice",
            yourChoiceText: "You can decline analytics and TrailReplay will work exactly the same. You can change your mind anytime in the settings.",
            acceptAnalytics: "Accept Analytics",
            declineAnalytics: "Decline Analytics"
        }
    },
    es: {
        controls: {
            pathColor: "Color de la ruta:",
            track1Letters: "Letras de la ruta",
            showTrackLettersTitle: "Mostrar letras en la ruta principal",
            comparisonSettings: "🏃‍♂️ Modo de comparación",
            enableComparison: "Activar comparación",
            comparisonInstructionsTitle: "Cómo usar:",
            comparisonInstructionsStep1: "1. Carga la ruta GPX principal",
            comparisonInstructionsStep2: "2. Selecciona el archivo GPX de comparación",
            comparisonInstructionsStep3: "3. Personaliza nombres y colores abajo",
            comparisonTracksTitle: "Rutas:",
            comparisonTracksTrack1: "• Ruta 1: Ruta principal (color personalizable)",
            comparisonTracksTrack2: "• Ruta 2: Ruta de comparación",
            secondTrack: "Segunda ruta",
            selectTrack: "Seleccionar archivo GPX",
            track2Name: "Nombre de la ruta 2",
            comparisonColorTitle: "Color de la ruta 2",
            comparisonColorReset: "Restablecer",
            comparisonNamesTrack1Placeholder: "Ruta 1",
            comparisonNamesTrack2Placeholder: "Ruta 2"
        },
        subtitle: "Revive la historia que contaron tus senderos",
        support: "Apoyar",
        acknowledgments: {
            title: "Agradecimientos",
            intro: "TrailReplay está orgullosamente construido sobre los hombros de gigantes del software libre. Agradecemos a los siguientes proyectos y comunidades:",
            maplibre: "Biblioteca JavaScript de código abierto para mapas interactivos y visualización 3D en el navegador. Potencia todo el renderizado y animación de mapas en TrailReplay.",
            osm: "Proyecto colaborativo para crear un mapa libre y editable del mundo. Proporciona los datos base de mapas para TrailReplay.",
            opentopo: "Teselas topográficas abiertas basadas en datos de OSM. Usadas para visualización de terreno y actividades al aire libre.",
            ors: "Motor y API de rutas de código abierto basado en OSM. Usado para calcular rutas entre puntos.",
            turf: "Análisis geoespacial avanzado para JavaScript. Usado para cálculos de distancia, geometría y operaciones espaciales.",
            langBtn: "English",
            back: "← Volver a TrailReplay"
        },
        
        // Tutorial and examples
        tutorial: {
            link: "📚 Tutorial y Ejemplos",
            title: "Tutorial Completo y Guía de Funciones",
            welcomeTitle: "Bienvenido a TrailReplay",
            welcomeSubtitle: "Transforma los datos de tus rutas GPX en hermosas animaciones 3D interactivas",
            welcomeDescription: "TrailReplay es una aplicación web potente pero simple que convierte los datos GPS de tus rutas en historias visuales impresionantes. Ya seas corredor, ciclista, senderista o atleta multideporte, TrailReplay te ayuda a revivir y compartir tus aventuras al aire libre a través de mapas animados, estadísticas detalladas y videos exportables.",
            proTip: "💡 Consejo Profesional:",
            proTipText: "¡TrailReplay funciona completamente en tu navegador - no se suben datos a servidores, garantizando tu privacidad y permitiendo uso offline!",
            
            // GPX Download Guide section
            gpxDownloadTitle: "Cómo Descargar Archivos GPX",
            gpxDownloadSubtitle: "Guía completa para exportar tus tracks GPS desde plataformas populares",
            gpxDownloadDescription: "Antes de poder crear animaciones de senderos, necesitarás archivos GPX de tus actividades GPS. Hemos creado una guía completa que te muestra cómo descargar archivos GPX desde las plataformas más populares como Wikiloc, Strava, Garmin Connect y muchas otras.",
            viewGpxGuide: "📥 Ver Guía Completa de Descarga GPX",
            gpxGuideTip: "💡 Consejo Rápido:",
            gpxGuideTipText: "La guía cubre Wikiloc y Strava en detalle, además de consejos para otras plataformas como Garmin Connect, Apple Health, Google Fit y más.",
            
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
            demoVideoSubtitle: "Ejemplos de TrailReplay en acción",
            demoCaption: "Estas demostraciones destacan un segmento individual con estadísticas detalladas y el flujo de modo de comparación grabados directamente en TrailReplay.",
            videoNotSupported: "Tu navegador no soporta reproducción de video. Puedes descargar el video de ejemplo en su lugar.",
            segmentBuilderCaption: "Exportación de ruta con estadísticas detalladas y datos de elevación.",
            segmentBuilderDownload: "Descargar demo de exportación de ruta",
            exportFlowCaption: "Modo de comparación mostrando dos archivos GPX del mismo período de tiempo.",
            exportFlowDownload: "Descargar demo del modo de comparación",
            instagramExamples: "¿Quieres ver más ejemplos? Echa un vistazo a nuestro Instagram para inspiración:",
            instagramLink: "Sigue a @trailreplay en Instagram",
            
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
        
        // GPX Download Guide
        gpxGuide: {
            link: "📥 Guía de Descarga GPX",
            welcomeTitle: "Cómo Descargar Archivos GPX",
            welcomeSubtitle: "Guía completa para exportar tus tracks GPS desde plataformas populares",
            welcomeDescription: "Para crear impresionantes animaciones de senderos con TrailReplay, necesitarás archivos GPX de tus actividades GPS. Esta guía te muestra cómo descargar archivos GPX desde las plataformas más populares, comenzando con Wikiloc y Strava.",
            proTip: "💡 Consejo Profesional:",
            proTipText: "Los archivos GPX contienen los datos de tu track GPS con coordenadas, marcas de tiempo e información de elevación. Son el formato estándar para compartir tracks GPS entre diferentes aplicaciones.",
            
            // Wikiloc section
            wikilocTitle: "Wikiloc",
            wikilocSubtitle: "La plataforma de actividades al aire libre más grande del mundo",
            wikilocDescription: "Wikiloc es una de las plataformas más populares para actividades al aire libre, con millones de senderos compartidos por la comunidad. Aquí te explicamos cómo descargar archivos GPX de tus actividades en Wikiloc:",
            wikilocStep1Title: "Inicia sesión en tu cuenta de Wikiloc",
            wikilocStep1Desc: "Ve a wikiloc.com e inicia sesión con tu nombre de usuario y contraseña.",
            wikilocStep2Title: "Navega a tus actividades",
            wikilocStep2Desc: "Haz clic en tu foto de perfil en la esquina superior derecha, luego selecciona \"Mis tracks\" del menú desplegable.",
            wikilocStep3Title: "Selecciona la actividad que quieres descargar",
            wikilocStep3Desc: "Encuentra la actividad que quieres exportar y haz clic en su título para abrir la vista detallada.",
            wikilocStep4Title: "Descarga el archivo GPX",
            wikilocStep4Desc: "En la página de la actividad, busca el botón \"Descargar\" (generalmente en el área superior derecha). Haz clic en él y selecciona el formato \"GPX\" de las opciones.",
            wikilocStep5Title: "Guarda el archivo",
            wikilocStep5Desc: "El archivo GPX se descargará a tu computadora. Ahora puedes subirlo a TrailReplay para crear tu video de sendero animado.",
            wikilocTipTitle: "💡 Consejos de Wikiloc:",
            wikilocTip1: "También puedes descargar archivos GPX de senderos públicos de otros usuarios",
            wikilocTip2: "Wikiloc ofrece cuentas gratuitas y premium con diferentes límites de descarga",
            wikilocTip3: "Los archivos GPX incluyen datos de elevación, lo que hace que las animaciones 3D sean excelentes",
            
            // Strava section
            stravaTitle: "Strava",
            stravaSubtitle: "Plataforma popular de seguimiento de fitness para atletas",
            stravaDescription: "Strava es ampliamente utilizada por corredores, ciclistas y otros atletas para rastrear sus actividades. Aquí te explicamos cómo exportar tus archivos GPX desde Strava:",
            stravaStep1Title: "Inicia sesión en tu cuenta de Strava",
            stravaStep1Desc: "Ve a strava.com e inicia sesión con tus credenciales.",
            stravaStep2Title: "Ve a tus actividades",
            stravaStep2Desc: "Haz clic en tu foto de perfil en la esquina superior derecha, luego selecciona \"Mis Actividades\" o ve directamente a tu panel.",
            stravaStep3Title: "Selecciona una actividad",
            stravaStep3Desc: "Encuentra la actividad que quieres exportar y haz clic en ella para abrir la vista detallada.",
            stravaStep4Title: "Exporta el archivo GPX",
            stravaStep4Desc: "En la página de la actividad, haz clic en el menú de tres puntos (⋮) en la esquina superior derecha, luego selecciona \"Exportar Original\" o \"Exportar GPX\".",
            stravaStep5Title: "Descarga y guarda",
            stravaStep5Desc: "El archivo GPX se descargará a tu computadora. Ahora puedes usarlo con TrailReplay para crear hermosas animaciones de senderos.",
            stravaExportInfo: "Strava ofrece dos opciones de exportación: \"Exportar GPX\" para un archivo GPX estándar, y \"Exportar Original\" para obtener el formato de archivo exacto que subiste originalmente (que puede ser GPX, TCX o FIT).",
            stravaTipTitle: "💡 Consejos de Strava:",
            stravaTip1: "Usa \"Exportar GPX\" para un archivo GPX estándar que funciona con TrailReplay",
            stravaTip2: "Usa \"Exportar Original\" para obtener el formato de archivo exacto que subiste originalmente",
            stravaTip3: "Los miembros Premium de Strava tienen acceso a más opciones de exportación",
            stravaTip4: "También puedes exportar actividades de otros usuarios si son públicas",
            
            // Other platforms section
            otherPlatformsTitle: "Otras Plataformas Populares",
            otherPlatformsSubtitle: "Cómo descargar archivos GPX desde otras plataformas de fitness y actividades al aire libre",
            garminTitle: "Garmin Connect",
            garminDesc: "Exporta actividades desde dispositivos Garmin a través de la plataforma web Connect o la aplicación móvil.",
            appleHealthTitle: "Apple Health",
            appleHealthDesc: "Exporta datos de entrenamiento desde la aplicación Apple Health, aunque la exportación GPX requiere aplicaciones de terceros.",
            googleFitTitle: "Google Fit",
            googleFitDesc: "Exporta datos de fitness a través de Google Takeout, aunque el formato GPX puede requerir conversión.",
            runkeeperTitle: "Runkeeper",
            runkeeperDesc: "Exporta actividades como archivos GPX a través de la interfaz web o configuraciones de la aplicación móvil.",
            alltrailsTitle: "AllTrails",
            alltrailsDesc: "Descarga archivos GPX desde mapas de senderos y tus actividades grabadas a través de la plataforma web.",
            polarTitle: "Polar Flow",
            polarDesc: "Exporta actividades desde dispositivos Polar a través de la plataforma web Flow o la aplicación móvil.",
            generalTipTitle: "💡 Consejos Generales para Todas las Plataformas:",
            generalTip1: "La mayoría de las plataformas requieren que inicies sesión para descargar tus propias actividades",
            generalTip2: "Busca opciones \"Exportar\", \"Descargar\" o \"GPX\" en los menús de actividades",
            generalTip3: "Algunas plataformas pueden requerir una suscripción premium para la exportación GPX",
            generalTip4: "Siempre verifica la configuración de privacidad de la plataforma antes de compartir actividades",
            
            // File format section
            fileFormatTitle: "Entendiendo los Archivos GPX",
            fileFormatSubtitle: "Qué hay dentro de un archivo GPX y por qué funciona con TrailReplay",
            whatIsGPXTitle: "¿Qué es un archivo GPX?",
            whatIsGPXDesc: "GPX (GPS Exchange Format) es un estándar abierto para almacenar datos de tracks GPS. Es un archivo XML que contiene:",
            gpxElement1: "<strong>Puntos de track:</strong> Coordenadas de latitud, longitud y elevación",
            gpxElement2: "<strong>Marcas de tiempo:</strong> Cuándo se grabó cada punto",
            gpxElement3: "<strong>Metadatos:</strong> Nombre de la actividad, descripción e información del dispositivo",
            gpxElement4: "<strong>Waypoints:</strong> Ubicaciones importantes a lo largo de tu ruta",
            trailreplayCompatibleTitle: "✅ Compatible con TrailReplay:",
            trailreplayCompatibleDesc: "TrailReplay lee todos los archivos GPX estándar y usa los puntos de track para crear animaciones suaves. ¡Cuántos más puntos de track, más suave será tu animación!",
            fileQualityTitle: "Obteniendo los Mejores Archivos GPX de Calidad",
            fileQualityDesc: "Para la mejor experiencia con TrailReplay, busca archivos GPX con:",
            qualityTip1: "<strong>Alta densidad de puntos:</strong> Más puntos de track = animaciones más suaves",
            qualityTip2: "<strong>Marcas de tiempo precisas:</strong> Ayuda a TrailReplay a crear tiempos realistas",
            qualityTip3: "<strong>Datos de elevación:</strong> Permite la visualización de terreno 3D",
            qualityTip4: "<strong>Datos limpios:</strong> Menos errores GPS y valores atípicos",
            
            // Next steps section
            nextStepsTitle: "¿Listo para Crear tu Animación de Sendero?",
            nextStepsSubtitle: "Ahora que tienes tus archivos GPX, es hora de darles vida",
            nextStepsDesc: "Una vez que hayas descargado tus archivos GPX desde tu plataforma preferida, estás listo para crear impresionantes animaciones de senderos con TrailReplay:",
            nextStep1Title: "Sube tus archivos GPX",
            nextStep1Desc: "Ve a TrailReplay y arrastra y suelta tus archivos GPX en el área de carga.",
            nextStep2Title: "Construye tu viaje",
            nextStep2Desc: "Organiza tus tracks en el Constructor de Viajes y añade segmentos de transporte si es necesario.",
            nextStep3Title: "Personaliza tu animación",
            nextStep3Desc: "Elige estilos de mapa, colores y configuraciones de animación para que coincidan con tu historia.",
            nextStep4Title: "Exporta tu video",
            nextStep4Desc: "Crea un hermoso video para compartir tu aventura con amigos y familia.",
            needHelpTitle: "¿Necesitas Ayuda?",
            needHelpDesc: "Consulta nuestro tutorial completo y ejemplos para instrucciones detalladas sobre cómo usar las funciones de TrailReplay.",
            backToApp: "← Volver a la App TrailReplay"
        },
        
        upload: {
            title: "Subir Archivos GPX y Fotos",
            description: "Añade múltiples rutas GPX e imágenes para crear tu viaje",
            button: "Elegir Archivos",
            urlLabel: "Pega tu URL:",
            loadFromUrl: "🔗 Abrir Página de Descarga",
            urlPlaceholder: "https://www.strava.com/activities/123456 o https://www.wikiloc.com/trails/view/123456 u otras plataformas",
            stravaInstructions: "En Strava: Haz clic en 3 puntos (⋯) junto al título de la actividad → Exportar GPX",
            wikilocInstructions: "En Wikiloc: Haz clic en la pestaña 'Archivo' → Descargar GPX",
            externalImport: "Importar desde Fuentes Externas",
            hideExternalImport: "Ocultar Importación Externa",

            // Platform instruction cards
            platformInstructions: {
                strava: {
                    title: "Strava",
                    step1: "Pega la URL de la actividad:",
                    step2: "Haz clic en \"🔗 Abrir Página de Descarga\"",
                    step3: "En Strava: Haz clic en 3 puntos (⋯) junto al título de la actividad",
                    step4: "Selecciona \"Exportar GPX\"",
                    step5: "Sube el archivo descargado",
                    tryIt: "Prueba:",
                    exampleActivity: "Actividad UTMB 2021"
                },
                wikiloc: {
                    title: "Wikiloc",
                    step1: "Pega la URL del sendero:",
                    step2: "Haz clic en \"🔗 Abrir Página de Descarga\"",
                    step3: "En Wikiloc: Haz clic en la pestaña \"Archivo\"",
                    step4: "Haz clic en \"Descargar GPX\"",
                    step5: "Sube el archivo descargado",
                    otherExamples: "Otros ejemplos:",
                    santFeliuRace: "Carrera Sant Feliu",
                    anotherTrail: "Otro sendero"
                },
                otherPlatforms: {
                    title: "Otras Plataformas",
                    step1: "Pega cualquier URL de plataforma GPS",
                    step2: "Haz clic en \"🔗 Abrir Página de Descarga\"",
                    step3: "Busca la opción \"Exportar\" o \"Descargar GPX\"",
                    step4: "Selecciona formato GPX si está disponible",
                    step5: "Sube el archivo descargado",
                    supported: "Compatibles:",
                    supportedPlatforms: "Garmin, AllTrails, Komoot, Suunto, Polar, Coros, Endomondo, Nike, Adidas, Fitbit, Dropbox, Google Drive"
                }
            },

            // Status messages
            urlStatus: {
                exampleLoaded: "¡URL de ejemplo cargada!",
                platformDetected: "Plataforma detectada:",
                clickToTest: "Haz clic en \"🔗 Abrir Página de Descarga\" para probar la funcionalidad.",
                openingPage: "⏳ Abriendo...",
                openingText: "Abriendo...",
                pageOpened: "¡Página abierta exitosamente!"
            }
        },
        


        landing: {
            hero: {
                title: 'Convierte Archivos GPX en Videos Animados Impresionantes',
                description: 'Transforma tus archivos GPX en hermosos videos de senderos animados en línea. Conversor gratuito de GPX a video perfecto para corredores, ciclistas y excursionistas. Crea mapas animados profesionales de tus tracks GPS con terreno 3D, estilos personalizados y animaciones fluidas - no requiere descarga de software.'
            },
            features: {
                conversion: 'Conversión GPX a Video',
                maps: 'Mapas Animados 3D',
                free: '100% Gratuito'
            },
            cta: {
                start: 'Comienza a Convertir tus Archivos GPX',
                tutorial: 'Ver Tutorial y Ejemplos',
                gpxGuide: '📥 Guía de Descarga GPX'
            },
            benefits: {
                title: '¿Por Qué Elegir Nuestro Conversor de GPX a Video?',
                athletes: {
                    title: 'Perfecto para Atletas',
                    description: 'Crea increíbles videos de running, videos de ciclismo y videos de senderismo desde tus tracks GPS. Comparte tus rutas de entrenamiento y experiencias de carreras con hermosas visualizaciones animadas.'
                },
                quality: {
                    title: 'Calidad Profesional',
                    description: 'Genera videos de senderos animados de alta calidad con terreno 3D, múltiples estilos de mapa y movimientos de cámara suaves. Perfecto para redes sociales, presentaciones o recuerdos personales.'
                },
                easy: {
                    title: 'Fácil de Usar',
                    description: 'Simplemente sube tus archivos GPX y míralos transformarse en videos atractivos. No se requiere conocimiento técnico - nuestro conversor GPX en línea hace todo el trabajo.'
                },

            },
            useCases: {
                title: 'Perfecto para:',
                marathon: 'Videos de Entrenamiento de Maratón',
                cycling: 'Visualización de Rutas de Ciclismo',
                hiking: 'Documentación de Senderos',
                race: 'Videos de Repetición de Carreras',
                travel: 'Historias de Rutas de Viaje',
                fitness: 'Seguimiento de Progreso Fitness'
            },
            howItWorks: {
                title: 'Cómo Funciona',
                step1: {
                    title: 'Sube Archivos GPX',
                    description: 'Sube tus archivos GPX desde tu reloj GPS, teléfono, o cualquier fuente. Soporta múltiples tracks y anotaciones de imágenes.'
                },
                step2: {
                    title: 'Personaliza y Previsualiza',
                    description: 'Elige estilos de mapa, ajusta modos de cámara, añade anotaciones, y previsualiza tu sendero animado en tiempo real con terreno 3D.'
                },
                step3: {
                    title: 'Exporta y Comparte',
                    description: 'Exporta tu sendero animado como un video de alta calidad y compártelo en redes sociales, con amigos, o úsalo para presentaciones.'
                }
            }
        },
        
        controls: {
            activity: "Tipo de Actividad:",
            terrain: "Estilo de Terreno:",
            totalTime: "Tiempo Total:",
            pathColor: "Color del Sendero",
            showMarker: "Mostrar Marcador",
            markerSize: "Tamaño del Marcador",
            currentIcon: "Icono Actual",
            changeIcon: "Cambiar",
            autoFollow: "Seguimiento Automático",
            showCircle: "Mostrar Círculo",
            
            // UI de letras de ruta 1
            track1Letters: "Letras de la ruta",
            showTrackLettersTitle: "Mostrar letras en la ruta principal",
            
            // Stats Labels
                    distance: "Distancia",
        elevation: "Elevación",
    showEndStats: "Mostrar Estadísticas Finales",
    showSegmentSpeeds: "Mostrar velocidades por segmento",
            showLiveElevation: "Mostrar altitud en vivo",
    speedAsPace: "Mostrar ritmo (min/km)",
            
            // Comparison Mode
            comparisonSettings: "🏃‍♂️ Modo Comparación",
            enableComparison: "Habilitar Comparación",
            secondTrack: "Segunda Ruta",
            selectTrack: "Seleccionar Archivo GPX",
            loadTrack: "Cargar Ruta",

            // Comparison Instructions
            comparisonInstructionsTitle: "Cómo usar:",
            comparisonInstructionsStep1: "1. Cargar ruta GPX principal",
            comparisonInstructionsStep2: "2. Seleccionar archivo GPX de comparación",
            comparisonInstructionsStep3: "3. Personalizar nombres y colores abajo",

            // Comparison Tracks
            comparisonTracksTitle: "Rutas:",
            comparisonTracksTrack1: "• Ruta 1: Ruta principal (color personalizable)",
            comparisonTracksTrack2: "• Ruta 2: Ruta de comparación",

            // Comparison Customization
            comparisonNamesTitle: "Nombres de Rutas",
            comparisonNamesTrack1Placeholder: "Ruta 1",
            comparisonNamesTrack2Placeholder: "Ruta 2",
            track2Name: "Nombre de la ruta 2",
            comparisonColorTitle: "Color de Ruta 2",
            comparisonColorReset: "Restablecer",

            // Control Section Headers
            markerSettings: "🎯 Configuración del Marcador",
            cameraSettings: "🎬 Configuración de la Cámara",
            mapTerrainSettings: "🗺️ Mapa y Terreno",
            statsSettings: "📊 Configuración de Estadísticas",
            
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
            language: "Idioma",
            cameraMode: "Modo de Cámara",
            cameraStandard: "🎥 Modo Manual",
            cameraFollowBehind: "🎬 Seguir Detrás",
            followBehindZoom: "Distancia de Seguimiento",
            followBehindVeryClose: "🔍 Muy Cerca",
            followBehindMedium: "📍 Medio",
            followBehindFar: "🌍 Lejos",
            cancelIconChange: "Cancelar Cambio de Icono"
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
            averageSpeed: "Velocidad Promedio",
            averagePace: "Ritmo Promedio",
            maxElevation: "Elevación Máxima",
            minElevation: "Elevación Mínima",
            speed: "Velocidad Promedio",
            currentDistance: "Distancia",
            currentElevation: "Elevación",
            currentSpeed: "Velocidad",
            segmentSpeeds: "Velocidades por segmento",
            segmentSpeedsUnavailable: "No hay datos de velocidad por segmento.",
            segmentLabel: "Segmento",
            overallSegment: "Velocidad general",
            speedPerKm: "Velocidad por km",
            kilometerLabel: "Km {index}",
            segmentActivities: {
                running: "Carrera",
                cycling: "Ciclismo",
                swimming: "Natación",
                hiking: "Senderismo",
                walking: "Caminata",
                driving: "Conducción",
                default: "Actividad"
            }
        },
        
        messages: {
            fileLoaded: "¡Archivo GPX cargado exitosamente!",
            fileError: "Error al cargar el archivo GPX. Por favor intenta de nuevo.",
            noTrackPoints: "No se encontraron puntos de ruta en el archivo GPX.",
            exportStarted: "Iniciando exportación de video...",
            exportComplete: "¡Exportación de video completada!",
            annotationAdded: "Anotación del sendero añadida",
            pictureAnnotationAdded: "Anotación de imagen añadida",
            iconChangeAdded: "Cambio de icono añadido",
            clickMapToAnnotate: "Haz clic en el mapa para añadir una anotación",
            clickMapForIconChange: "Haz clic en el mapa para añadir un cambio de icono",
            noTrackForExport: "No hay ninguna ruta cargada. Carga un archivo GPX antes de exportar.",
            mediaDeviceNotSupported: "La grabación de video no es compatible con tu navegador.",
            mapNotReady: "El mapa no está listo para exportar el video.",
            exportVideoPrepare: "Preparando la exportación del video. Por favor espera...",
            exportVideoRecording: "Grabando animación... Por favor espera hasta que termine.",
            exportError: "Error durante la exportación del video",
            urlProcessingError: "No se pudo procesar la URL",
            validUrlsFrom: "Asegúrate de que estés usando una URL válida de:",

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
            gpxOnlyStatsDisabled: "Todas las distancias incluidas en estadísticas",
            iconChangeMoved: "¡Marcador de cambio de icono movido!",
            annotationMoved: "¡Marcador de nota movido!"
        },
        
        journey: {
            title: "Constructor de Viajes",
            tracks: "Rutas e Imágenes Subidas",
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
            copyright: "TrailReplay - Narración de rutas de código abierto",
            techStack: "Construido con MapLibre GL JS, Three.js, datos de elevación y muchos proyectos open source increíbles.",
            acknowledgments: "Ver todos los agradecimientos",
            github: "Ver en GitHub",
            instagram: "Seguir en Instagram",
            coffee: "Invítame a un café"
        },
        
        // Feedback
        feedback: {
            link: "Comentarios",
            title: "Enviar Comentarios",
            name: "Tu nombre",
            email: "Email (opcional)",
            message: "Tu mensaje",
            send: "Enviar",
            sending: "Enviando...",
            success: "¡Gracias por tus comentarios!",
            error: "Algo salió mal. Intenta de nuevo más tarde.",
            validation: {
                messageShort: "Mensaje demasiado corto"
            },
            solicitation: {
                title: "¿Disfrutando TrailReplay?",
                message: "¿Te importaría darnos algunos comentarios sobre cómo mejorarlo aún más?",
                yes: "¡Sí, me encantaría ayudar!",
                no: "Quizá más tarde",
                dontShowAgain: "No mostrar de nuevo"
            }
        },
        
        // Modal buttons
        buttons: {
            save: "Guardar",
            cancel: "Cancelar",
            close: "Cerrar",
            choose: "Elegir",
            chooseIcon: "Elegir Icono",
            delete: "Eliminar"
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
            clickToUploadAdditionalGPXFiles: "Haga clic para subir archivos GPX e imágenes adicionales",
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
        },
        
        // Exportación de Video
        videoExport: {
            title: "Exportación de Video",
            exportHelp: "Ayuda de Exportación",
            autoWebM: "Grabación Automática (WebM)",
            autoMP4: "Grabación Automática (MP4)",
            manualMode: "Grabación Manual de Pantalla",
            webMDescription: "Grabación automática con superposiciones renderizadas en canvas. Funciona en todos los navegadores.",
            mp4Description: "Generación avanzada de MP4 del lado del cliente con renderizado de canvas. Optimizado para calidad y compatibilidad. Detecta automáticamente el mejor códec y configuración para tu dispositivo.",
            manualDescription: "La mejor calidad con todas las estadísticas y superposiciones. Usa la grabadora de pantalla de tu sistema para capturar el área resaltada mientras la animación se reproduce.",
            gameBarRecord: "Game Bar → Grabar",
            recordSelectedPortion: "Grabar Porción Seleccionada",
            videoRatio: "Proporción de Video",
            landscape: "16:9 Horizontal",
            square: "1:1 Cuadrado",
            mobile: "9:16 Móvil",
            autoWebMShort: "Auto (WebM)",
            autoMP4Short: "Auto (MP4)",
            manualModeShort: "Modo Manual",
            
            // Mensajes
            exportInProgress: "Exportación de Video en Progreso",
            initializing: "Inicializando...",
            keepTabActive: "Mantén esta pestaña del navegador activa",
            closeOtherApps: "Cierra otras aplicaciones para el mejor rendimiento",
            doNotResizeWindow: "No redimensiones ni minimices esta ventana",
            letComplete: "Deja que la exportación se complete sin interrupciones",
            cancelExport: "Cancelar Exportación",
            exportCancelled: "Exportación de video cancelada por el usuario",
            noTrackData: "No hay datos de ruta disponibles para exportar",
            browserNotSupported: "Grabación de medios no compatible con este navegador",
            mapNotReady: "Mapa no listo para exportar",
            exportError: "Error de exportación: {error}",
            mp4NotSupported: "MP4 no directamente compatible, usando formato WebM en su lugar",
            mp4ExportFailed: "Error en exportación MP4: {error}",
            exportComplete: "¡Exportación completa!",
            mp4ExportSuccess: "Video MP4 exportado exitosamente: {filename} ({size})",
            downloadFailed: "Error al descargar archivo MP4",
            manualRecordingActive: "🎥 Grabación manual activa - Presiona Escape o Reset para salir en cualquier momento",
            manualRecordingFailed: "Error en configuración de grabación manual: {error}",
            cannotResizeWindow: "No se puede redimensionar la ventana durante la exportación de video",
            warningBeforeClose: "Exportación de video en progreso. ¿Estás seguro de que quieres salir?",
            keepWindowVisible: "Mantén esta ventana visible para la mejor calidad de exportación de video",
            
            // Diálogo de confirmación
            beforeExporting: "Antes de exportar",
            ensurePerformance: "Asegura un buen rendimiento del sistema",
            closeUnnecessaryApps: "Cierra aplicaciones innecesarias",
            keepTabActiveDuringExport: "Mantén esta pestaña del navegador activa durante la exportación",
            doNotResizeWindowConfirm: "No redimensiones ni minimices esta ventana durante la exportación",
            cancel: "Cancelar",
            startExport: "Iniciar Exportación",
            
            // Diálogo de grabación manual
            manualRecordingInstructions: "Instrucciones de Grabación Manual",
            howToRecord: "Cómo grabar",
            highlightOrange: "El área de grabación se resaltará en naranja",
            useSystemRecorder: "Usa la grabadora de pantalla de tu sistema para capturar el área resaltada",
            animationAutoStart: "La animación iniciará automáticamente con todas las estadísticas visibles",
            recordUntilComplete: "Graba hasta que la animación se complete",
            escapeToExit: "Presiona Escape o Reset para salir del modo de grabación en cualquier momento",
            screenRecordingShortcuts: "Atajos de grabación de pantalla",
            useFullscreen: "Usa el modo de pantalla completa para la mejor calidad",
            ensureGoodPerformance: "Asegura un buen rendimiento del sistema",
            startPreparation: "Iniciar Preparación",
            manualRecordingExited: "Modo de grabación manual finalizado"
        },
        acknowledgments: {
            title: "Agradecimientos",
            intro: "TrailReplay está orgullosamente construido sobre los hombros de gigantes del software libre. Agradecemos a los siguientes proyectos y comunidades:",
            maplibre: "Biblioteca JavaScript de código abierto para mapas interactivos y visualización 3D en el navegador. Potencia todo el renderizado y animación de mapas en TrailReplay.",
            osm: "Proyecto colaborativo para crear un mapa libre y editable del mundo. Proporciona los datos base de mapas para TrailReplay.",
            opentopo: "Teselas topográficas abiertas basadas en datos de OSM. Usadas para visualización de terreno y actividades al aire libre.",
            ors: "Motor y API de rutas de código abierto basado en OSM. Usado para calcular rutas entre puntos.",
            turf: "Análisis geoespacial avanzado para JavaScript. Usado para cálculos de distancia, geometría y operaciones espaciales.",
            langBtn: "English",
            back: "← Volver a TrailReplay"
        }
        ,
        legal: {
            privacy: {
                title: "Política de Privacidad",
                updated: "Última actualización: 2025-01-01",
                intro: "TrailReplay procesa los archivos GPX íntegramente en tu navegador. No se suben archivos al servidor salvo indicación expresa. La conexión con Strava es opcional y solo se usa para importar tus actividades cuando la autorizas.",
                data1: "Archivos GPX: procesados localmente en tu navegador; no se suben por defecto.",
                data2: "Datos de Strava: al conectar, solicitamos acceso de lectura a tus actividades para importar rutas. Los tokens se guardan en tu navegador y puedes revocar el acceso en cualquier momento cerrando sesión o desde tu cuenta de Strava.",
                data3: "Mensajes de comentarios: si envías comentarios, procesamos el contenido del mensaje y el email opcional para responder.",
                thirdPartiesTitle: "Terceros",
                third1: "Strava: usado para OAuth e importación de actividades según tu consentimiento.",
                third2: "Resend: usado para enviar emails de comentarios.",
                choicesTitle: "Tus Opciones",
                choice1: "Puedes desconectar Strava en cualquier momento desde la app (Cerrar sesión) o en tu cuenta de Strava.",
                choice2: "Puedes enviar comentarios sin proporcionar email; si lo proporcionas, solo se usa para responder."
            },
            terms: {
                title: "Términos de Uso",
                updated: "Última actualización: 2025-01-01",
                useTitle: "Uso del Servicio",
                useDesc: "TrailReplay te permite visualizar datos GPX y crear animaciones. Debes ser titular o tener derechos sobre los datos que importes. El servicio se ofrece \"tal cual\", sin garantías.",
                stravaTitle: "Integración con Strava",
                stravaDesc: "Al conectar tu cuenta de Strava concedes acceso de lectura a tus actividades para importar datos GPS. No modificamos tu contenido de Strava. Puedes revocar el acceso en cualquier momento.",
                privacyTitle: "Privacidad",
                privacyDesc: "Consulta nuestra Política de Privacidad para más detalles sobre los datos que procesamos."
            }
        },
        privacy: {
            cookieTitle: "Usamos analíticas para mejorar tu experiencia",
            cookieMessage: "Usamos Google Analytics para entender cómo usas TrailReplay y mejorar la aplicación. No se recopilan datos personales.",
            accept: "Aceptar",
            decline: "Rechazar",
            learnMore: "Más Información",
            privacyTitle: "Privacidad y Analíticas",
            whatWeCollect: "Qué recopilamos",
            collect1: "Cómo usas las funciones de TrailReplay (reproducir, pausar, exportar, etc.)",
            collect2: "Patrones de uso general y funciones populares",
            collect3: "Información técnica como tipo de navegador y tamaño de pantalla",
            whatWeDontCollect: "Qué NO recopilamos",
            dontCollect1: "Tus tracks GPS o datos de ubicación personal",
            dontCollect2: "Información personal como nombres o emails",
            dontCollect3: "Cualquier dato que pueda identificarte personalmente",
            whyWeCollect: "Por qué recopilamos estos datos",
            whyCollectText: "Usamos esta información para entender qué funciones son más útiles y mejorar TrailReplay para todos.",
            yourChoice: "Tu elección",
            yourChoiceText: "Puedes rechazar las analíticas y TrailReplay funcionará exactamente igual. Puedes cambiar de opinión en cualquier momento en la configuración.",
            acceptAnalytics: "Aceptar Analíticas",
            declineAnalytics: "Rechazar Analíticas"
        }
    },

    ca: {
            subtitle: "Reprodueix la història que van explicar els teus camins",
            support: "Suport",
            acknowledgments: {
                title: "Agraïments",
                intro: "TrailReplay està orgullosament construït sobre les espatlles de gegants del programari lliure. Agraïm als següents projectes i comunitats:",
                maplibre: "Biblioteca JavaScript de codi obert per a mapes interactius i visualització 3D al navegador. Alimenta tot el renderitzat i animació de mapes a TrailReplay.",
                osm: "Projecte col·laboratiu per crear un mapa lliure i editable del món. Proporciona les dades base de mapes per a TrailReplay.",
                opentopo: "Rajoles topogràfiques obertes basades en dades d'OSM. Utilitzades per a visualització de terreny i activitats a l'aire lliure.",
                ors: "Motor i API de rutes de codi obert basat en OSM. Utilitzat per calcular rutes entre punts.",
                turf: "Anàlisi geoespacial avançada per a JavaScript. Utilitzat per càlculs de distància, geometria i operacions espacials.",
                langBtn: "English",
                back: "← Tornar a TrailReplay"
            },
            
            // Tutorial and examples
            tutorial: {
                link: "📚 Tutorial i Exemples",
                title: "Tutorial Complet i Guia de Funcions",
                welcomeTitle: "Benvingut a TrailReplay",
                welcomeSubtitle: "Transforma les teves dades GPX de sender en belles animacions 3D interactives",
                welcomeDescription: "TrailReplay és una aplicació web potent però senzilla que converteix les teves dades GPS de sender en històries visuals impressionants. Tant si ets corredor, ciclista, excursionista o atleta multideporte, TrailReplay t'ajuda a reviure i compartir les teves aventures a l'aire lliure a través de mapes animats, estadístiques detallades i vídeos exportables.",
                proTip: "💡 Consell Professional:",
                proTipText: "TrailReplay funciona completament al teu navegador - no s'envien dades als servidors, garantint la teva privadesa i permetent ús offline!",
                
                // GPX Download Guide section
                gpxDownloadTitle: "Com Descarregar Fitxers GPX",
                gpxDownloadSubtitle: "Guia completa per exportar els teus tracks GPS des de plataformes populars",
                gpxDownloadDescription: "Abans de poder crear animacions de camins, necessitaràs fitxers GPX de les teves activitats GPS. Hem creat una guia completa que et mostra com descarregar fitxers GPX des de les plataformes més populars com Wikiloc, Strava, Garmin Connect i moltes altres.",
                viewGpxGuide: "📥 Veure Guia Completa de Descàrrega GPX",
                gpxGuideTip: "💡 Consell Ràpid:",
                gpxGuideTipText: "La guia cobreix Wikiloc i Strava en detall, a més de consells per a altres plataformes com Garmin Connect, Apple Health, Google Fit i més.",
                
                // Sample files section
                sampleFiles: "Descarregar Fitxers GPX d'Exemple",
                sampleFilesSubtitle: "Prova TrailReplay amb aquestes activitats d'exemple",
                exampleActivities: "🏃‍♂️ Activitats d'Exemple",
                sampleDescription: "Descarrega aquests fitxers GPX d'exemple per explorar totes les funcions de TrailReplay:",
                downloadRunning: "🏃‍♂️ Ruta de Córrer (5km)",
                downloadCycling: "🚴‍♂️ Ruta de Ciclisme (25km)",
                downloadHiking: "🥾 Excursió de Muntanya (8km)",
                downloadMulti: "🏆 Viatge Multi-Esport",
                
                // Demo video section
                demoVideoTitle: "Vegeu el Que Podeu Crear",
                demoVideoSubtitle: "Exemples de TrailReplay en acció",
                demoCaption: "Aquests demostratius destaquen un segment individual amb estadístiques detallades i el flux del mode de comparació enregistrats directament a TrailReplay.",
                videoNotSupported: "El teu navegador no suporta reproducció de vídeo. Pots descarregar el vídeo d'exemple en el seu lloc.",
                segmentBuilderCaption: "Exportació de ruta amb estadístiques detallades i dades d'elevació.",
                segmentBuilderDownload: "Descarrega la demo d'exportació de ruta",
                exportFlowCaption: "Mode de comparació mostrant dos fitxers GPX del mateix període de temps.",
                exportFlowDownload: "Descarrega la demo del mode de comparació",
                instagramExamples: "Vols veure més exemples? Fes un cop d'ull al nostre Instagram per inspiració:",
                instagramLink: "Segueix @trailreplay a Instagram",
                
                // Core features
                coreFeatures: "Resum de Funcions Principals",
                coreFeaturesSubtitle: "Tot el que pots fer amb TrailReplay",
                multiFileTitle: "📁 Càrrega Multi-Fitxer",
                multiFileDescription: "Carrega múltiples fitxers GPX per crear viatges complexos. Perfecte per aventures multi-dies o comparar diferents rutes.",
                journeyBuilderTitle: "🧩 Constructor de Viatges",
                journeyBuilderDescription: "Combina múltiples tracks en un sol viatge amb segments de transport personalitzats entre activitats.",
                animationTitle: "🎬 Animació 3D",
                animationDescription: "Observa com el teu sender cobra vida amb animacions 3D suaus, icones personalitzables i estadístiques en temps real.",
                videoExportTitle: "📹 Exportació de Vídeo",
                videoExportDescription: "Exporta la teva animació de sender com a fitxer de vídeo per compartir a xarxes socials o desar com a record.",
                annotationsTitle: "📝 Anotacions de Sender",
                annotationsDescription: "Afegeix notes, fotos i punts d'interès a ubicacions específiques al llarg del teu sender per a la narració d'històries.",
                iconTimelineTitle: "🔄 Línia de Temps d'Icones",
                iconTimelineDescription: "Canvia les icones d'activitat durant l'animació per representar diferents activitats o condicions.",
                mapStylesTitle: "🗺️ Estils de Mapa Múltiples",
                mapStylesDescription: "Tria entre estils de mapa de satèl·lit, terreny o carrer. Activa el terreny 3D per a la visualització dramàtica de l'elevació.",
                liveStatsTitle: "📊 Estadístiques en Viu",
                liveStatsDescription: "Dades de distància, elevació i temps en temps real que s'actualitzen mentre es reprodueix l'animació.",
                multiLanguageTitle: "🌍 Multi-Idioma",
                multiLanguageDescription: "Suport complet per anglès i castellà amb detecció automàtica d'idioma.",
                
                // Getting started
                gettingStarted: "Com Començar",
                gettingStartedSubtitle: "La teva primera animació TrailReplay en 5 minuts",
                step1Title: "Carrega el Teu Fitxer GPX",
                step1Description: "Arrossega i deixa anar un fitxer GPX a l'àrea de càrrega, o fes clic \"Tria Fitxers\" per navegar. Pots carregar múltiples fitxers alhora.",
                step2Title: "Construeix el Teu Viatge",
                step2Description: "Els teus tracks carregats apareixen al Constructor de Viatges. Reordena'ls arrossegant, i afegeix segments de transport entre tracks si cal.",
                step3Title: "Personalitza la Visualització",
                step3Description: "Tria el teu estil de mapa, color de sender, icones d'activitat i configuracions d'animació. Activa el terreny 3D per efecte dramàtic.",
                step4Title: "Reprodueix la Teva Animació",
                step4Description: "Fes clic al botó de Reproduir per iniciar l'animació. Utilitza la barra de progrés per saltar a moments específics.",
                step5Title: "Afegeix Anotacions (Opcional)",
                step5Description: "Fes clic \"Afegeix Nota\" per afegir anotacions en punts específics. Apareixeran durant la reproducció de l'animació.",
                step6Title: "Exporta el Teu Vídeo",
                step6Description: "Fes clic \"Exporta Vídeo\" per desar la teva animació com a fitxer WebM per compartir.",
                
                // Advanced features
                advancedFeatures: "Funcions Avançades",
                advancedFeaturesSubtitle: "Consells d'usuari avançat i funcionalitat avançada",
                backToApp: "← Tornar a l'App TrailReplay",
                journeyBuilderAdvancedTitle: "🧩 Constructor de Viatges Avançat",
                journeyBuilderAdvancedDesc: "El Constructor de Viatges et permet crear viatges multi-activitat complexos:",
                reorderTracks: "<strong>Reordenar Tracks:</strong> Arrossega tracks per canviar la seqüència del teu viatge",
                customTiming: "<strong>Temps Personalitzat:</strong> Substitueix càlculs de temps automàtics amb durades personalitzades",
                transportationSegments: "<strong>Segments de Transport:</strong> Afegeix segments de cotxe, vaixell, avió, tren o caminar entre tracks",
                autoPreview: "<strong>Previsualització Automàtica:</strong> Els canvis s'apliquen automàticament a la visualització",
                dynamicIconChangesTitle: "🔄 Canvis d'Icona Dinàmics",
                dynamicIconChangesDesc: "Explica la teva història amb icones canviants:",
                addIconChange: "Fes clic \"Afegir Canvi d'Icona\" i després fes clic al mapa o barra de progrés",
                chooseNewIcon: "Tria una icona nova que representi diferents activitats o condicions",
                perfectFor: "Perfecte per triatlons, curses d'aventura, o canvis de temps",
                smartAnnotationsTitle: "📝 Anotacions Intel·ligents",
                smartAnnotationsDesc: "Afegeix context al teu sender:",
                choosePresetIcons: "Tria d'icones preestablertes (📍 ubicació, ⚠️ avís, 📸 foto, etc.)",
                addTitles: "Afegeix títols i descripcions a cada anotació",
                annotationsAppear: "Les anotacions apareixen automàticament durant l'animació",
                clickAnnotations: "Fes clic a les anotacions de la llista per saltar a aquest punt",
                videoExportOptionsTitle: "🎥 Opcions d'Exportació de Vídeo",
                videoExportOptionsDesc: "Exportacions de vídeo de qualitat professional:",
                webmFormat: "<strong>Format WebM:</strong> Vídeos web d'alta qualitat",
                cleanInterface: "<strong>Interfície Neta:</strong> Els elements d'UI s'amaguen durant l'exportació",
                fps: "<strong>30 FPS:</strong> Animació suau a 30 fotogrames per segon",
                customBitrate: "<strong>Taxa de Bits Personalitzada:</strong> 2.5 Mbps per a un balanç òptim qualitat/mida",
                videoExportTipsTitle: "⚠️ Consells d'Exportació de Vídeo:",
                videoExportTips: "Per obtenir els millors resultats, deixa que el mapa es carregui completament abans d'exportar. Si veus àrees blanques (rajoles de càrrega), espera un moment o alenteix la velocitat d'animació.",
                mapCustomizationTitle: "Personalització del Mapa",
                mapCustomizationDesc: "Fes que la teva visualització sigui perfecta per a la teva història",
                mapStyles: "Estils de Mapa",
                mapStylesDesc: "<strong>🛰️ Satèl·lit:</strong> Imatgeria de satèl·lit d'alta resolució<br><strong>🗻 Terreny:</strong> Topografia amb ombrejat d'elevació<br><strong>🗺️ Carrer:</strong> Mapa detallat a nivell de carrer",
                terrain3d: "Terreny 3D",
                terrain3dDesc: "Activa el terreny 3D per a una visualització dramàtica de l'elevació. Tria entre fonts de dades Mapzen Terrarium (global) o OpenTopography SRTM.",
                trailStyling: "Estil del Sender",
                trailStylingDesc: "Personalitza el color del sender amb opcions preestablertes o colors personalitzats. Ajusta la mida dels marcadors i activa/desactiva cercles de fons.",
                autoFollow: "Seguiment Automàtic",
                autoFollowDesc: "La càmera segueix automàticament el marcador animat, o desactiva per a una vista fixa de tot el sender.",
                troubleshootingTitle: "Resolució de Problemes i Consells",
                troubleshootingDesc: "Problemes comuns i com solucionar-los",
                fileUploadIssues: "📁 Problemes de Càrrega de Fitxers",
                fileFormat: "<strong>Format:</strong> Només s'admeten fitxers GPX (no TCX, FIT, o altres formats)",
                fileSize: "<strong>Mida:</strong> Fitxers molt grans (>1000 punts) poden alentir el rendiment",
                fileContent: "<strong>Contingut:</strong> Els fitxers GPX han de contenir punts de track amb coordenades i marques de temps",
                videoExportIssues: "🎥 Problemes d'Exportació de Vídeo",
                whiteAreas: "<strong>Àrees Blanques:</strong> Espera que els tiles del mapa es carreguin abans d'exportar",
                browserSupport: "<strong>Navegadors Compatibles:</strong> Chrome i Firefox funcionen millor per exportar vídeo",
                performance: "<strong>Rendiment:</strong> Tanca altres pestanyes del navegador per millorar la gravació",
                mapDisplayIssues: "🗺️ Problemes de Visualització del Mapa",
                slowLoading: "<strong>Càrrega Lenta:</strong> Desactiva el terreny 3D si el mapa carrega lent",
                missingTiles: "<strong>Rajoles Faltants:</strong> Verifica la teva connexió a internet",
                poorPerformance: "<strong>Rendiment Pobre:</strong> Prova canviant a un estil de mapa més simple",
                performanceTipsTitle: "💡 Consells de Rendiment:",
                simplifyFiles: "Simplifica fitxers GPX grans reduint punts de ruta",
                satelliteView: "Usa vista satèl·lit per a millor impacte visual",
                recordAtLowerSpeed: "Grava vídeos a menor velocitat d'animació per a major suavitat",
                clearCache: "Neteja la memòria cau del navegador si tens problemes",
                technicalDetailsTitle: "Detalls Tècnics",
                technicalDetailsDesc: "Com funciona TrailReplay internament",
                techStack: "🔧 Stack Tecnològic",
                maplibre: "<strong>MapLibre GL JS:</strong> Mapeig i visualització 3D de codi obert",
                threejs: "<strong>Three.js:</strong> Capacitats gràfiques 3D addicionals",
                mediaRecorder: "<strong>MediaRecorder API:</strong> Gravació de vídeo nativa del navegador",
                turfjs: "<strong>Turf.js:</strong> Càlculs i anàlisis geoespacials",
                webWorkers: "<strong>Web Workers:</strong> Processament en segon pla per a fitxers grans",
                privacySecurity: "🔒 Privadesa i Seguretat",
                clientSide: "<strong>Sólo al Client:</strong> Tot el processament ocorre al teu navegador",
                noDataUpload: "<strong>Sense Pujada de Dades:</strong> Els teus fitxers GPX mai surten del teu dispositiu",
                noTracking: "<strong>Sense Seguiment:</strong> Sense analítiques ni rastreig d'usuari",
                openSource: "<strong>Codi Obert:</strong> Tot el codi és públic",
                browserSupport: "🌐 Navegadors Compatibles",
                chrome: "<strong>Chrome 80+:</strong> Suport complet de funcions incloent exportació de vídeo",
                firefox: "<strong>Firefox 75+:</strong> Suport complet de funcions",
                safari: "<strong>Safari 14+:</strong> Funcions bàsiques (l'exportació de vídeo pot ser limitada)",
                edge: "<strong>Edge 80+:</strong> Suport complet de funcions",
                elevationDataChanged: "Canviat a dades d'elevació {source}",
                terrainSourceSwitched: "Font de terreny canviada a {source}",
                openTopoUnavailable: "OpenTopography no disponible, canviat a Mapzen",
                mapzenWorking: "Dades d'elevació Mapzen carregant correctament"
            },
            
            // GPX Download Guide
            gpxGuide: {
                link: "📥 Guia de Descàrrega GPX",
                welcomeTitle: "Com Descarregar Fitxers GPX",
                welcomeSubtitle: "Guia completa per exportar els teus tracks GPS des de plataformes populars",
                welcomeDescription: "Per crear impressionants animacions de camins amb TrailReplay, necessitaràs fitxers GPX de les teves activitats GPS. Aquesta guia et mostra com descarregar fitxers GPX des de les plataformes més populars, començant amb Wikiloc i Strava.",
                proTip: "💡 Consell Professional:",
                proTipText: "Els fitxers GPX contenen les dades del teu track GPS amb coordenades, marques de temps i informació d'elevació. Són el format estàndard per compartir tracks GPS entre diferents aplicacions.",
                
                // Wikiloc section
                wikilocTitle: "Wikiloc",
                wikilocSubtitle: "La plataforma d'activitats a l'aire lliure més gran del món",
                wikilocDescription: "Wikiloc és una de les plataformes més populars per a activitats a l'aire lliure, amb milions de camins compartits per la comunitat. Aquí t'expliquem com descarregar fitxers GPX de les teves activitats a Wikiloc:",
                wikilocStep1Title: "Inicia sessió al teu compte de Wikiloc",
                wikilocStep1Desc: "Ves a wikiloc.com i inicia sessió amb el teu nom d'usuari i contrasenya.",
                wikilocStep2Title: "Navega a les teves activitats",
                wikilocStep2Desc: "Fes clic a la teva foto de perfil a l'extrem superior dret, després selecciona \"Els meus tracks\" del menú desplegable.",
                wikilocStep3Title: "Selecciona l'activitat que vols descarregar",
                wikilocStep3Desc: "Troba l'activitat que vols exportar i fes clic al seu títol per obrir la vista detallada.",
                wikilocStep4Title: "Descarrega el fitxer GPX",
                wikilocStep4Desc: "A la pàgina de l'activitat, busca el botó \"Descarregar\" (generalment a l'àrea superior dreta). Fes clic i selecciona el format \"GPX\" de les opcions.",
                wikilocStep5Title: "Desa el fitxer",
                wikilocStep5Desc: "El fitxer GPX es descarregarà al teu ordinador. Ara pots pujar-lo a TrailReplay per crear el teu vídeo de camí animat.",
                wikilocTipTitle: "💡 Consells de Wikiloc:",
                wikilocTip1: "També pots descarregar fitxers GPX de camins públics d'altres usuaris",
                wikilocTip2: "Wikiloc ofereix comptes gratuïts i premium amb diferents límits de descàrrega",
                wikilocTip3: "Els fitxers GPX inclouen dades d'elevació, cosa que fa que les animacions 3D siguin excel·lents",
                
                // Strava section
                stravaTitle: "Strava",
                stravaSubtitle: "Plataforma popular de seguiment de fitness per a atletes",
                stravaDescription: "Strava és àmpliament utilitzada per corredors, ciclistes i altres atletes per rastrejar les seves activitats. Aquí t'expliquem com exportar els teus fitxers GPX des de Strava:",
                stravaStep1Title: "Inicia sessió al teu compte de Strava",
                stravaStep1Desc: "Ves a strava.com i inicia sessió amb les teves credencials.",
                stravaStep2Title: "Ves a les teves activitats",
                stravaStep2Desc: "Fes clic a la teva foto de perfil a l'extrem superior dret, després selecciona \"Les meves activitats\" o ves directament al teu tauler.",
                stravaStep3Title: "Selecciona una activitat",
                stravaStep3Desc: "Troba l'activitat que vols exportar i fes clic per obrir la vista detallada.",
                stravaStep4Title: "Exporta el fitxer GPX",
                stravaStep4Desc: "A la pàgina de l'activitat, fes clic al menú de tres punts (⋮) a l'extrem superior dret, després selecciona \"Exportar Original\" o \"Exportar GPX\".",
                stravaStep5Title: "Descarrega i desa",
                stravaStep5Desc: "El fitxer GPX es descarregarà al teu ordinador. Ara pots utilitzar-lo amb TrailReplay per crear belles animacions de camins.",
                stravaExportInfo: "Strava ofereix dues opcions d'exportació: \"Exportar GPX\" per a un fitxer GPX estàndard, i \"Exportar Original\" per obtenir el format de fitxer exacte que vas pujar originalment (que pot ser GPX, TCX o FIT).",
                stravaTipTitle: "💡 Consells de Strava:",
                stravaTip1: "Usa \"Exportar GPX\" per a un fitxer GPX estàndard que funciona amb TrailReplay",
                stravaTip2: "Usa \"Exportar Original\" per obtenir el format de fitxer exacte que vas pujar originalment",
                stravaTip3: "Els membres Premium de Strava tenen accés a més opcions d'exportació",
                stravaTip4: "També pots exportar activitats d'altres usuaris si són públiques",
                
                // Other platforms section
                otherPlatformsTitle: "Altres Plataformes Populars",
                otherPlatformsSubtitle: "Com descarregar fitxers GPX des d'altres plataformes de fitness i activitats a l'aire lliure",
                garminTitle: "Garmin Connect",
                garminDesc: "Exporta activitats des de dispositius Garmin a través de la plataforma web Connect o l'aplicació mòbil.",
                appleHealthTitle: "Apple Health",
                appleHealthDesc: "Exporta dades d'entrenament des de l'aplicació Apple Health, tot i que l'exportació GPX requereix aplicacions de tercers.",
                googleFitTitle: "Google Fit",
                googleFitDesc: "Exporta dades de fitness a través de Google Takeout, tot i que el format GPX pot requerir conversió.",
                runkeeperTitle: "Runkeeper",
                runkeeperDesc: "Exporta activitats com a fitxers GPX a través de la interfície web o configuracions de l'aplicació mòbil.",
                alltrailsTitle: "AllTrails",
                alltrailsDesc: "Descarrega fitxers GPX des de mapes de camins i les teves activitats gravades a través de la plataforma web.",
                polarTitle: "Polar Flow",
                polarDesc: "Exporta activitats des de dispositius Polar a través de la plataforma web Flow o l'aplicació mòbil.",
                generalTipTitle: "💡 Consells Generals per a Totes les Plataformes:",
                generalTip1: "La majoria de les plataformes requereixen que iniciïs sessió per descarregar les teves pròpies activitats",
                generalTip2: "Busca opcions \"Exportar\", \"Descarregar\" o \"GPX\" als menús d'activitats",
                generalTip3: "Algunes plataformes poden requerir una subscripció premium per a l'exportació GPX",
                generalTip4: "Sempre verifica la configuració de privadesa de la plataforma abans de compartir activitats",
                
                // File format section
                fileFormatTitle: "Entenent els Fitxers GPX",
                fileFormatSubtitle: "Què hi ha dins d'un fitxer GPX i per què funciona amb TrailReplay",
                whatIsGPXTitle: "¿Què és un fitxer GPX?",
                whatIsGPXDesc: "GPX (GPS Exchange Format) és un estàndard obert per emmagatzemar dades de tracks GPS. És un fitxer XML que conté:",
                gpxElement1: "<strong>Punts de track:</strong> Coordenades de latitud, longitud i elevació",
                gpxElement2: "<strong>Marques de temps:</strong> Quan es va gravar cada punt",
                gpxElement3: "<strong>Metadades:</strong> Nom de l'activitat, descripció i informació del dispositiu",
                gpxElement4: "<strong>Waypoints:</strong> Ubicacions importants al llarg de la teva ruta",
                trailreplayCompatibleTitle: "✅ Compatible amb TrailReplay:",
                trailreplayCompatibleDesc: "TrailReplay llegeix tots els fitxers GPX estàndard i utilitza els punts de track per crear animacions suaus. ¡Com més punts de track, més suau serà la teva animació!",
                fileQualityTitle: "Obtenint els Millors Fitxers GPX de Qualitat",
                fileQualityDesc: "Per a la millor experiència amb TrailReplay, busca fitxers GPX amb:",
                qualityTip1: "<strong>Alta densitat de punts:</strong> Més punts de track = animacions més suaus",
                qualityTip2: "<strong>Marques de temps precises:</strong> Ajuda a TrailReplay a crear temps realistes",
                qualityTip3: "<strong>Dades d'elevació:</strong> Permet la visualització de terreny 3D",
                qualityTip4: "<strong>Dades netes:</strong> Menys errors GPS i valors atípics",
                
                // Next steps section
                nextStepsTitle: "¿Llest per Crear la teva Animació de Camí?",
                nextStepsSubtitle: "Ara que tens els teus fitxers GPX, és hora de donar-los vida",
                nextStepsDesc: "Una vegada que hagis descarregat els teus fitxers GPX des de la teva plataforma preferida, estàs llest per crear impressionants animacions de camins amb TrailReplay:",
                nextStep1Title: "Puja els teus fitxers GPX",
                nextStep1Desc: "Ves a TrailReplay i arrossega i deixa anar els teus fitxers GPX a l'àrea de càrrega.",
                nextStep2Title: "Construeix el teu viatge",
                nextStep2Desc: "Organitza els teus tracks al Constructor de Viatges i afegeix segments de transport si és necessari.",
                nextStep3Title: "Personalitza la teva animació",
                nextStep3Desc: "Tria estils de mapa, colors i configuracions d'animació perquè coincideixin amb la teva història.",
                nextStep4Title: "Exporta el teu vídeo",
                nextStep4Desc: "Crea un bell vídeo per compartir la teva aventura amb amics i família.",
                needHelpTitle: "¿Necessites Ajuda?",
                needHelpDesc: "Consulta el nostre tutorial complet i exemples per a instruccions detallades sobre com utilitzar les funcions de TrailReplay.",
                backToApp: "← Tornar a l'App TrailReplay"
            },

            upload: {
                title: "Pujar Fitxers GPX i Fotos",
                description: "Afegeix múltiples rutes GPX i imatges per crear el teu viatge",
                button: "Triar Fitxers",
                urlLabel: "Enganxa la teva URL:",
                loadFromUrl: "🔗 Obrir Pàgina de Descàrrega",
                urlPlaceholder: "https://www.strava.com/activities/123456 o https://www.wikiloc.com/trails/view/123456 o altres plataformes",
                stravaInstructions: "A Strava: Fes clic a 3 punts (⋯) al costat del títol de l'activitat → Exportar GPX",
                wikilocInstructions: "A Wikiloc: Fes clic a la pestanya 'Fitxer' → Descarregar GPX",
                externalImport: "Importar des de Fonts Externes",
                hideExternalImport: "Amagar Importació Externa",
    
                // Platform instruction cards
                platformInstructions: {
                    strava: {
                        title: "Strava",
                        step1: "Enganxa la URL de l'activitat:",
                        step2: "Fes clic a \"🔗 Obrir Pàgina de Descàrrega\"",
                        step3: "A Strava: Fes clic a 3 punts (⋯) al costat del títol de l'activitat",
                        step4: "Selecciona \"Exportar GPX\"",
                        step5: "Puja el fitxer descarregat",
                        tryIt: "Prova:",
                        exampleActivity: "Activitat UTMB 2021"
                    },
                    wikiloc: {
                        title: "Wikiloc",
                        step1: "Enganxa la URL del sender:",
                        step2: "Fes clic a \"🔗 Obrir Pàgina de Descàrrega\"",
                        step3: "A Wikiloc: Fes clic a la pestanya \"Fitxer\"",
                        step4: "Fes clic a \"Descarregar GPX\"",
                        step5: "Puja el fitxer descarregat",
                        otherExamples: "Altres exemples:",
                        santFeliuRace: "Cursa Sant Feliu",
                        anotherTrail: "Un altre sender"
                    },
                    otherPlatforms: {
                        title: "Altres Plataformes",
                        step1: "Enganxa qualsevol URL de plataforma GPS",
                        step2: "Fes clic a \"🔗 Obrir Pàgina de Descàrrega\"",
                        step3: "Busca l'opció \"Exportar\" o \"Descarregar GPX\"",
                        step4: "Selecciona format GPX si està disponible",
                        step5: "Puja el fitxer descarregat",
                        supported: "Compatibles:",
                        supportedPlatforms: "Garmin, AllTrails, Komoot, Suunto, Polar, Coros, Endomondo, Nike, Adidas, Fitbit, Dropbox, Google Drive"
                    }
                },
    
                // Status messages
                urlStatus: {
                    exampleLoaded: "URL d'exemple carregada!",
                    platformDetected: "Plataforma detectada:",
                    clickToTest: "Fes clic a \"🔗 Obrir Pàgina de Descàrrega\" per provar la funcionalitat.",
                    openingPage: "⏳ Obrint...",
                    openingText: "Obrint...",
                    pageOpened: "Pàgina oberta amb èxit!"
                }
            },
            
    
    
            landing: {
                hero: {
                    title: 'Converteix Fitxers GPX en Vídeos Animats Impressionants',
                    description: 'Transforma els teus fitxers GPX en bells vídeos de camins animats en línia. Conversor gratuït de GPX a vídeo perfecte per corredors, ciclistes i excursionistes. Crea mapes animats professionals dels teus tracks GPS amb terreny 3D, estils personalitzats i animacions fluides - no requereix descàrrega de programari.'
                },
                features: {
                    conversion: 'Conversió GPX a Vídeo',
                    maps: 'Mapes Animats 3D',
                    free: '100% Gratuït'
                },
                cta: {
                    start: 'Comença a Convertir els Teus Fitxers GPX',
                    tutorial: 'Veure Tutorial i Exemples',
                    gpxGuide: '📥 Guia de Descàrrega GPX'
                },
                benefits: {
                    title: '¿Per Què Triar El Nostre Conversor de GPX a Vídeo?',
                    athletes: {
                        title: 'Perfecte per a Atletes',
                        description: 'Crea increibles videos de running, videos de ciclisme i videos de senderisme des dels teus tracks GPS. Comparteix les teves rutes d\'entrenament i experiencies de curses amb belles visualitzacions animades.',
                    },
                    quality: {
                        title: 'Qualitat Professional',
                        description: 'Genera videos de camins animats d\'alta qualitat amb terreny 3D, multiples estils de mapa i moviments de camera suaus. Perfecte per a xarxes socials, presentacions o records personals.',
                    },
                    easy: {
                        title: 'Fàcil d\'Usar',
                        description: 'Simplement puja els teus fitxers GPX i mira\'ls transformar-se en videos atractius. No es requereix coneixement tecnic - el nostre conversor GPX en linia fa tota la feina.',
                    },
    
                },
                useCases: {
                    title: 'Perfecte per a:',
                    marathon: 'Vídeos d\'Entrenament de Marató',
                    cycling: 'Visualització de Rutes de Ciclisme',
                    hiking: 'Documentació de Camins',
                    race: 'Vídeos de Repetició de Curses',
                    travel: 'Històries de Rutes de Viatge',
                    fitness: 'Seguiment de Progrés Fitness'
                },
                howItWorks: {
                    title: 'Com Funciona',
                    step1: {
                        title: 'Puja Fitxers GPX',
                        description: 'Puja els teus fitxers GPX des del teu rellotge GPS, telèfon, o qualsevol font. Suporta múltiples tracks i anotacions d\'imatges.'
                    },
                    step2: {
                        title: 'Personaliza y Previsualiza',
                        description: 'Elige estilos de mapa, ajusta modos de cámara, añade anotaciones, y previsualiza tu sendero animado en tiempo real con terreno 3D.'
                    },
                    step3: {
                        title: 'Exporta y Comparte',
                        description: 'Exporta tu sendero animado como un video de alta calidad y compártelo en redes sociales, con amigos, o úsalo para presentaciones.'
                    }
                }
            },
            
            controls: {
                activity: "Tipus d'Activitat:",
                terrain: "Estil de Terreny:",
                totalTime: "Temps Total:",
                pathColor: "Color del Camí",
                showMarker: "Mostrar Marcador",
                markerSize: "Mida del Marcador",
                currentIcon: "Icona Actual",
                changeIcon: "Canviar",
                autoFollow: "Seguiment Automàtic",
                showCircle: "Mostrar Cercle",
                
                // UI de lletres de la ruta principal
                track1Letters: "Lletres de la ruta",
                showTrackLettersTitle: "Mostra les lletres a la ruta principal",

                // Stats Labels
                        distance: "Distància",
            elevation: "Elevació",
                showEndStats: "Mostrar Estadístiques Finals",
                showSegmentSpeeds: "Mostrar velocitats per segment",
                showLiveElevation: "Mostrar altitud en viu",
                speedAsPace: "Mostrar ritme (min/km)",

                // Comparison Mode
                comparisonSettings: "🏃‍♂️ Mode Comparació",
                enableComparison: "Habilitar Comparació",
                secondTrack: "Segona Ruta",
                selectTrack: "Seleccionar Fitxer GPX",
                loadTrack: "Carregar Ruta",

                // Comparison Instructions
                comparisonInstructionsTitle: "Com utilitzar:",
                comparisonInstructionsStep1: "1. Carregar ruta GPX principal",
                comparisonInstructionsStep2: "2. Seleccionar fitxer GPX de comparació",
                comparisonInstructionsStep3: "3. Personalitzar noms i colors a baix",

                // Comparison Tracks
                comparisonTracksTitle: "Rutes:",
                comparisonTracksTrack1: "• Ruta 1: Ruta principal (color personalitzable)",
                comparisonTracksTrack2: "• Ruta 2: Ruta de comparació",

                // Comparison Customization
                comparisonNamesTitle: "Noms de Rutes",
                comparisonNamesTrack1Placeholder: "Ruta 1",
                comparisonNamesTrack2Placeholder: "Ruta 2",
                track2Name: "Nom de la ruta 2",
                comparisonColorTitle: "Color de Ruta 2",
                comparisonColorReset: "Restablir",

                // Control Section Headers
                markerSettings: "🎯 Configuració del Marcador",
                cameraSettings: "🎬 Configuració de la Càmera",
                mapTerrainSettings: "🗺️ Mapa i Terreny",
                statsSettings: "📊 Configuració d'Estadístiques",

                play: "Reproduir",
                pause: "Pausar",
                reset: "Reiniciar",
                addIconChange: "🔄 Canviar Icona",
                addAnnotation: "📍 Afegir Nota",
                export: "📹 Exportar Vídeo",
                videoExport: "Exportar Vídeo",
                exportHelp: "ℹ️ Opcions d'Exportació",
                exportHelpHide: "ℹ️ Ocultar Opcions",
                
                // Manual recording instructions
                manualRecordingTitle: "🎥 Mode Manual amb Estadístiques",
                manualRecordingInstructions: "Instruccions per a Gravació de Qualitat Perfecta:",
                manualRecordingWindows: "Windows:",
                manualRecordingWindowsKeys: "<kbd>Win</kbd> + <kbd>G</kbd> → Barra de Joc → Gravar",
                manualRecordingMac: "Mac:",
                manualRecordingMacKeys: "<kbd>⌘</kbd> + <kbd>⇧</kbd> + <kbd>5</kbd> → Gravar Porció Seleccionada",
                manualRecordingHighlight: "📱 ¡El ressaltat taronja mostra exactament què capturar!",
                manualRecordingHighlightDesc: "Això assegura que obtinguis totes les estadístiques, perfil d'elevació i overlays en qualitat perfecta.",
                manualRecordingWhatHappens: "Què passa després:",
                manualRecordingStep1: "Els tiles del mapa es precarregaran per a una gravació fluida",
                manualRecordingStep2: "L'àrea de gravació es ressaltarà en taronja",
                manualRecordingStep3: "L'animació començarà automàticament amb totes les estadístiques",
                        manualRecordingStep4: "Usa el gravador de pantalla del teu sistema per capturar l'àrea ressaltada",
            manualRecordingStep5: "Prem Escape en qualsevol moment per sortir del mode de gravació manual",
            manualRecordingCancel: "Cancel·lar",
                manualRecordingStart: "🎬 Iniciar Preparació",
    
                exportAutoTitle: "🔧 Gravació Automàtica (WebM)",
                exportAutoDesc: "Gravació automàtica amb overlays renderitzats en canvas. Funciona en tots els navegadors (format WebM).",
                exportCropTitle: "🚀 Gravació Automàtica (MP4)",
                exportCropDesc: "⚠️ EXPERIMENTAL: Només Chrome 126+. Usa CropTarget API experimental. Pot no funcionar correctament - usa mode WebM si trobes problemes.",
                exportManualTitle: "🎥 Mode Manual amb Estadístiques",
                exportManualDesc: "Millor qualitat amb totes les estadístiques i overlays. Usa el gravador de pantalla del teu sistema per capturar l'àrea destacada mentre es reprodueix l'animació.",
                exportAutoWebm: "🔧 Auto (WebM)",
                exportAutoCrop: "🚀 Auto (MP4)",
                exportManual: "🎥 Mode Manual amb Estadístiques",
                manualWindows: "Windows:",
                manualMac: "Mac:",
                autoZoom: "Auto Zoom",
                terrain3d: "Terreny 3D",
                terrainSource: "Dades d'Elevació",
                showStats: "Mostrar Estadístiques en Viu",
                gpxOnlyStats: "No comptar distàncies en transfers",
                language: "Idioma",
                cameraMode: "Mode de Càmera",
                cameraStandard: "🎥 Mode Manual",
                cameraFollowBehind: "🎬 Seguir Darrere",
                followBehindZoom: "Distància de Seguiment",
                followBehindVeryClose: "🔍 Molt A prop",
                followBehindMedium: "📍 Mitjà",
                followBehindFar: "🌍 Lluny",
                cancelIconChange: "Cancel·lar Canvi d'Icona"
            },
            
            cameraInfo: {
                title: "Controls de Càmera del Mapa",
                buttonText: "ℹ️ Controls de Càmera",
                desktop: {
                    title: "💻 Controls d'Escriptori",
                    pan: "Desplaçar: Clic i arrossegar per moure el mapa",
                    zoom: "Zoom: Roda del ratolí o tecles +/-",
                    rotate: "Rotar: Clic dret i arrossegar, o Maj + clic i arrossegar",
                    tilt: "Inclinar: Ctrl + clic i arrossegar (mode 3D)"
                },
                mobile: {
                    title: "📱 Controls Mòbils",
                    pan: "Desplaçar: Tocar i arrossegar amb un dit",
                    zoom: "Zoom: Pellizcar amb dos dits per acostar/allunyar",
                    rotate: "Rotar: Tocar i arrossegar amb dos dits",
                    tilt: "Inclinar: Tocar amb dos dits i moure amunt/avall (mode 3D)"
                }
            },
            
            iconSelection: {
                title: "Seleccionar Icona"
            },

            iconChange: {
                title: "Afegir Canvi d'Icona",
                instruction: "Fes clic al mapa o a la barra de progrés per establir la posició on ha de canviar l'icona.",
                newIcon: "Nova Icona"
            },

            iconChanges: {
                title: "Cronologia de Canvis d'Icona"
            },

            annotations: {
                title: "Anotacions del Camí",
                addTitle: "Afegir Anotació",
                clickToAdd: "Fes clic al mapa per afegir una anotació",
                noAnnotations: "No s'han afegit anotacions encara"
            },

            stats: {
                title: "Estadístiques del Camí",
                distance: "Distància Total",
                duration: "Durada",
                elevation: "Ganancia d'Elevació",
                averageSpeed: "Velocitat promig",
                averagePace: "Ritme promig",
                maxElevation: "Elevació Màxima",
                minElevation: "Elevació Mínima",
                speed: "Velocitat promig",
                currentDistance: "Distància",
                currentElevation: "Elevació",
                currentSpeed: "Velocitat",
                segmentSpeeds: "Velocitats per segment",
                segmentSpeedsUnavailable: "No hi ha dades de velocitat per segment.",
                segmentLabel: "Segment",
                overallSegment: "Velocitat general",
                speedPerKm: "Velocitat per km",
                kilometerLabel: "Km {index}",
                segmentActivities: {
                    running: "Córrer",
                    cycling: "Ciclisme",
                    swimming: "Natació",
                    hiking: "Senderisme",
                    walking: "Caminada",
                    driving: "Conducció",
                    default: "Activitat"
                }
            },
            
            messages: {
                fileLoaded: "¡Fitxer GPX carregat amb èxit!",
                fileError: "Error en carregar el fitxer GPX. Si us plau intenta-ho de nou.",
                noTrackPoints: "No s'han trobat punts de ruta al fitxer GPX.",
                exportStarted: "Iniciant exportació de vídeo...",
                exportComplete: "¡Exportació de vídeo completada!",
                annotationAdded: "Anotació del camí afegida",
                pictureAnnotationAdded: "Anotació d'imatge afegida",
                iconChangeAdded: "Canvi d'icona afegit",
                clickMapToAnnotate: "Fes clic al mapa per afegir una anotació",
                clickMapForIconChange: "Fes clic al mapa per afegir un canvi d'icona",
                noTrackForExport: "No hi ha cap ruta carregada. Carrega un fitxer GPX abans d'exportar.",
                mediaDeviceNotSupported: "La gravació de vídeo no és compatible amb el teu navegador.",
                mapNotReady: "El mapa no està llest per exportar el vídeo.",
                exportVideoPrepare: "Preparant l'exportació del vídeo. Si us plau espera...",
                exportVideoRecording: "Gravando animació... Si us plau espera fins que acabi.",
                exportError: "Error durant l'exportació del vídeo",
                urlProcessingError: "No s'ha pogut processar l'URL",
                validUrlsFrom: "Assegura't que utilitzes una URL vàlida de:",

                // Video export confirmation dialog
                exportVideoTitle: "Exportar Vídeo d'Animació de Ruta",
                exportVideoWhatHappens: "Això és el que passarà durant l'exportació:",
                exportVideoStep1: "La interfície de la pàgina s'amagarà temporalment per a una gravació neta",
                exportVideoStep2: "El teu zoom actual i orientació de càmera es preservaran",
                exportVideoStep3: "La teva animació de ruta es reproduirà automàticament de principi a fi",
                exportVideoStep4: "L'animació es gravarà com a un fitxer de vídeo d'alta qualitat",
                exportVideoStep5: "Quan acabi, el vídeo es descarregarà automàticament",
                exportVideoImportant: "Important:",
                exportVideoStayActive: "Mantén aquesta pestanya del navegador activa durant la gravació per a millors resultats. El procés típicament pren 30-90 segons.",
                exportVideoQuality: "Qualitat del Vídeo:",
                exportVideoQualityDesc: "Format WebM de 30 FPS amb el teu zoom actual i configuració de càmera preservada",
                exportVideoStart: "🎬 Començar Gravació",
                exportVideoKeepTabActive: "Mantén aquesta pestanya del navegador activa",
                exportVideoCloseOtherApps: "Tanca altres aplicacions pesades",
                exportVideoLetComplete: "Deixa que el procés acabi sense interrupcions",
                
                multipleTracksLoaded: "Múltiples tracks carregats! Desplaça't cap avall al Constructor de Viatges per organitzar-los i afegir transport entre tracks.",
                errorProcessingFiles: "Error processant fitxers:",
                processingFiles: "Processant fitxers...",

                // 3D Terrain messages
                terrain3dEnabledDefault: "¡Terreny 3D activat per defecte! El mapa té una lleugera inclinació 3D amb dades d'elevació.",
                terrain3dEnabled: "¡Terreny 3D activat! El mapa ara té una lleugera inclinació 3D amb dades d'elevació.",
                terrain3dNotSupported: "El terreny 3D no és compatible amb el teu navegador/dispositiu",
                terrain3dDisabled: "Terreny 3D desactivat",
                elevationDataOpenTopo: "Utilitzant dades d'elevació OpenTopography (subtil)",
                elevationDataMapzen: "Utilitzant dades d'elevació Mapzen (per defecte)",
                elevationDataChanged: "Canviat a dades d'elevació {source}",

                // File processing messages
                notGpxFile: "no és un fitxer GPX",
                errorProcessingFile: "Error processant",
                filesLoadedSuccessfully: "fitxer(s) GPX carregat(s) amb èxit!",
                canvasStreamNotSupported: "El navegador no suporta canvas.captureStream()",
                
                // Journey Builder messages
                invalidTrackData: "Dades de ruta invàlides rebudes",
                trackAddedAutoPreview: "¡Ruta afegida! El viatge es previsualitzarà automàticament.",
                trackAddedUpdating: "¡Ruta afegida! Actualitzant viatge...",
                errorUpdatingSegmentTiming: "Error actualitzant temps del segment",
                openingMapPreview: "Obrint vista prèvia del mapa per habilitar dibuix de ruta...",
                clickMapToDraw: "Fes clic al mapa per dibuixar el teu {mode}. Prem Escape o fes clic a \"Finalitzar Ruta\" quan acabis.",
                routeDrawingCancelled: "Dibuix de ruta cancel·lat",
                routeMustHaveTwoPoints: "La ruta ha de tenir almenys 2 punts",
                routeCompleted: "¡{mode} completat en {time} segons!",
                noJourneyToPreview: "No hi ha viatge per previsualitzar. Afegeix rutes i transport.",
                selectNewTransportMode: "Selecciona un nou mode de transport",
                transportationRemoved: "Transport eliminat",
                errorParsingFile: "Error analitzant",
                additionalTracksAdded: "ruta(es) addicional(s) afegida(es)!",
                errorAddingTracks: "Error afegint rutes",
                segmentTotalTime: "Segmento: {segmentTime}s | Total: {totalTime}s",
                
                // Map and journey messages
                mapNotReadyForRouteDrawing: "Mapa no llest per dibuix de ruta",
                journeyUpdatedNewOrder: "Viatge actualitzat amb nou ordre de segments",
                errorUpdatingJourney: "Error actualitzant viatge",
                journeyPreviewLoaded: "¡Vista prèvia del viatge carregada!",
                errorLoadingJourneyData: "Error carregant dades del viatge",

                // Input placeholders
                annotationTitlePlaceholder: "Títol de l'anotació...",
                annotationDescriptionPlaceholder: "Descripció (opcional)...",
                journeyAnimationTiming: "Cronologia d'Animació del Viatge",
                timingTracks: "Rutes:",
                timingTransportation: "Transport:",
                timingNote: "💡 Ajusta els temps dels segments individuals al Constructor de Viatges amunt",
                gpxOnlyStatsEnabled: "Distàncies de transfers excloses d'estadístiques",
                gpxOnlyStatsDisabled: "Totes les distàncies incloses en estadístiques",
                iconChangeMoved: "¡Marcador de canvi d'icona mogut!",
                annotationMoved: "¡Marcador de nota mogut!"
            },
            
            journey: {
                title: "Constructor de Viatges",
                tracks: "Rutes i Imatges Pujades",
                segments: "Segments del Viatge",
                autoUpdating: "Actualitzant viatge automàticament...",
                journeyUpdated: "¡Viatge actualitzat!",
                noTracks: "Puja fitxers GPX per començar a construir el teu viatge",
                addTransportation: "Afegir transport entre rutes",
                clearAll: "🗑️ Netejar Tot",
                autoPreview: "Actualitzant viatge automàticament...",

                // Transportation modes
                transportCar: "🚗 Cotxe",
                transportBoat: "⛵ Barco",
                transportPlane: "✈️ Avió",
                transportTrain: "🚂 Tren",
                transportWalk: "🚶‍♂️ Caminar"
            },
            
            // Footer elements
            footer: {
                copyright: "TrailReplay - Narració de camins de codi obert",
                techStack: "Construït amb MapLibre GL JS, Three.js, dades d'elevació i molts projectes open source increïbles.",
                acknowledgments: "Veure tots els agraïments",
                github: "Veure a GitHub",
                instagram: "Seguir a Instagram",
                coffee: "Convida'm a un cafè"
            },
            
            // Feedback
            feedback: {
                link: "Comentaris",
                title: "Enviar Comentaris",
                name: "El teu nom",
                email: "Email (opcional)",
                message: "El teu missatge",
                send: "Enviar",
                sending: "Enviant...",
                success: "¡Gràcies pels teus comentaris!",
                error: "Alguna cosa ha sortit malament. Intenta-ho de nou més tard.",
                validation: {
                    messageShort: "Missatge massa curt"
                },
                solicitation: {
                    title: "Gaudeixes de TrailReplay?",
                    message: "Et faria res donar-nos alguns comentaris sobre com millorar-ho encara més?",
                    yes: "Sí, m'encantaria ajudar!",
                    no: "Potser més tard",
                    dontShowAgain: "No mostrar de nou"
                }
            },
            
            // Modal buttons
            buttons: {
                save: "Guardar",
                cancel: "Cancel·lar",
                close: "Tancar",
                choose: "Triar",
                chooseIcon: "Triar Icona",
                delete: "Eliminar"
            },

            // Status messages
            status: {
                cancel: "✖️ Cancel·lar",
                autoUpdatingJourney: "Actualitzant viatge automàticament...",
                journeyUpdated: "¡Viatge actualitzat!"
            },
            
            // Journey Builder UI
            journeyBuilder: {
                addMoreTracks: "Afegir Més Rutes",
                clickToUploadAdditionalGPXFiles: "Fes clic per pujar fitxers GPX i imatges addicionals",
                moveUp: "Moure Amunt",
                moveDown: "Moure Avall",
                remove: "Eliminar",
                journeyTiming: "📊 Temps del Viatge",
                tracks: "Rutes",
                transportation: "Transport",
                animationTime: "Temps d'Animació",
                seconds: "segons",
                edit: "Editar",
                addTransport: "Afegir Transport",
                chooseHowToTravelBetweenTracks: "Tria com viatjar entre rutes",
                journeyTimeline: "🎬 Cronologia del Viatge",
                duration: "Durada",
                editTiming: "Editar Temps",
                totalDuration: "Durada Total",
                currentDuration: "Durada Actual",
                useCustomTiming: "Utilitzar Temps Personalitzat",
                resetToDefault: "Restablir per Defecte",
                distance: "Distància",
                transportMode: "Mode de Transport",
                defaultDuration: "Durada per Defecte",
                customDuration: "Durada Personalitzada",
                durationInMinutes: "Durada en minuts",
                leaveEmptyForDefault: "Deixar buit per defecte",
                transportationOptions: "Opcions de Transport",
                routeOptions: "Opcions de Ruta",
                directRoute: "Ruta Directa",
                directRouteDescription: "Connexió en línia recta",
                calculateRoute: "Calcular Ruta",
                calculateRouteDescription: "Utilitzar servei de rutes",
                drawRoute: "Dibuixar Ruta",
                drawRouteDescription: "Dibuixar ruta personalitzada al mapa",
                timing: "Temps",
                editTransport: "Editar Transport",
                drawRouteBtn: "Dibuixar Ruta",
                needTwoTracksForTransport: "Es necessiten almenys 2 rutes per afegir transport",
                mapNotAvailable: "Mapa no disponible per dibuixar rutes",
                transport: {
                    car: "Cotxe",
                    walking: "Caminant",
                    cycling: "Ciclisme",
                    bus: "Autobús",
                    train: "Tren",
                    plane: "Avión",
                    boat: "Barco",
                    walk: "Caminar"
                }
            },
            
            // Exportación de Video
            videoExport: {
                title: "Exportació de Vídeo",
                exportHelp: "Ajuda d'Exportació",
                autoWebM: "Gravació Automàtica (WebM)",
                autoMP4: "Gravació Automàtica (MP4)",
                manualMode: "Gravació Manual de Pantalla",
                webMDescription: "Gravació automàtica amb superposicions renderitzades en canvas. Funciona en tots els navegadors.",
                mp4Description: "Generació avançada de MP4 del costat del client amb renderitzat de canvas. Optimitzat per qualitat i compatibilitat. Detecta automàticament el millor còdec i configuració per al teu dispositiu.",
                manualDescription: "La millor qualitat amb totes les estadístiques i superposicions. Usa el gravador de pantalla del teu sistema per capturar l'àrea ressaltada mentre l'animació es reprodueix.",
                gameBarRecord: "Game Bar → Gravar",
                recordSelectedPortion: "Gravar Porció Seleccionada",
                videoRatio: "Proporció de Vídeo",
                landscape: "16:9 Horitzontal",
                square: "1:1 Quadrat",
                mobile: "9:16 Mòbil",
                autoWebMShort: "Auto (WebM)",
                autoMP4Short: "Auto (MP4)",
                manualModeShort: "Mode Manual",
                
                // Mensajes
                exportInProgress: "Exportació de Vídeo en Progrés",
                initializing: "Inicialitzant...",
                keepTabActive: "Mantén aquesta pestanya del navegador activa",
                closeOtherApps: "Tanca altres aplicacions per al millor rendiment",
                doNotResizeWindow: "No redimensionis ni minimitzis aquesta finestra",
                letComplete: "Deixa que l'exportació es completi sense interrupcions",
                cancelExport: "Cancel·lar Exportació",
                exportCancelled: "Exportació de vídeo cancel·lada per l'usuari",
                noTrackData: "No hi ha dades de ruta disponibles per exportar",
                browserNotSupported: "Gravació de mitjans no compatible amb aquest navegador",
                mapNotReady: "Mapa no llest per exportar",
                exportError: "Error d'exportació: {error}",
                mp4NotSupported: "MP4 no directament compatible, utilitzant format WebM en el seu lloc",
                mp4ExportFailed: "Error en exportació MP4: {error}",
                exportComplete: "¡Exportació completa!",
                mp4ExportSuccess: "Vídeo MP4 exportat amb èxit: {filename} ({size})",
                downloadFailed: "Error en descarregar fitxer MP4",
                manualRecordingActive: "🎥 Gravació manual activa - Prem Escape o Reset per sortir en qualsevol moment",
                manualRecordingFailed: "Error en configuració de gravació manual: {error}",
                cannotResizeWindow: "No es pot redimensionar la finestra durant l'exportació de vídeo",
                warningBeforeClose: "Exportació de vídeo en progrés. Estàs segur que vols sortir?",
                keepWindowVisible: "Mantén aquesta finestra visible per a la millor qualitat d'exportació de vídeo",

                // Diálogo de confirmación
                beforeExporting: "Abans d'exportar",
                ensurePerformance: "Assegura un bon rendiment del sistema",
                closeUnnecessaryApps: "Tanca aplicacions innecessàries",
                keepTabActiveDuringExport: "Mantén aquesta pestanya del navegador activa durant l'exportació",
                doNotResizeWindowConfirm: "No redimensionis ni minimitzis aquesta finestra durant l'exportació",
                cancel: "Cancel·lar",
                startExport: "Iniciar Exportació",
                
                // Diálogo de grabación manual
                manualRecordingInstructions: "Instruccions de Gravació Manual",
                howToRecord: "Com gravar",
                highlightOrange: "L'àrea de gravació es ressaltarà en taronja",
                useSystemRecorder: "Usa el gravador de pantalla del teu sistema per capturar l'àrea ressaltada",
                animationAutoStart: "L'animació iniciarà automàticament amb totes les estadístiques visibles",
                recordUntilComplete: "Grava fins que l'animació es completi",
                escapeToExit: "Prem Escape o Reset per sortir del mode de gravació en qualsevol moment",
                screenRecordingShortcuts: "Atajos de gravació de pantalla",
                useFullscreen: "Usa el mode de pantalla completa per a la millor qualitat",
                ensureGoodPerformance: "Assegura un bon rendiment del sistema",
                startPreparation: "Iniciar Preparació",
                manualRecordingExited: "Mode de gravació manual finalitzat"
            },
            acknowledgments: {
                title: "Agraïments",
                intro: "TrailReplay està orgullosament construït sobre les espatlles de gegants del programari lliure. Agraïm als següents projectes i comunitats:",
                maplibre: "Biblioteca JavaScript de codi obert per a mapes interactius i visualització 3D al navegador. Alimenta tot el renderitzat i animació de mapes a TrailReplay.",
                osm: "Projecte col·laboratiu per crear un mapa lliure i editable del món. Proporciona les dades base de mapes per a TrailReplay.",
                opentopo: "Rajoles topogràfiques obertes basades en dades d'OSM. Utilitzades per a visualització de terreny i activitats a l'aire lliure.",
                ors: "Motor i API de rutes de codi obert basat en OSM. Utilitzat per calcular rutes entre punts.",
                turf: "Anàlisi geoespacial avançada per a JavaScript. Utilitzat per càlculs de distància, geometria i operacions espacials.",
                langBtn: "English",
                back: "← Tornar a TrailReplay"
            }
            ,
            legal: {
                privacy: {
                    title: "Política de Privadesa",
                    updated: "Última actualització: 2025-01-01",
                    intro: "TrailReplay processa els fitxers GPX íntegrament al teu navegador. No s'envien fitxers al servidor tret d'indicació expressa. La connexió amb Strava és opcional i només s'utilitza per importar les teves activitats quan l'autoritzen.",
                    data1: "Fitxers GPX: processats localment al teu navegador; no s'envien per defecte.",
                    data2: "Dades de Strava: en connectar, sol·licitem accés de lectura a les teves activitats per importar rutes. Els tokens es guarden al teu navegador i pots revocar l'accés en qualsevol moment tancant sessió o des del teu compte de Strava.",
                    data3: "Missatges de comentaris: si envies comentaris, processem el contingut del missatge i l'email opcional per respondre.",
                    thirdPartiesTitle: "Tercers",
                    third1: "Strava: utilitzat per a OAuth i importació d'activitats segons el teu consentiment.",
                    third2: "Resend: utilitzat per enviar emails de comentaris.",
                    choicesTitle: "Les Teves Opcions",
                    choice1: "Pots desconnectar Strava en qualsevol moment des de l'app (Tancar sessió) o al teu compte de Strava.",
                    choice2: "Pots enviar comentaris sense proporcionar email; si el proporciones, només s'utilitza per respondre."
                },
                terms: {
                    title: "Termes d'Ús",
                    updated: "Última actualització: 2025-01-01",
                    useTitle: "Ús del Servei",
                    useDesc: "TrailReplay et permet visualitzar dades GPX i crear animacions. Has de ser titular o tenir drets sobre les dades que importis. El servei s'ofereix \"tal qual\", sense garanties.",
                    stravaTitle: "Integració amb Strava",
                    stravaDesc: "En connectar el teu compte de Strava concedeixes accés de lectura a les teves activitats per importar dades GPS. No modifiquem el teu contingut de Strava. Pots revocar l'accés en qualsevol moment.",
                    privacyTitle: "Privadesa",
                    privacyDesc: "Consulta la nostra Política de Privadesa per a més detalls sobre les dades que processem."
                }
            },
            privacy: {
                cookieTitle: "Utilitzem analítiques per millorar la teva experiència",
                cookieMessage: "Utilitzem Google Analytics per entendre com utilitzes TrailReplay i millorar l'aplicació. No es recopilen dades personals.",
                accept: "Acceptar",
                decline: "Rebutjar",
                learnMore: "Més Informació",
                privacyTitle: "Privadesa i Analítiques",
                whatWeCollect: "Què recopilem",
                collect1: "Com utilitzes les funcions de TrailReplay (reproduir, pausar, exportar, etc.)",
                collect2: "Patrons d'ús general i funcions populars",
                collect3: "Informació tècnica com tipus de navegador i mida de pantalla",
                whatWeDontCollect: "Què NO recopilem",
                dontCollect1: "Els teus tracks GPS o dades d'ubicació personal",
                dontCollect2: "Informació personal com noms o emails",
                dontCollect3: "Qualsevol dada que pugui identificar-te personalment",
                whyWeCollect: "Per què recopilem aquestes dades",
                whyCollectText: "Utilitzem aquesta informació per entendre quines funcions són més útils i millorar TrailReplay per a tothom.",
                yourChoice: "La teva elecció",
                yourChoiceText: "Pots rebutjar les analítiques i TrailReplay funcionarà exactament igual. Pots canviar d'opinió en qualsevol moment a la configuració.",
                acceptAnalytics: "Acceptar Analítiques",
                declineAnalytics: "Rebutjar Analítiques"
            }
    }
};

export function setLanguage(lang) {
    if (translations[lang]) {
        const previousLanguage = currentLanguage;
        currentLanguage = lang;
        try {
            localStorage.setItem('trailReplayLang', lang);
        } catch (e) {}
        updatePageTranslations();

        // Track language change (only if it's actually a change)
        if (previousLanguage !== lang) {
            try {
                AnalyticsTracker.trackLanguageChange(lang);
            } catch (e) {
                // Silently fail if analytics not available
            }
        }
    }
}

export function getCurrentLanguage() {
    return currentLanguage;
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

export function updatePageTranslations() {
    // Update text content with data-i18n attributes
    const i18nElements = document.querySelectorAll('[data-i18n]');

    i18nElements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = t(key);
        if (translation) {
            element.innerHTML = translation;
        }
    });

    // Update placeholder attributes with data-i18n-placeholder
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');

    placeholderElements.forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const translation = t(key);
        if (translation) {
            element.placeholder = translation;
        }
    });

    // Update title attributes with data-i18n-title
    const titleElements = document.querySelectorAll('[data-i18n-title]');

    titleElements.forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        const translation = t(key);
        if (translation) {
            element.title = translation;
        }
    });
}

// Make updatePageTranslations available globally
if (typeof window !== 'undefined') {
    window.updatePageTranslations = updatePageTranslations;
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
