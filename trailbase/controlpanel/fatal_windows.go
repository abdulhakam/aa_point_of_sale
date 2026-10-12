//go:build windows

package main

import "golang.org/x/sys/windows"

// errorBox shows a modal error dialog. Used for startup failures in the
// GUI-subsystem binary, where there is no console to print to.
func errorBox(title, msg string) {
	t, err1 := windows.UTF16PtrFromString(title)
	m, err2 := windows.UTF16PtrFromString(msg)
	if err1 != nil || err2 != nil {
		return
	}
	windows.MessageBox(0, m, t, windows.MB_OK|windows.MB_ICONERROR)
}
