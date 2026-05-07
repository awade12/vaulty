// Native drag-out support: drag a remote object out of Vaulty into Finder
// (or any other app that accepts file drops).
//
// macOS:
//   We download the object to a per-session temp directory and then ask the
//   active NSWindow to start a dragging session anchored on the active mouse
//   event. This works because the mouse is still pressed when the JS layer
//   calls `start_drag_export`, so `[NSApp currentEvent]` returns a usable
//   mouseDragged/mouseDown event.
//
// Windows/Linux:
//   Tauri 2 doesn't yet expose a webview→OS drag API, and the platform glue
//   for IDataObject (Windows) and GTK drag sources (Linux) is non-trivial.
//   We fall back to revealing the downloaded file in the OS file manager so
//   the user can finish the drag manually.
//
// Either way the file is dropped into a temp directory under the system
// temp root, so it does not pollute the user's Downloads folder.

use std::path::PathBuf;
use std::sync::OnceLock;

use tauri::{AppHandle, Manager, State};
use tokio::fs;

use crate::error::AppError;
use crate::s3::operations;
use crate::state::AppState;

/// Cache the per-process drag temp dir so repeated drags reuse the same
/// folder and we don't litter `$TMPDIR` with one-off staging dirs.
static DRAG_TEMP_DIR: OnceLock<PathBuf> = OnceLock::new();

fn drag_temp_root() -> PathBuf {
    DRAG_TEMP_DIR
        .get_or_init(|| {
            let mut p = std::env::temp_dir();
            p.push("vaulty-drag");
            let _ = std::fs::create_dir_all(&p);
            p
        })
        .clone()
}

fn basename_from_key(key: &str) -> String {
    let trimmed = key.trim_end_matches('/');
    let after_slash = trimmed.rsplit('/').next().unwrap_or(trimmed);
    if after_slash.is_empty() {
        "vaulty-export".to_string()
    } else {
        after_slash.to_string()
    }
}

/// Result of `start_drag_export`. The JS caller uses `revealedOnly` to know
/// whether a native drag was actually started or whether the OS only
/// revealed the file in its file manager.
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DragExportResult {
    pub path: String,
    pub revealed_only: bool,
}

#[tauri::command]
pub async fn start_drag_export(
    app: AppHandle,
    key: String,
    state: State<'_, AppState>,
) -> Result<DragExportResult, String> {
    if key.trim().is_empty() || key.ends_with('/') {
        return Err(AppError::InvalidKey("Drag-out requires a file key".into()).into_string());
    }
    let client = state.client().await.map_err(AppError::into_string)?;
    let bucket = state.active_bucket().await;
    if bucket.is_empty() {
        return Err(AppError::NoActiveConnection.into_string());
    }

    let _permit = state
        .acquire_transfer_permit()
        .await
        .map_err(AppError::into_string)?;

    let basename = basename_from_key(&key);
    let mut dest = drag_temp_root();
    // One subdir per object so concurrent drags of files with the same name
    // don't trample each other.
    dest.push(format!("{:x}", uuid::Uuid::new_v4().as_u128()));
    fs::create_dir_all(&dest)
        .await
        .map_err(|e| AppError::Io(e).into_string())?;
    dest.push(&basename);

    operations::get_object_to_file(&client, &bucket, &key, &dest, &app)
        .await
        .map_err(AppError::into_string)?;

    let path_str = dest.to_string_lossy().to_string();

    // macOS: try to start the native drag. If we can't (no active mouse
    // event, drop the user release click, etc.), fall through to reveal.
    #[cfg(target_os = "macos")]
    {
        if let Some(window) = app.get_webview_window("main") {
            if let Ok(()) = macos_drag::start_drag(&window, &dest) {
                return Ok(DragExportResult {
                    path: path_str,
                    revealed_only: false,
                });
            }
        }
    }

    // Fallback: reveal the file in the platform file manager so the user can
    // drag from there manually.
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg("-R").arg(&dest).spawn();
    }
    #[cfg(target_os = "windows")]
    {
        let arg = format!("/select,{}", dest.display());
        let _ = std::process::Command::new("explorer").arg(arg).spawn();
    }
    #[cfg(target_os = "linux")]
    {
        if let Some(parent) = dest.parent() {
            let _ = std::process::Command::new("xdg-open").arg(parent).spawn();
        }
    }

    Ok(DragExportResult {
        path: path_str,
        revealed_only: true,
    })
}

#[cfg(target_os = "macos")]
mod macos_drag {
    use std::path::Path;
    use std::sync::Once;

    use cocoa::appkit::{NSApp, NSEventType};
    use cocoa::base::{id, nil};
    use cocoa::foundation::{NSArray, NSPoint, NSRect, NSSize, NSString};
    use objc::{class, msg_send, runtime::Object, sel, sel_impl};
    use tauri::WebviewWindow;

