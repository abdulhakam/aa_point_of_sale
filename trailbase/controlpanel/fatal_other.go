//go:build !windows

package main

// errorBox is a no-op off Windows; fatal already wrote the message to stderr.
func errorBox(_, _ string) {}
