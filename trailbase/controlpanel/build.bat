go mod tidy
go build -ldflags="-H=windowsgui -s -w" -o controlpanel.exe