# Devtools

## How devtools work

```
Chrome Extension
│
├── DevTools page / extension context
│     └── DevTools Panel
│           └── ApiClient
│
└── Inspected Page
      │
      ├── Isolated World
      │     └── Content Script
      │
      └── MAIN World
            ├── ApiServer
            └── solid-component-model
```

## The design

The digramm depics communication between panel (a client) and the page's main world (a server). Actors are abstractions, not low-level objects:

```mermaid
sequenceDiagram
  participant Panel
  participant ApiClient
  participant ApiServer
  participant Library

  Panel->>ApiClient: uses
  ApiClient->>ApiServer: Connect
  ApiServer->>Library: get all models
  Library-->>ApiServer: models
  loop For every model
    ApiServer->>ApiClient: register model
  end
  par Upon events
    ApiServer->>ApiClient: register model
  and
    ApiServer->>ApiClient: unregister model
  and
    ApiServer->>ApiClient: model snapshot
  end
  ApiClient->>ApiServer: Disconnect
```

## With Chrome API

The lower-level sequence corresponding to the abstract diagramm above:

```mermaid
sequenceDiagram

  participant Panel
  participant ApiClient
  participant Chrome as Chrome Extension API
  participant Content as Content Script<br/>(ISOLATED World)
  participant ApiServer as ApiServer<br/>(MAIN world)
  participant Library

  Panel->>ApiClient: uses

  ApiClient->>Chrome: connect
  Chrome->>Content: messaging
  Content->>ApiServer: window.postMessage

  ApiServer->>Library: get all models
  Library-->>ApiServer: models

  loop For every model
    ApiServer->>Content: window.postMessage(register)
    Content->>Chrome: messaging
    Chrome->>ApiClient: message
    ApiClient->>Panel: model registered
  end

  par Upon events

    Library->>ApiServer: model registered
    ApiServer->>Content: window.postMessage(register)
    Content->>Chrome: messaging
    Chrome->>ApiClient: message

  and

    Library->>ApiServer: model unregistered
    ApiServer->>Content: window.postMessage(unregister)
    Content->>Chrome: messaging
    Chrome->>ApiClient: message

  and

    Library->>ApiServer: model changed
    ApiServer->>Content: window.postMessage(snapshot)
    Content->>Chrome: messaging
    Chrome->>ApiClient: message

  end

  ApiClient->>Chrome: disconnect
  Chrome->>Content: disconnect
  Content->>ApiServer: window.postMessage(disconnect)
```
