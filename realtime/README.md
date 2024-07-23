# Real-time service
Facilitates real-time, bidirectional, event-based communication between frontend clients. 

## Getting started
### Prerequisites

- You have [Go](https://golang.org/) installed.

### Running the service

Clone the repository:

```bash
git clone git@github.com:walagames/sketch-with-friends.git
```

Change to the `realtime` directory:

```bash
cd realtime
```

Run the application:

```bash
go run *.go
```
### Air
Instead of running `go run *.go` every time you make a change, you can use `air` to automatically restart the server when files change.

Install air:
```bash
go install github.com/cosmtrek/air@latest
```
Run the application with hot reloading:
```bash
air
```

## Learn more
- [gorilla/websocket - Chat Example](https://github.com/gorilla/websocket/tree/master/examples/chat): The code in this repository is partially based on this example and can be a good starting point for understanding how to use WebSockets in Go.
- [A Tour of Go - Concurrency](https://go.dev/tour/concurrency/1): Since this application uses goroutines and channels extensively, it's worth taking the time to understand how they work.
- [Go by Example](https://gobyexample.com/): This is a great resource for learning Go. It's not a tutorial, but a collection of examples that illustrate how to use Go features.

