use tauri::{
    menu::{Menu, MenuBuilder, SubmenuBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime, Window, WindowEvent,
};

const MAIN_WINDOW_LABEL: &str = "main";
const TRAY_ICON_ID: &str = "main_tray";
const TRAY_EVENT_NAVIGATE: &str = "tray://navigate";
const TRAY_MENU_ID_SHOW_WINDOW: &str = "show_window";
const TRAY_MENU_ID_OPEN_DRIVE: &str = "open_drive";
const TRAY_MENU_ID_OPEN_STARRED: &str = "open_starred";
const TRAY_MENU_ID_OPEN_RECENT: &str = "open_recent";
const TRAY_MENU_ID_OPEN_TRASH: &str = "open_trash";
const TRAY_MENU_ID_OPEN_SETTINGS: &str = "open_settings";
const TRAY_MENU_ID_QUIT_APP: &str = "quit_app";
const ROUTE_DRIVE: &str = "/drive";
const ROUTE_STARRED: &str = "/drive/starred";
const ROUTE_RECENT: &str = "/drive/recent";
const ROUTE_TRASH: &str = "/drive/trash";
const ROUTE_SETTINGS: &str = "/settings";

#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct TrayNavigatePayload {
    route: String,
}

fn build_tray_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let quick_access_menu = SubmenuBuilder::new(app, "Quick Access")
        .text(TRAY_MENU_ID_OPEN_DRIVE, "My Drive")
        .text(TRAY_MENU_ID_OPEN_STARRED, "Starred")
        .text(TRAY_MENU_ID_OPEN_RECENT, "Recent")
        .text(TRAY_MENU_ID_OPEN_TRASH, "Trash")
        .text(TRAY_MENU_ID_OPEN_SETTINGS, "Settings")
        .build()?;

    MenuBuilder::new(app)
        .text(TRAY_MENU_ID_SHOW_WINDOW, "Open Window")
        .separator()
        .item(&quick_access_menu)
        .separator()
        .text(TRAY_MENU_ID_QUIT_APP, "Quit SDKWork Drive")
        .build()
}

pub fn show_main_window<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return Ok(());
    };

    let _ = window.unminimize();
    window.show()?;
    window.set_focus()?;
    Ok(())
}

fn request_explicit_quit<R: Runtime>(app: AppHandle<R>) {
    if let Some(shutdown_intent) = app.try_state::<crate::state::ShutdownIntent>() {
        shutdown_intent.request();
    }

    app.exit(0);
}

fn open_route_from_tray<R: Runtime>(app: &AppHandle<R>, route: &str) -> tauri::Result<()> {
    show_main_window(app)?;

    let payload = TrayNavigatePayload {
        route: route.to_string(),
    };
    app.emit(TRAY_EVENT_NAVIGATE, &payload)?;

    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let route_literal = format!("\"{route}\"");
        let script = format!(
            "window.__SDKWORK_DRIVE_PENDING_TRAY_ROUTE__ = {route}; window.dispatchEvent(new CustomEvent('sdkwork-drive:tray-navigate', {{ detail: {{ route: {route} }} }}));",
            route = route_literal
        );
        window.eval(script.as_str())?;
    }

    Ok(())
}

fn handle_tray_menu_event<R: Runtime>(app: &AppHandle<R>, menu_id: &str) {
    match menu_id {
        TRAY_MENU_ID_SHOW_WINDOW => {
            let _ = show_main_window(app);
        }
        TRAY_MENU_ID_OPEN_DRIVE => {
            let _ = open_route_from_tray(app, ROUTE_DRIVE);
        }
        TRAY_MENU_ID_OPEN_STARRED => {
            let _ = open_route_from_tray(app, ROUTE_STARRED);
        }
        TRAY_MENU_ID_OPEN_RECENT => {
            let _ = open_route_from_tray(app, ROUTE_RECENT);
        }
        TRAY_MENU_ID_OPEN_TRASH => {
            let _ = open_route_from_tray(app, ROUTE_TRASH);
        }
        TRAY_MENU_ID_OPEN_SETTINGS => {
            let _ = open_route_from_tray(app, ROUTE_SETTINGS);
        }
        TRAY_MENU_ID_QUIT_APP => request_explicit_quit(app.clone()),
        _ => {}
    }
}

fn handle_tray_icon_event<R: Runtime>(app: &AppHandle<R>, event: TrayIconEvent) {
    if matches!(
        event,
        TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        }
    ) {
        let _ = show_main_window(app);
    }
}

pub fn setup<R: Runtime>(app: &mut tauri::App<R>) -> tauri::Result<()> {
    let Some(icon) = app.default_window_icon().cloned() else {
        return Ok(());
    };
    let app_handle = app.handle().clone();
    let menu = build_tray_menu(&app_handle)?;

    TrayIconBuilder::with_id(TRAY_ICON_ID)
        .icon(icon)
        .tooltip(app.package_info().name.clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| handle_tray_menu_event(app, event.id().as_ref()))
        .on_tray_icon_event(|tray, event| handle_tray_icon_event(tray.app_handle(), event))
        .build(app)?;

    Ok(())
}

pub fn handle_window_event<R: Runtime>(window: &Window<R>, event: &WindowEvent) {
    if window.label() != MAIN_WINDOW_LABEL {
        return;
    }

    if let WindowEvent::CloseRequested { api, .. } = event {
        let app = window.app_handle();
        let Some(shutdown_intent) = app.try_state::<crate::state::ShutdownIntent>() else {
            return;
        };

        if !shutdown_intent.is_requested() {
            api.prevent_close();
            let _ = window.hide();
        }
    }
}