    /// Anything went wrong while starting the native drag. The caller should
    /// fall back to reveal-in-Finder behaviour.
    #[derive(Debug)]
    pub struct DragError;

    impl From<std::io::Error> for DragError {
        fn from(_: std::io::Error) -> Self {
            DragError
        }
    }

    static REGISTER_DUMMY_SOURCE: Once = Once::new();

    /// Build (or fetch) a dummy NSObject class that conforms to
    /// NSDraggingSource. We don't need any custom drag operations — returning
    /// `NSDragOperationCopy` from `draggingSession:sourceOperationMaskForDraggingContext:`
    /// is enough to make Finder accept the drop.
    fn dummy_drag_source() -> id {
        REGISTER_DUMMY_SOURCE.call_once(|| {
            unsafe {
                use objc::declare::ClassDecl;
                use objc::runtime::{Class, Sel};

                let superclass = class!(NSObject);
                let mut decl = ClassDecl::new("VaultyDragSource", superclass)
                    .expect("VaultyDragSource already registered");

                extern "C" fn source_operation_mask(
                    _this: &Object,
                    _cmd: Sel,
                    _session: id,
                    _context: u64,
                ) -> u64 {
                    // NSDragOperationCopy = 1
                    1
                }

                decl.add_method(
                    sel!(draggingSession:sourceOperationMaskForDraggingContext:),
                    source_operation_mask
                        as extern "C" fn(&Object, Sel, id, u64) -> u64,
                );

                decl.register();
                let _ = Class::get("VaultyDragSource");
            }
        });
        unsafe {
            let cls = class!(VaultyDragSource);
            let obj: id = msg_send![cls, alloc];
            let obj: id = msg_send![obj, init];
            obj
        }
    }

    pub fn start_drag(window: &WebviewWindow, file_path: &Path) -> Result<(), DragError> {
        let ns_window = window.ns_window().map_err(|_| DragError)? as id;
        if ns_window.is_null() {
            return Err(DragError);
        }

        unsafe {
            // We need an active mouse event. macOS keeps the mouseDown event
            // alive for as long as the button is held, which is exactly the
            // window during which JS dispatched this command.
            let event: id = msg_send![NSApp(), currentEvent];
            if event == nil {
                return Err(DragError);
            }
            let etype: NSEventType = msg_send![event, type];
            // 1 = NSEventTypeLeftMouseDown, 5/6 = mouse dragged variants.
            let etype_raw = etype as u64;
            if !matches!(etype_raw, 1 | 5 | 6 | 11) {
                return Err(DragError);
            }

            // Build NSURL pointing at the file we just downloaded.
            let path_str = file_path.to_string_lossy();
            let ns_path = NSString::alloc(nil).init_str(&path_str);
            let file_url: id = msg_send![class!(NSURL), fileURLWithPath: ns_path];
            if file_url == nil {
                return Err(DragError);
            }

            // Create an NSDraggingItem whose pasteboard writer is the file URL.
            let item_alloc: id = msg_send![class!(NSDraggingItem), alloc];
            let item: id = msg_send![item_alloc, initWithPasteboardWriter: file_url];
            if item == nil {
                return Err(DragError);
            }
            let _: () = msg_send![item, autorelease];

            // Place the drag image at the cursor location with the file's icon.
            let workspace: id =
                msg_send![class!(NSWorkspace), sharedWorkspace];
            let icon: id = msg_send![workspace, iconForFile: ns_path];
            let icon_size = NSSize::new(64.0, 64.0);
            if icon != nil {
                let _: () = msg_send![icon, setSize: icon_size];
            }

            let mouse_loc_in_window: NSPoint = msg_send![event, locationInWindow];
            let drag_origin = NSPoint::new(
                mouse_loc_in_window.x - icon_size.width / 2.0,
                mouse_loc_in_window.y - icon_size.height / 2.0,
            );
            let frame = NSRect::new(drag_origin, icon_size);
            let _: () = msg_send![item, setDraggingFrame: frame contents: icon];

            // beginDraggingSessionWithItems:event:source: lives on NSView, so
            // grab the window's contentView.
            let content_view: id = msg_send![ns_window, contentView];
            if content_view == nil {
                return Err(DragError);
            }

            let items = NSArray::arrayWithObject(nil, item);
            let source = dummy_drag_source();
            let _: () = msg_send![source, autorelease];

            let session: id = msg_send![
                content_view,
                beginDraggingSessionWithItems: items
                event: event
                source: source
            ];
            if session == nil {
                return Err(DragError);
            }
            // Slide back if the drop is rejected — feels more native.
            let yes_bool: i8 = 1;
            let _: () = msg_send![
                session,
                setAnimatesToStartingPositionsOnCancelOrFail: yes_bool
            ];
            // 0 = NSDraggingFormationDefault — keeps the icon at the cursor.
            let _: () = msg_send![session, setDraggingFormation: 0i64];
        }
        Ok(())
    }
}
