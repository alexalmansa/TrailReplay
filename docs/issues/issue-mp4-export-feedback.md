Title: Video export UX regressions (MP4/WebM/manual stats)

Reported feedback (Windows 10, Firefox 147 UA):
- MP4 recording fails with brief red error toasts; user can’t read them.
- WebM recording is jittery / unusable.
- MP4 used to inject logo, then external conversion to WebM.
- Start screen (country overview) should linger ~3 seconds before animation.
- Manual recording instructions modal has no visible cancel/continue buttons.
- Stats overlay is unreadable (white); should use track color.

Expected:
- MP4: warn on unsupported browsers (Firefox) and provide clearer errors.
- WebM: smoother capture via speed control and/or higher FPS.
- Pre-roll on exports to keep start view visible.
- Manual modal footer always visible on small screens.
- Stats text uses track color with sufficient contrast.
