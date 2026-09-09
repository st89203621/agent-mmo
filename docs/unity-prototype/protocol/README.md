# Unity Protocol Export

The schema in `lunhui.proto` is exported from the compiled Java messages using
the server's own jprotobuf 2.4.23 metadata. Field numbers are not maintained by
hand. `protoc` 28.3 generates the matching Google.Protobuf 3.28.3 C# messages in
`unity-client/Assets/_Game/Runtime/Network/Generated/Lunhui.cs`.

`ServerRoutes.cs` is generated from Java `@ActionController` / `@ActionMethod`
annotations using ioGame `CmdInfo`. The export currently contains 99 message
types and 167 action routes.

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File tools/Export-UnityProtocol.ps1
```

The script accepts `-MavenPath`, `-JavaBin`, `-ProtocPath` and `-SkipBuild`.
Java 21, Maven and protoc 28.3 are required. The Windows protoc binary is
available from
`https://repo.maven.apache.org/maven2/com/google/protobuf/protoc/4.28.3/protoc-4.28.3-windows-x86_64.exe`.
The default local path is `one-application/target/protoc-28.3.exe`.

The existing `TestGenerate --unity` entry point also runs ioGame's
`CsharpDocumentGenerate` and writes its complete route wrappers, broadcast
listener and error definitions to `target/unity-protocol/routes`. These wrappers
are reference output; only supported message types and route constants are
compiled into Unity.

| Operation | Route | Request | Response |
| --- | --- | --- | --- |
| Login | 1 / 1 | LoginVerify | UserInfo |
| Register | 1 / 3 | RegisterRequest | RegisterResponse |
| Character | 2 / 1 | None | PersonMessage |
| Initialize character | 2 / 2 | None | No response |
| Enter map | 3 / 1 | EnterMapReq | EnterMapMessage |
| Move | 3 / 2 | LocationMessage | Room broadcast |

Registration does not authenticate the connection. Send a normal username and
password login after registration. The existing numeric JWT demo path is not
used by Unity. Character lookup initializes missing character data on the
server before returning the profile.

The running backend uses `ws://HOST:10100/websocket`, TCP port 10101 and Broker
port 10200. The old 9200 / 9300 documentation does not match its default config.

Several newer Java DTOs have no Protobuf annotations, which ioGame reports
during route export: `ZoneInfoProto`, `MoveZoneReq`, `NearbyPlayerProto`,
`TreasureMountainMessage`, and the auction DTOs. They are not silently assigned
new wire contracts. These interfaces need server contract fixes before native
clients can use them. The existing map entry and movement messages are valid.

Credential logging changes require a backend restart to take effect. Exporting
the protocol itself does not start, stop or modify the running game server.
