# Network Dependencies

- ioGame C# SDK 21.0.0: `ioGameSdkCsharp.dll` from the official Unity example,
  https://github.com/iohao/ioGameSdkCsharpExampleUnity,
  commit `07a9ece552b67a680d06aa86d786f7c450ae04bd`.
  License: AGPL-3.0-or-later, as declared in its NuGet package.
- Google.Protobuf 3.28.3 and its System.Memory, System.Buffers and
  System.Runtime.CompilerServices.Unsafe dependencies: the matching runtime
  DLLs bundled with the same official example. Protobuf uses BSD-3-Clause;
  the .NET support libraries use MIT.
- UnityWebSocket 2.8.6: https://github.com/psygames/UnityWebSocket,
  commit `369f2a56f68e7a133d3d1acfdc26d4693cd74497`, MIT.
  Local adaptation: `Abort()` is public so session disconnects can cancel
  connections during the handshake as well as pending receives. Editor
  validation can pump the socket events through public `DispatchEvents()`.
  The manager marks itself hidden in edit mode instead of calling the
  play-mode-only DontDestroyOnLoad API.

The SDK's ExternalMessage schema was compared with ioGame 21.25's
external-core jar. All seven wire fields and types match, including sint32
response_status and int32 msg_id. Unity communicates with External using
WebSocket/Protobuf; Bolt remains internal to the Java server cluster.
